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
export class SequenceDiagramServiceImpl implements SequenceDiagramService {
  private geminiService: SequenceDiagramGeminiService;

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
    if (useCaseContext._id?.toString() !== usecaseId) {
      throw new Error(
        "Usecase ID mismatch between usecaseId and useCaseContext object."
      );
    }
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

    return savedDocument.toObject({ getters: true }) as SequenceDiagramResponse;
  }
  public async getSequenceDiagrams(
    versionId: string
  ): Promise<SequenceDiagramResponse[]> {
    throw new Error("Method not implemented.");
  }
  public async getSequenceDiagramById(
    ucId: string
  ): Promise<SequenceDiagramResponse> {
    throw new Error("Method not implemented.");
  }
  public async getSequenceDiagramsByUsecaseId(
    usecaseId: string
  ): Promise<SequenceDiagramResponse[]> {
    throw new Error("Method not implemented.");
  }
  public async deleteSequenceDiagramById(
    ucId: string,
    sequenceId: string,
    subId: string
  ): Promise<SequenceDiagramResponse> {
    const sequenceDiagram = await SequenceDiagram.findOne({
      _id: sequenceId,
      usecase_ref_id: ucId,
    });
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
        "Unauthorized: Only owner or editor can delete sequence diagrams."
      );
    }

    await SequenceDiagram.deleteOne({ _id: sequenceId, usecase_ref_id: ucId });
    return sequenceDiagram.toObject({
      getters: true,
    }) as SequenceDiagramResponse;
  }
}
