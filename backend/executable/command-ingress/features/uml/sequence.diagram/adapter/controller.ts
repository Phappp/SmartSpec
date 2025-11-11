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
        // 1. Xác thực User
        const userId = req.getSubject();
        if (!userId) {
          res.status(StatusCodes.UNAUTHORIZED).json({
            status: "Error",
            message: "Unauthorized",
          });
          return;
        }

        // 2. Xác thực Payload (Body và Params)
        const { lang, usecaseId } = req.body;
        if (!lang) {
          res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: "Language is required." });
          return;
        }
        if (!usecaseId) {
          res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: "usecaseId is required in the body." });
          return;
        }

        const { versionId } = req.params;
        if (!versionId) {
          res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: "VersionId (as URL param) is required." });
          return;
        }

        // 3. Lấy dữ liệu Version
        const version = await VersionModel.findById(versionId);
        if (!version) {
          res
            .status(StatusCodes.NOT_FOUND)
            .json({ message: `Version not found: ${versionId}` });
          return;
        }

        // 4. <-- SỬA ĐỔI QUAN TRỌNG: Tìm Usecase Context (Ngữ cảnh)
        // Tìm 'usecase' cụ thể mà người dùng muốn vẽ
        // từ bên trong mảng 'requirement_model' của version
        const useCaseContext = version.requirement_model.find(
          (uc: any) => uc._id?.toString() === usecaseId
        );

        // Nếu không tìm thấy Usecase đó
        if (!useCaseContext) {
          res.status(StatusCodes.NOT_FOUND).json({
            message: `Usecase with id ${usecaseId} not found in version ${versionId}`,
          });
          return;
        }

        // 5. Tạo Payload cho Service
        // (Payload giờ đã chính xác)
        const payload = {
          versionId: version._id.toString(),
          projectId: version.project_id.toString(),
          usecaseId: usecaseId,
          useCaseContext: useCaseContext, // <-- FIX: Giờ là 1 object, không phải mảng
          lang: lang,
        };

        // 6. Gọi Service
        const newSequenceDiagram =
          await this.sequenceDiagramService.generateSchemaFromRequirements(
            payload,
            userId
          );

        // 7. Trả về thành công
        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Created Sequence diagram Successfully",
          data: newSequenceDiagram,
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
