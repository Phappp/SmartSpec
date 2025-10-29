// src/features/database/domain/service.ts

import UsecaseDiagramSchema from "../../../../../../internal/model/usecase_diagram";
import { UsecaseDiagramGeminiService } from "../domain/GeminiService";
import {
  GenerateUsecaseDiagrambasePayload,
  UseCaseDiagramResponse,
  UseCaseDiagramService, // Giữ lại interface của bạn
} from "../types";
import { UserServiceImpl } from "../../../user/domain/service"; // Import service của bạn

export class UsecaseDiagramServiceImpl implements UseCaseDiagramService {
  private geminiService: UsecaseDiagramGeminiService;

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

    const description = `Usecase diagram generated for project ${projectId} by ${user.name}`;

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
    const uc = await UsecaseDiagramSchema.findOne({_id: ucId});
    if (!uc) {
      throw new Error("Usecase Diagram not found");
    }
    const actorIndex = uc.actors.findIndex((actor: any) => actor.id === actorId);
    if (actorIndex === -1) {
      throw new Error("Actor not found");
    }
    uc.actors.splice(actorIndex, 1);
    await uc.save();
  }
  public async editUsecaseById(
    ucId: string,
    usecaseId: string,
    data: {title: string; description?: string;}
  ): Promise<UseCaseDiagramResponse> {
    const uc = await UsecaseDiagramSchema.findOne({ _id: ucId });
    if (!uc) {
      throw new Error("Usecase Diagram not found");
    }
    const usecaseIndex = uc.usecases.findIndex(
      (usecase: any) => usecase.id === usecaseId
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
    throw new Error("Method not implemented.");
  }
  public async editRelationshipById(
    ucId: string,
    relationshipId: string,
    data: any
  ): Promise<UseCaseDiagramResponse> {
    throw new Error("Method not implemented.");
  }
  public async deleteRelationshipById(
    ucId: string,
    relationshipId: string
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public async editAssociationById(
    ucId: string,
    associationId: string,
    data: any
  ): Promise<UseCaseDiagramResponse> {
    throw new Error("Method not implemented.");
  }
  public async deleteAssociationById(
    ucId: string,
    associationId: string
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
