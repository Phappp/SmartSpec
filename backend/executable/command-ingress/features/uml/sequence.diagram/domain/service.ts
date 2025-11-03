// src/features/database/domain/service.ts

import UsecaseDiagramSchema from "../../../../../../internal/model/usecase_diagram";
import { UsecaseDiagramGeminiService } from "./GeminiService";
import {
  GenerateUsecaseDiagrambasePayload,
  UseCaseDiagramResponse,
  UseCaseDiagramService, // Giữ lại interface của bạn
} from "../types";
import { UserServiceImpl } from "../../../user/domain/service"; // Import service của bạn
import mongoose from "mongoose";
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
      (usecase: any) => usecase.id === data.source
    );
    if (ucBySource === -1) {
      throw new Error("Source not found in usecase diagram");
    }

    const ucByTarget = ucd.usecases.findIndex(
      (usecase: any) => usecase.id === data.target
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
      (usecase: any) => usecase.id === data.source
    );
    console.log(ucBySource);
    if (ucBySource === -1) {
      throw new Error("Source not found in usecase diagram");
    }

    const ucByTarget = ucd.usecases.findIndex(
      (usecase: any) => usecase.id === data.target
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
      (usecase: any) => usecase.id === data.usecase_id
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
}
