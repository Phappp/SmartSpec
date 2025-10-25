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
}
