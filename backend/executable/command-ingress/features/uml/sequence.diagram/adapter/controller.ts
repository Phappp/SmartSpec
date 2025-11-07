// src/features/database/adapter/controller.ts - UPDATED FOR COMPOSITE KEY

import { Request, Response, NextFunction } from "express";
import { SequenceDiagramServiceImpl } from "../domain/service";
import VersionModel from "../../../../../../internal/model/version";
import project from "@/internal/model/project";
import { BaseController } from "../../../../shared/base-controller";
import { HttpRequest } from "../../../../types";
import { handleServiceResponse } from "../../../../services/httpHandlerResponse";
import { StatusCodes } from "http-status-codes";
import { v } from "@faker-js/faker/dist/airline-BcEu2nRk";
export class SequenceDiagramController extends BaseController {
  sequenceDiagramService: SequenceDiagramServiceImpl;
  constructor(sequenceDiagramService: SequenceDiagramServiceImpl) {
    super();
    this.sequenceDiagramService = sequenceDiagramService;
  }

  async generateSchemaFromRequirements(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const userId = req.getSubject();
        if (!userId) {
          res.status(StatusCodes.UNAUTHORIZED).json({
            status: "Error",
            message: "Unauthorized",
          });
          return;
        }
        const { lang } = req.body;
        if (!lang) {
          res.status(400).json({ message: "Language is required." });
          return;
        }
        const { versionId } = req.params;
        if (!versionId) {
          res.status(400).json({ message: "VersionId are require." });
          return;
        }

        const version = await VersionModel.findById(versionId);
        if (!version) {
          res.status(404).json({ message: `Version not found: ${versionId}` });
          return;
        }

        const payload = {
          versionId: version._id.toString(),
          projectId: version.project_id.toString(),
          usecaseId: req.body.usecaseId, 
          requirements: version.requirement_model,
          lang: lang,
        };

        const newDatabase =
          await this.sequenceDiagramService.generateSchemaFromRequirements(
            payload,
            userId
          );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Created Sequence diagram Successfully",
          data: newDatabase,
        });
      }
    );
  }

  async getSequenceDiagrams(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const versionId = req.params.versionId;
        if (!versionId) {
          res.status(400).json({ message: "VersionId is required." });
          return;
        }
        const responseData =
          await this.sequenceDiagramService.getSequenceDiagrams(versionId);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Get all Usecase diagram Successfully",
          data: responseData,
        });
      }
    );
  }

  async getSequenceDiagramById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const ucId = req.params.ucId;
        if (!ucId) {
          res.status(400).json({ message: "UcId is required." });
          return;
        }

        const responseData =
          await this.sequenceDiagramService.getSequenceDiagramById(ucId);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Get Usecase diagram by Id Successfully",
          data: responseData,
        });
      }
    );
  }

}
