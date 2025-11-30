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
export class SequenceDiagramServiceImpl implements SequenceDiagramService {
  private geminiService: SequenceDiagramGeminiService;
  private versionService = new VersionService();

  constructor() {
    this.geminiService = new SequenceDiagramGeminiService();
  }

  public async generateSchemaFromRequirements(
    payload: GenerateSequenceDiagramPayload,
    userId: string
  ): Promise<SequenceDiagramResponse> {
    // <-- THAY ĐỔI: Phải dùng tên mới "useCaseContext" từ payload
    const { versionId, projectId, usecaseId, useCaseContext, lang } = payload;

    // --- Phần xác thực (Validation) ---
    const user = await new UserServiceImpl().getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const version = await Version.findById(versionId);
    if (!version) {
      throw new Error("Version not found");
    }
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // --- THAY ĐỔI: Logic xác thực usecase ---
    // (Giờ chúng ta nhận object 'useCaseContext' trực tiếp, không cần mảng 'requirements' nữa)
    if (!useCaseContext || typeof useCaseContext !== "object") {
      throw new Error("A valid useCaseContext object is required.");
    }
    // Kiểm tra xem usecaseId trong payload có khớp với usecase được gửi không
    // if (useCaseContext._id?.toString() !== usecaseId) {
    //   throw new Error(
    //     "Usecase ID mismatch between usecaseId and useCaseContext object."
    //   );
    // }
    // Kiểm tra xem usecase có 'tasks' không (GeminiService sẽ làm, nhưng check ở đây tốt hơn)
    if (!useCaseContext.tasks || useCaseContext.tasks.length === 0) {
      throw new Error(
        "This Usecase has no steps (tasks) defined to generate a sequence diagram."
      );
    }
    // --- Kết thúc Thay đổi ---

    // 1. Gọi Gemini Service
    // (Payload giờ đã đúng 100% với những gì GeminiService mong đợi)
    const geminiDiagramData = await this.geminiService.generateSequenceDiagram(
      {
        versionId,
        projectId,
        usecaseId,
        useCaseContext: useCaseContext, // <-- Đã đúng
        lang,
      },
      lang
    );

    // 2. Validate kết quả (Giữ nguyên)
    if (
      !geminiDiagramData ||
      !geminiDiagramData.name ||
      geminiDiagramData.name === "Generation Failed" ||
      !geminiDiagramData.lifelines ||
      !geminiDiagramData.messages
    ) {
      throw new Error(
        "Failed to generate complete diagram data from Gemini. The response was invalid or empty."
      );
    }

    // 3. Lưu vào DB (Giữ nguyên)
    const newSequenceDiagram = new SequenceDiagramSchema({
      project_id: projectId,
      version_id: versionId,
      lang: lang,
      usecase_ref_id: usecaseId,
      name: geminiDiagramData.name,
      description: geminiDiagramData.description || "",
      lifelines: geminiDiagramData.lifelines,
      messages: geminiDiagramData.messages,
      fragments: geminiDiagramData.fragments || [],
      layout_data: geminiDiagramData.layout_data || { nodes: [], edges: [] },
      created_by: user.id,
      related_requirements: [],
      linked_testcases: [],
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

    return savedDocument.toObject({ getters: true }) as SequenceDiagramResponse;
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
        .populate('linked_testcases')
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
      lang: doc.lang,
      name: doc.name,
      description: doc.description,
      usecase_ref_id: doc.usecase_ref_id,
      lifelines: doc.lifelines || [],
      messages: doc.messages || [],
      fragments: doc.fragments || [],
      layout_data: doc.layout_data || { nodes: [], edges: [] },
      related_requirements: doc.related_requirements || [],
      linked_testcases: doc.linked_testcases || [],
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
    }

    return sequenceDiagram.toObject({
      getters: true,
    }) as SequenceDiagramResponse;
  }
}
