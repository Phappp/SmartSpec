// src/features/database/domain/service.ts

import SequenceDiagramSchema from "../../../../../../internal/model/sequence_diagram";
import { SequenceDiagramGeminiService } from "./GeminiService";
import {
  GenerateSequenceDiagramPayload,
  SequenceDiagramResponse,
  SequenceDiagramService, // Giữ lại interface của bạn
} from "../types";
import { UserServiceImpl } from "../../../user/domain/service"; // Import service của bạn
import Project from "../../../../../../internal/model/project";
import Version from "../../../../../../internal/model/version";
import SequenceDiagram from "../../../../../../internal/model/sequence_diagram";
import { VersionService } from "../../../version/domain/service";
import { LogService } from "../../../log/domain/service";
import User from "../../../../../../internal/model/user";
import { umlSocketService } from "../../domain/uml.socket.service";
export class SequenceDiagramServiceImpl implements SequenceDiagramService {
  private geminiService: SequenceDiagramGeminiService;
  private versionService = new VersionService();
  private logService = new LogService();

  constructor() {
    this.geminiService = new SequenceDiagramGeminiService();
  }

  public async generateSchemaFromRequirements(
    payload: GenerateSequenceDiagramPayload,
    userId: string
  ): Promise<SequenceDiagramResponse> {
    // <-- THAY ĐỔI: Phải dùng tên mới "useCaseContext" từ payload
    const { versionId, projectId, usecaseId, useCaseContext, language } = payload;

    try {
    // --- Phần xác thực (Validation) ---
    const user = await new UserServiceImpl().getUserById(userId);
    if (!user) {
        const errorMsg = "User not found";
        if (umlSocketService && projectId && versionId && userId) {
          umlSocketService.emitProgress(projectId, versionId, userId, 'sequence', 100, 'failed', false, [errorMsg]);
        }
        throw new Error(errorMsg);
    }
    const version = await Version.findById(versionId);
    if (!version) {
        const errorMsg = "Version not found";
        if (umlSocketService && projectId && versionId && userId) {
          umlSocketService.emitProgress(projectId, versionId, userId, 'sequence', 100, 'failed', false, [errorMsg]);
        }
        throw new Error(errorMsg);
    }
    const project = await Project.findById(projectId);
    if (!project) {
        const errorMsg = "Project not found";
        if (umlSocketService && projectId && versionId && userId) {
          umlSocketService.emitProgress(projectId, versionId, userId, 'sequence', 100, 'failed', false, [errorMsg]);
        }
        throw new Error(errorMsg);
    }

    // --- THAY ĐỔI: Logic xác thực usecase ---
    // (Giờ chúng ta nhận object 'useCaseContext' trực tiếp, không cần mảng 'requirements' nữa)
    if (!useCaseContext || typeof useCaseContext !== "object") {
        const errorMsg = "A valid useCaseContext object is required.";
        if (umlSocketService && projectId && versionId && userId) {
          umlSocketService.emitProgress(projectId, versionId, userId, 'sequence', 100, 'failed', false, [errorMsg]);
        }
        throw new Error(errorMsg);
      }
    // Kiểm tra xem usecase có 'tasks' không (GeminiService sẽ làm, nhưng check ở đây tốt hơn)
    if (!useCaseContext.tasks || useCaseContext.tasks.length === 0) {
        const errorMsg = "This Usecase has no steps (tasks) defined to generate a sequence diagram.";
        if (umlSocketService && projectId && versionId && userId) {
          umlSocketService.emitProgress(projectId, versionId, userId, 'sequence', 100, 'failed', false, [errorMsg]);
        }
        throw new Error(errorMsg);
    }
    // --- Kết thúc Thay đổi ---

      // Emit start event
      if (umlSocketService && projectId && versionId && userId) {
        umlSocketService.emitProgress(projectId, versionId, userId, 'sequence', 10, 'generating', true);
      }

    // 1. Gọi Gemini Service
    // (Payload giờ đã đúng 100% với những gì GeminiService mong đợi)
    const geminiDiagramData = await this.geminiService.generateSequenceDiagram(
      {
        versionId,
        projectId,
        usecaseId,
        useCaseContext: useCaseContext, // <-- Đã đúng
        language,
      },
      language
    );

    // 2. Validate kết quả (Giữ nguyên)
    if (
      !geminiDiagramData ||
      !geminiDiagramData.name ||
      geminiDiagramData.name === "Generation Failed" ||
      !geminiDiagramData.lifelines ||
      !geminiDiagramData.messages
    ) {
        const errorMsg = "Failed to generate complete diagram data from Gemini. The response was invalid or empty.";
        if (umlSocketService && projectId && versionId && userId) {
          umlSocketService.emitProgress(projectId, versionId, userId, 'sequence', 100, 'failed', false, [errorMsg]);
        }
        throw new Error(errorMsg);
    }

    // 3. Lưu vào DB (Giữ nguyên)
    const newSequenceDiagram = new SequenceDiagramSchema({
      project_id: projectId,
      version_id: versionId,
      usecase_ref_id: usecaseId,
      name: geminiDiagramData.name,
      description: geminiDiagramData.description || "",
      lifelines: geminiDiagramData.lifelines,
      messages: geminiDiagramData.messages,
      fragments: geminiDiagramData.fragments || [],
      layout_data: geminiDiagramData.layout_data || { nodes: [], edges: [] },
      created_by: user.id,
      related_requirements: [],
    });

    const savedDocument = await newSequenceDiagram.save();

    // ✅ Tạo preview change cho sequence diagram mới
    if (userId && versionId) {
      await this.versionService.createOrUpdatePreview(
        versionId,
        userId,
        {
          entity_type: "sequence_diagram",
          entity_id: savedDocument._id.toString(),
          change_type: "added",
          before_snapshot: null,
          after_snapshot: savedDocument.toObject()
        }
      );
    }

    // ✅ Ghi log cho generate sequence diagram
    try {
      const user = await User.findById(userId).lean();
      const username = user?.name || "Unknown User";
      await this.logService.createLog({
        project_id: projectId,
        user_id: userId,
        action: "generate_output",
        target_id: savedDocument._id.toString(),
        target_type: "sequence_diagrams",
        version_number: version.version_number,
        affects_requirement: true,
        level: "info",
        performed_by_ai: true,
        details: {
          after: { name: savedDocument.name, usecase_ref_id: usecaseId },
          message: `${username} generated sequence diagram "${savedDocument.name}" from usecase`
        }
      });
    } catch (logError) {
      console.error("❌ Error logging sequence diagram generation:", logError);
    }

      // Emit completion event
      if (umlSocketService && projectId && versionId && userId) {
        umlSocketService.emitProgress(projectId, versionId, userId, 'sequence', 100, 'completed', false);
      }

    return savedDocument.toObject({ getters: true }) as SequenceDiagramResponse;
    } catch (error: any) {
      console.error('❌ Error generating sequence diagram:', error);
      // Emit failed event với error message
      if (umlSocketService && projectId && versionId && userId) {
        const errorMsg = error.message || 'Failed to generate sequence diagram';
        umlSocketService.emitProgress(projectId, versionId, userId, 'sequence', 100, 'failed', false, [errorMsg]);
      }
      throw error; // Re-throw để controller xử lý
    }
  }
  public async getSequenceDiagrams(versionId: string): Promise<SequenceDiagramResponse[]> {
    try {
      const diagrams = await SequenceDiagramSchema.find({ version_id: versionId })
        .populate('created_by', 'name email')
        .lean();

      // Convert Mongoose documents to SequenceDiagramResponse
      return diagrams.map(diagram => this.mapToSequenceDiagramResponse(diagram));
    } catch (error) {
      console.error('Error getting sequence diagrams:', error);
      throw new Error('Failed to fetch sequence diagrams');
    }
  }

  public async getSequenceDiagramById(ucId: string): Promise<SequenceDiagramResponse> {
    try {
      const diagram = await SequenceDiagramSchema.findById(ucId)
        .populate('created_by', 'name email')
        .lean();

      if (!diagram) {
        throw new Error('Sequence diagram not found');
      }

      return this.mapToSequenceDiagramResponse(diagram);
    } catch (error) {
      console.error('Error getting sequence diagram by id:', error);
      throw new Error('Failed to fetch sequence diagram');
    }
  }

  public async getSequenceDiagramsByUsecaseId(usecaseId: string): Promise<SequenceDiagramResponse[]> {
    try {
      const diagrams = await SequenceDiagramSchema.find({ usecase_ref_id: usecaseId })
        .populate('created_by', 'name email')
        .lean();

      return diagrams.map(diagram => this.mapToSequenceDiagramResponse(diagram));
    } catch (error) {
      console.error('Error getting sequence diagrams by usecase:', error);
      throw new Error('Failed to fetch sequence diagrams for usecase');
    }
  }

  /**
   * Map Mongoose document to SequenceDiagramResponse
   */
  private mapToSequenceDiagramResponse(doc: any): SequenceDiagramResponse {
    return {
      id: doc._id?.toString() || doc.id,
      project_id: doc.project_id?.toString(),
      version_id: doc.version_id?.toString(),
      name: doc.name,
      description: doc.description,
      usecase_ref_id: doc.usecase_ref_id,
      lifelines: doc.lifelines || [],
      messages: doc.messages || [],
      fragments: doc.fragments || [],
      layout_data: doc.layout_data || { nodes: [], edges: [] },
      related_requirements: doc.related_requirements || [],
      created_by: doc.created_by,
      created_at: doc.created_at || doc.createdAt,
      updated_at: doc.updated_at || doc.updatedAt
    } as SequenceDiagramResponse;
  }
  public async deleteSequenceDiagramById(
    sequenceId: string,
    subId: string
  ): Promise<SequenceDiagramResponse> {
    const sequenceDiagram = await SequenceDiagram.findById(sequenceId);
    if (!sequenceDiagram) {
      throw new Error("Sequence Diagram not found.");
    }

    const project = await Project.findById(sequenceDiagram?.project_id);
    if (!project) {
      throw new Error("Associated project not found.");
    }

    const user = project.members.find(
      (member) => member.user_id.toString() === subId
    );
    console.log("User attempting deletion:", user);

    if (!user || user.status !== "accepted") {
      throw new Error("Unauthorized");
    }

    if (!["owner", "editor"].includes(user.role)) {
      throw new Error(
        "Only owner or editor can delete sequence diagrams."
      );
    }

    // Lưu snapshot trước khi xóa
    const beforeSnapshot = sequenceDiagram.toObject();

    await SequenceDiagram.findByIdAndDelete(sequenceId);

    // ✅ Tạo preview change cho sequence diagram đã xóa
    const versionId = sequenceDiagram.version_id?.toString();
    if (versionId && subId) {
      await this.versionService.createOrUpdatePreview(
        versionId,
        subId,
        {
          entity_type: "sequence_diagram",
          entity_id: sequenceId,
          change_type: "deleted",
          before_snapshot: beforeSnapshot,
          after_snapshot: null
        }
      );

      // ✅ Ghi log cho delete sequence diagram
      try {
        const version = await Version.findById(versionId).lean();
        if (version) {
          const user = await User.findById(subId).lean();
          const username = user?.name || "Unknown User";
          await this.logService.createLog({
            project_id: sequenceDiagram.project_id?.toString() || project._id.toString(),
            user_id: subId,
            action: "delete_output",
            target_id: sequenceId,
            target_type: "sequence_diagrams",
            version_number: version.version_number,
            affects_requirement: false,
            level: "warning",
            details: {
              before: beforeSnapshot,
              message: `${username} deleted sequence diagram "${sequenceDiagram.name}"`
            }
          });
        }
      } catch (logError) {
        console.error("❌ Error logging sequence diagram deletion:", logError);
      }
    }

    return sequenceDiagram.toObject({
      getters: true,
    }) as SequenceDiagramResponse;
  }

  public async updateLifelinePosition(
    sqdId: string,
    lifelineId: string,
    position: { x: number; y: number }
  ): Promise<SequenceDiagramResponse> {
    const sequenceDiagram = await SequenceDiagramSchema.findById(sqdId);
    if (!sequenceDiagram) {
      throw new Error("Sequence Diagram not found");
    }

    // Normalize lifelineId để so sánh (handle cả ObjectId và string)
    const normalizedLifelineId = String(lifelineId);
    
    const lifelineIndex = sequenceDiagram.lifelines.findIndex(
      (lifeline: any) => {
        const lifelineIdStr = lifeline._id ? String(lifeline._id) : String(lifeline.id || '');
        return lifelineIdStr === normalizedLifelineId;
      }
    );
    
    if (lifelineIndex === -1) {
      console.error('❌ Lifeline not found:', {
        sqdId,
        lifelineId,
        normalizedLifelineId,
        availableLifelines: sequenceDiagram.lifelines.map((ll: any, idx: number) => ({
          index: idx,
          _id: ll._id ? String(ll._id) : 'no _id',
          id: ll.id || 'no id',
          name: ll.name
        }))
      });
      throw new Error(`Lifeline not found: ${lifelineId}`);
    }

    // ✅ Cập nhật position
    sequenceDiagram.lifelines[lifelineIndex].position = position;
    // ✅ Mark lifelines array as modified để đảm bảo Mongoose lưu thay đổi nested object
    sequenceDiagram.markModified('lifelines');
    await sequenceDiagram.save();

    return this.getSequenceDiagramById(sqdId);
  }
}
