// src/features/database/domain/service.ts

import UsecaseDiagramSchema from "../../../../../../internal/model/usecase_diagram";
import { UsecaseDiagramGeminiService } from "./GeminiService";
import {
  GenerateSequenceDiagramPayload,
  SequenceDiagramResponse,
  SequenceDiagramService, // Giữ lại interface của bạn
} from "../types";
import { UserServiceImpl } from "../../../user/domain/service"; // Import service của bạn
import mongoose from "mongoose";
import { th } from "@faker-js/faker/.";
export class SequenceDiagramServiceImpl implements SequenceDiagramService {
  private geminiService: UsecaseDiagramGeminiService;

  constructor() {
    this.geminiService = new UsecaseDiagramGeminiService();
  }

  public async generateSchemaFromRequirements(
    payload: GenerateSequenceDiagramPayload,
    userId: string
  ): Promise<SequenceDiagramResponse> {
    throw new Error("Method not implemented.");
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
}
