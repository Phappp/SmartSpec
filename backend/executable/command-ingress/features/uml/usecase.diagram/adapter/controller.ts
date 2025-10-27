// src/features/database/adapter/controller.ts - UPDATED FOR COMPOSITE KEY

import { Request, Response, NextFunction } from "express";
import { UsecaseDiagramServiceImpl } from "../domain/service";
import VersionModel from "../../../../../../internal/model/version";
import project from "@/internal/model/project";
import { BaseController } from "../../../../shared/base-controller";
import { HttpRequest } from "../../../../types";
import { handleServiceResponse } from "../../../../services/httpHandlerResponse";
import { StatusCodes } from "http-status-codes";
export class UsecaseDiagramController extends BaseController {
  usecaseDiagramService: UsecaseDiagramServiceImpl;
  constructor(usecaseDiagramService: UsecaseDiagramServiceImpl) {
    super();
    this.usecaseDiagramService = usecaseDiagramService;
  }

  async generateUsecaseDiagram(
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
          requirements: version.requirement_model,
          lang: lang,
        };

        const newDatabase =
          await this.usecaseDiagramService.generateSchemaFromRequirements(
            payload,
            userId
          );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Created Usecase diagram Successfully",
          data: newDatabase,
        });
      }
    );
  }

  async getUsecaseDiagrams(
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
          await this.usecaseDiagramService.getUsecaseDiagrams(versionId);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Get all Usecase diagram Successfully",
          data: responseData,
        });
      }
    );
  }

  async getUsecaseDiagramsById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        throw new Error("Method not implemented.");
      }
    );
  }

  //actor
  async editActorById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        throw new Error("Method not implemented.");
      }
    );
  }

  async deleteActorById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        throw new Error("Method not implemented.");
      }
    );
  }

  //usecase
  async editUsecaseById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        throw new Error("Method not implemented.");
      }
    );
  }
  async deleteUsecaseById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        throw new Error("Method not implemented.");
      }
    );
  }

  //association
  async editAssociationById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        throw new Error("Method not implemented.");
      }
    );
  }

  async deleteAssociationById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        throw new Error("Method not implemented.");
      }
    );
  }

  //relationship
  async editRelationshipById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        throw new Error("Method not implemented.");
      }
    );
  }

  async deleteRelationshipById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        throw new Error("Method not implemented.");
      }
    );
  }
}
