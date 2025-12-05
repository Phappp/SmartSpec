// src/features/database/domain/service.ts

import UsecaseDiagramSchema from "../../../../../../internal/model/usecase_diagram";
import Project from "../../../../../../internal/model/project";
import { UsecaseDiagramGeminiService } from "../domain/GeminiService";
import {
  GenerateUsecaseDiagrambasePayload,
  UseCaseDiagramResponse,
  UseCaseDiagramService, // Giữ lại interface của bạn
} from "../types";
import { UserServiceImpl } from "../../../user/domain/service"; // Import service của bạn
import { VersionService } from "../../../version/domain/service";
import { LogService } from "../../../log/domain/service";
import Version from "../../../../../../internal/model/version";
import User from "../../../../../../internal/model/user";
import mongoose from "mongoose";
export class UsecaseDiagramServiceImpl implements UseCaseDiagramService {
  private geminiService: UsecaseDiagramGeminiService;
  private versionService = new VersionService();
  private logService = new LogService();

  constructor() {
    this.geminiService = new UsecaseDiagramGeminiService();
  }

  public async generateSchemaFromRequirements(
    payload: GenerateUsecaseDiagrambasePayload,
    userId: string
  ): Promise<UseCaseDiagramResponse> {
    const { versionId, projectId, requirements, lang } = payload;

    const user = await new UserServiceImpl().getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!requirements || requirements.length === 0) {
      throw new Error(
        "There are no requirements to generate usecase diagrams."
      );
    }
    if (!projectId) {
      throw new Error("Missing required field: 'projectId' is required.");
    }

    const geminiDiagramData = await this.geminiService.generateUsecaseDiagram(
      requirements,
      lang //"en-US, vi-VN"
    );

    if (
      !geminiDiagramData ||
      !geminiDiagramData.name ||
      geminiDiagramData.name === "Generation Failed" ||
      !geminiDiagramData.actors ||
      !geminiDiagramData.usecases
    ) {
      throw new Error(
        "Failed to generate complete diagram data from Gemini. The response was invalid or empty."
      );
    }

    const newUsecaseDiagram = new UsecaseDiagramSchema({
      project_id: projectId,
      version_id: versionId,
      lang: lang,
      name: geminiDiagramData.name,
      actors: geminiDiagramData.actors,
      usecases: geminiDiagramData.usecases,
      associations: geminiDiagramData.associations || [],
      relationships: geminiDiagramData.relationships || [],
      description: geminiDiagramData.description || [],
      created_by: user.id,
    });

    const savedDocument = await newUsecaseDiagram.save();

    // ✅ Tạo preview change cho usecase diagram mới
    if (userId && versionId) {
      await this.versionService.createOrUpdatePreview(
        versionId,
        userId,
        {
          entity_type: "usecase_diagram",
          entity_id: savedDocument._id.toString(),
          change_type: "added",
          before_snapshot: null,
          after_snapshot: savedDocument.toObject()
        }
      );
    }

    // ✅ Ghi log cho generate usecase diagram
    try {
      const version = await Version.findById(versionId).lean();
      if (version) {
        const user = await User.findById(userId).lean();
        const username = user?.name || "Unknown User";
        await this.logService.createLog({
          project_id: projectId,
          user_id: userId,
          action: "generate_output",
          target_id: savedDocument._id.toString(),
          target_type: "usecase_diagrams",
          version_number: version.version_number,
          affects_requirement: true,
          level: "info",
          performed_by_ai: true,
          details: {
            after: { name: savedDocument.name, requirement_count: requirements.length },
            message: `${username} generated usecase diagram "${savedDocument.name}" from ${requirements.length} requirement(s)`
          }
        });
      }
    } catch (logError) {
      console.error("❌ Error logging usecase diagram generation:", logError);
    }

    return savedDocument.toObject({ getters: true }) as UseCaseDiagramResponse;
  }
  public async getUsecaseDiagrams(
    versionId: string
  ): Promise<UseCaseDiagramResponse[]> {
    const ucds = await UsecaseDiagramSchema.find({
      version_id: versionId,
    }).lean();
    return ucds.map((ucd: any) => ({
      id: ucd._id?.toString(),
      name: ucd.name,
      description: ucd.description,
      actors: ucd.actors,
      usecases: ucd.usecases,
      associations: ucd.associations,
      relationships: ucd.relationships,
      diagram_svg: ucd.diagram_svg,
      related_requirements: ucd.related_requirements,
      linked_testcases: ucd.linked_testcases,
      created_by: ucd.created_by,
    }));
  }
  public async getUsecaseDiagramsById(
    ucId: string
  ): Promise<UseCaseDiagramResponse> {
    const ucd: any = await UsecaseDiagramSchema.findOne({ _id: ucId }).lean();
    if (!ucd) {
      throw new Error("Usecase Diagram not found");
    }
    return {
      id: ucd._id?.toString(),
      name: ucd.name,
      description: ucd.description,
      actors: ucd.actors,
      usecases: ucd.usecases,
      associations: ucd.associations,
      relationships: ucd.relationships,
      diagram_svg: ucd.diagram_svg,
      related_requirements: ucd.related_requirements,
      linked_testcases: ucd.linked_testcases,
      created_by: ucd.created_by,
    };
  }
  public async editActorById(
    ucId: string,
    actorId: string,
    data: { name: string; description?: string }
  ): Promise<UseCaseDiagramResponse> {
    const uc = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!uc) {
      throw new Error("Usecase Diagram not found");
    }
    const actorIndex = uc.actors.findIndex(
      (actor: any) => actor.id === actorId
    );
    if (actorIndex === -1) {
      throw new Error("Actor not found");
    }

    uc.actors[actorIndex].set(data);
    await uc.save();
    return this.getUsecaseDiagramsById(ucId);
  }
  public async deleteActorById(ucId: string, actorId: string): Promise<void> {
    const uc = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!uc) {
      throw new Error("Usecase Diagram not found");
    }
    const actorIndex = uc.actors.findIndex(
      (actor: any) => actor.id === actorId
    );
    if (actorIndex === -1) {
      throw new Error("Actor not found");
    }
    uc.actors.splice(actorIndex, 1);
    await uc.save();
  }
  public async editUsecaseById(
    ucId: string,
    usecaseId: string,
    data: { title: string; description?: string }
  ): Promise<UseCaseDiagramResponse> {
    const uc = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!uc) {
      throw new Error("Usecase Diagram not found");
    }
    const usecaseIndex = uc.usecases.findIndex(
      (usecase: any) => (usecase._id ? String(usecase._id) : '') === usecaseId
    );
    if (usecaseIndex === -1) {
      throw new Error("Usecase not found");
    }

    uc.usecases[usecaseIndex].set(data);
    await uc.save();
    return this.getUsecaseDiagramsById(ucId);
  }
  public async deleteUsecaseById(
    ucId: string,
    usecaseId: string
  ): Promise<void> {
    const uc = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!uc) {
      throw new Error("Usecase Diagram not found");
    }
    const usecaseIndex = uc.usecases.findIndex(
      (usecase: any) => (usecase._id ? String(usecase._id) : '') === usecaseId
    );
    if (usecaseIndex === -1) {
      throw new Error("Usecase not found");
    }
    uc.usecases.splice(usecaseIndex, 1);
    await uc.save();
  }
  public async createRelationship(
    ucId: string,
    data: { source: string; target: string; type: string }
  ) {
    const ucd = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!ucd) {
      throw new Error("Usecase Diagram not found");
    }

    const ucBySource = ucd.usecases.findIndex(
      (usecase: any) => (usecase._id ? String(usecase._id) : '') === data.source
    );
    if (ucBySource === -1) {
      throw new Error("Source not found in usecase diagram");
    }

    const ucByTarget = ucd.usecases.findIndex(
      (usecase: any) => (usecase._id ? String(usecase._id) : '') === data.target
    );
    if (ucByTarget === -1) {
      throw new Error("Target not found in usecase diagram");
    }

    const existingRelationship = ucd.relationships.find(
      (relationship: any) =>
        relationship.source.equals(new mongoose.Types.ObjectId(data.source)) &&
        relationship.target.equals(new mongoose.Types.ObjectId(data.target)) &&
        relationship.type === data.type
    );
    console.log(existingRelationship);
    console.log(data);
    if (existingRelationship) {
      throw new Error("Relationship already exists in usecase diagram");
    }

    ucd.relationships.push({
      id: new mongoose.Types.ObjectId().toString(),
      source: data.source,
      target: data.target,
      type: data.type,
    });
    await ucd.save();
    return this.getUsecaseDiagramsById(ucId);
  }
  public async editRelationshipById(
    ucId: string,
    relationshipId: string,
    data: { source: string; target: string; type: string }
  ): Promise<UseCaseDiagramResponse> {
    const ucd = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!ucd) {
      throw new Error("Usecase Diagram not found");
    }
    const relationshipIndex = ucd.relationships.findIndex(
      (relationship: any) => relationship.id === relationshipId
    );
    if (relationshipIndex === -1) {
      throw new Error("Relationship not found");
    }

    const ucBySource = ucd.usecases.findIndex(
      (usecase: any) => (usecase._id ? String(usecase._id) : '') === data.source
    );
    console.log(ucBySource);
    if (ucBySource === -1) {
      throw new Error("Source not found in usecase diagram");
    }

    const ucByTarget = ucd.usecases.findIndex(
      (usecase: any) => (usecase._id ? String(usecase._id) : '') === data.target
    );
    if (ucByTarget === -1) {
      throw new Error("Target not found in usecase diagram");
    }

    ucd.relationships[relationshipIndex].set(data);
    await ucd.save();
    return this.getUsecaseDiagramsById(ucId);
  }
  public async deleteRelationshipById(
    ucId: string,
    relationshipId: string
  ): Promise<void> {
    const ucd = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!ucd) {
      throw new Error("Usecase Diagram not found");
    }
    const relationshipIndex = ucd.relationships.findIndex(
      (relationship: any) => relationship.id === relationshipId
    );
    if (relationshipIndex === -1) {
      throw new Error("Relationship not found");
    }
    ucd.relationships.splice(relationshipIndex, 1);
    await ucd.save();
  }
  public async editAssociationById(
    ucId: string,
    associationId: string,
    data: { actor_id: string; usecase_id: string }
  ): Promise<UseCaseDiagramResponse> {
    const ucd = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!ucd) {
      throw new Error("Usecase Diagram not found");
    }
    const associationIndex = ucd.associations.findIndex(
      (association: any) => association.id === associationId
    );
    if (associationIndex === -1) {
      throw new Error("Association not found");
    }

    const actorById = ucd.actors.findIndex(
      (actor: any) => actor.id === data.actor_id
    );
    if (actorById === -1) {
      throw new Error("Actor not found in usecase diagram");
    }

    const usecaseById = ucd.usecases.findIndex(
      (usecase: any) => (usecase._id ? String(usecase._id) : '') === data.usecase_id
    );
    if (usecaseById === -1) {
      throw new Error("Usecase not found in usecase diagram");
    }

    ucd.associations[associationIndex].set(data);
    await ucd.save();
    return this.getUsecaseDiagramsById(ucId);
  }
  public async deleteAssociationById(
    ucId: string,
    associationId: string
  ): Promise<void> {
    const ucd = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!ucd) {
      throw new Error("Usecase Diagram not found");
    }
    const associationIndex = ucd.associations.findIndex(
      (association: any) => association.id === associationId
    );
    if (associationIndex === -1) {
      throw new Error("Association not found");
    }
    ucd.associations.splice(associationIndex, 1);
    await ucd.save();
  }
  public async updateActorPosition(
    ucId: string,
    actorId: string,
    position: { x: number; y: number }
  ): Promise<UseCaseDiagramResponse> {
    const uc = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!uc) {
      throw new Error("Usecase Diagram not found");
    }

    const actorIndex = uc.actors.findIndex(
      (actor: any) => actor._id.toString() === actorId
    );
    if (actorIndex === -1) {
      throw new Error("Actor not found");
    }

    // ✅ Cập nhật position
    uc.actors[actorIndex].position = position;
    // ✅ Mark actors array as modified để đảm bảo Mongoose lưu thay đổi nested object
    uc.markModified('actors');
    await uc.save();

    return this.getUsecaseDiagramsById(ucId);
  }
  public async updateUsecasePosition(
    ucId: string,
    usecaseId: string,
    position: { x: number; y: number }
  ): Promise<UseCaseDiagramResponse> {
    const uc = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!uc) {
      throw new Error("Usecase Diagram not found");
    }

    const usecaseIndex = uc.usecases.findIndex(
      (usecase: any) => usecase._id.toString() === usecaseId
    );
    if (usecaseIndex === -1) {
      throw new Error("Usecase not found");
    }

    // ✅ Cập nhật position
    uc.usecases[usecaseIndex].position = position;
    // ✅ Mark usecases array as modified để đảm bảo Mongoose lưu thay đổi nested object
    uc.markModified('usecases');
    await uc.save();

    return this.getUsecaseDiagramsById(ucId);
  }
  public async updateMultiplePositions(
    ucId: string,
    updates: {
      actors?: { id: string; position: { x: number; y: number } }[];
      usecases?: { id: string; position: { x: number; y: number } }[];
    }
  ): Promise<UseCaseDiagramResponse> {
    const uc = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!uc) {
      throw new Error("Usecase Diagram not found");
    }

    // Cập nhật positions cho actors
    if (updates.actors) {
      updates.actors.forEach(({ id, position }) => {
        const actorIndex = uc.actors.findIndex(
          (actor: any) => actor._id.toString() === id
        );
        if (actorIndex !== -1) {
          uc.actors[actorIndex].position = position;
        }
      });
      // ✅ Mark actors array as modified để đảm bảo Mongoose lưu thay đổi nested object
      uc.markModified('actors');
    }

    // Cập nhật positions cho usecases
    if (updates.usecases) {
      updates.usecases.forEach(({ id, position }) => {
        const usecaseIndex = uc.usecases.findIndex(
          (usecase: any) => usecase._id.toString() === id
        );
        if (usecaseIndex !== -1) {
          uc.usecases[usecaseIndex].position = position;
        }
      });
      // ✅ Mark usecases array as modified để đảm bảo Mongoose lưu thay đổi nested object
      uc.markModified('usecases');
    }

    await uc.save();
    return this.getUsecaseDiagramsById(ucId);
  }
  public async resetPositions(ucId: string): Promise<UseCaseDiagramResponse> {
    const uc = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!uc) {
      throw new Error("Usecase Diagram not found");
    }

    // Reset actor positions (phân bố đều bên trái)
    uc.actors.forEach((actor: any, index: number) => {
      actor.position = {
        x: 50,
        y: 50 + index * 100
      };
    });

    // Reset usecase positions (phân bố đều ở giữa)
    uc.usecases.forEach((usecase: any, index: number) => {
      usecase.position = {
        x: 200 + (index % 3) * 200,
        y: 100 + Math.floor(index / 3) * 120
      };
    });

    await uc.save();
    return this.getUsecaseDiagramsById(ucId);
  }
  public async deleteUsecaseDiagram(ucId: string, userId: string): Promise<void> {
    // Kiểm tra usecase diagram có tồn tại không
    const ucd = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!ucd) {
      throw new Error("Usecase Diagram not found");
    }

    // Lấy project từ usecase diagram
    const project = await Project.findById(ucd.project_id);
    if (!project) {
      throw new Error("Associated project not found");
    }

    // Kiểm tra quyền user trong project
    const userMember = project.members.find(
      (member: any) => member.user_id.toString() === userId
    );

    console.log("User attempting deletion:", userMember);

    if (!userMember || userMember.status !== "accepted") {
      throw new Error("Unauthorized - User is not a member of this project");
    }

    // Chỉ cho phép owner hoặc editor xóa
    if (!["owner", "editor"].includes(userMember.role)) {
      throw new Error("Only owner or editor can delete usecase diagrams");
    }

    // Lưu snapshot trước khi xóa
    const beforeSnapshot = ucd.toObject();
    const versionId = ucd.version_id?.toString();

    // Thực hiện xóa
    const result = await UsecaseDiagramSchema.deleteOne({ _id: ucId });

    if (result.deletedCount === 0) {
      throw new Error("Failed to delete Usecase Diagram");
    }

    // ✅ Tạo preview change cho usecase diagram đã xóa
    if (versionId && userId) {
      await this.versionService.createOrUpdatePreview(
        versionId,
        userId,
        {
          entity_type: "usecase_diagram",
          entity_id: ucId,
          change_type: "deleted",
          before_snapshot: beforeSnapshot,
          after_snapshot: null
        }
      );

      // ✅ Ghi log cho delete usecase diagram
      try {
        const version = await Version.findById(versionId).lean();
        if (version) {
          const user = await User.findById(userId).lean();
          const username = user?.name || "Unknown User";
          await this.logService.createLog({
            project_id: ucd.project_id?.toString() || project._id.toString(),
            user_id: userId,
            action: "delete_output",
            target_id: ucId,
            target_type: "usecase_diagrams",
            version_number: version.version_number,
            affects_requirement: false,
            level: "warning",
            details: {
              before: beforeSnapshot,
              message: `${username} deleted usecase diagram "${ucd.name}"`
            }
          });
        }
      } catch (logError) {
        console.error("❌ Error logging usecase diagram deletion:", logError);
      }
    }
  }
}
