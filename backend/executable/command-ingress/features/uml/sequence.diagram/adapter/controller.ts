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
        const { language, usecaseId } = req.body;
        if (!language) {
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

        // 4. Tìm Usecase Context từ collection - handle cả _id và id (backward compatibility)
        const Usecase = (await import("../../../../../../internal/model/usecase")).default;
        const { Types } = await import("mongoose");

        // Normalize usecaseId (handle ObjectId string, plain string, etc.)
        let normalizedUsecaseId = usecaseId;
        if (Types.ObjectId.isValid(String(usecaseId))) {
          normalizedUsecaseId = new Types.ObjectId(usecaseId).toString();
        }

        let useCaseContext = await Usecase.findOne({
          $or: [
            { _id: new Types.ObjectId(usecaseId) },
            { _id: usecaseId },
            { _id: normalizedUsecaseId },
            { id: usecaseId }
          ],
          version_id: version._id
        }).lean();

        // Nếu không tìm thấy, thử tìm bằng string comparison
        if (!useCaseContext) {
          const allUsecases = await Usecase.find({ version_id: version._id }).lean();
          useCaseContext = allUsecases.find(uc =>
            String(uc._id) === String(usecaseId) ||
            String(uc._id) === normalizedUsecaseId
          );
        }

        if (!useCaseContext) {
          const availableUsecases = await Usecase.find({ version_id: version._id }).select('_id name').lean();
          console.error('❌ Sequence Diagram: Usecase not found:', {
            usecaseId,
            normalizedUsecaseId,
            versionId,
            availableUsecases: availableUsecases.map(uc => ({
              _id: String(uc._id),
              name: uc.name
            }))
          });
          res.status(StatusCodes.NOT_FOUND).json({
            message: `Usecase with id ${usecaseId} not found in version ${versionId}. Available usecases: ${availableUsecases.length}`
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
          language: language,
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
          message: "Get all Sequence diagram Successfully",
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
          message: "Get Sequence diagram by Id Successfully",
          data: responseData,
        });
      }
    );
  }

  async deleteSequenceDiagramById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sequenceId = req.params.sequenceId;
        if (!sequenceId) {
          res.status(400).json({ message: "SequenceId is required." });
          return;
        }

        const subId = req.getSubject();
        if (!subId) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }

        const responseData =
          await this.sequenceDiagramService.deleteSequenceDiagramById(sequenceId, subId);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Delete sequence diagram by Id Successfully",
          data: responseData,
        });
      }
    );
  }

  async updateLifelinePosition(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sqdId = req.params.sqdId;
        const lifelineId = req.params.lifelineId;
        const position = req.body;

        if (!sqdId) {
          res.status(400).json({ message: "Sequence Diagram ID is required." });
          return;
        }
        if (!lifelineId) {
          res.status(400).json({ message: "Lifeline ID is required." });
          return;
        }
        if (!position || position.x === undefined || position.y === undefined) {
          res.status(400).json({ message: "Valid position {x, y} is required." });
          return;
        }

        const responseData = await this.sequenceDiagramService.updateLifelinePosition(
          sqdId,
          lifelineId,
          position
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Update Lifeline Position Successfully",
          data: responseData,
        });
      }
    );
  }

  async updateMultiplePositions(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sqdId = req.params.sqdId;
        const updates = req.body;

        if (!sqdId) {
          res.status(400).json({ message: "Sequence Diagram ID is required." });
          return;
        }
        if (!updates || (!updates.lifelines && !updates.messages)) {
          res.status(400).json({
            message: "Valid updates {lifelines?, messages?} is required."
          });
          return;
        }

        const responseData = await this.sequenceDiagramService.updateMultiplePositions(
          sqdId,
          updates
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Update Multiple Positions Successfully",
          data: responseData,
        });
      }
    );
  }

  // ==================== LIFELINE CRUD ====================
  async updateLifeline(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sqdId = req.params.sqdId;
        const lifelineId = req.params.lifelineId;
        const data = req.body;

        if (!sqdId) {
          res.status(400).json({ message: "Sequence Diagram ID is required." });
          return;
        }
        if (!lifelineId) {
          res.status(400).json({ message: "Lifeline ID is required." });
          return;
        }
        if (!data) {
          res.status(400).json({ message: "Data is required." });
          return;
        }

        const responseData = await this.sequenceDiagramService.updateLifeline(
          sqdId,
          lifelineId,
          data
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Update Lifeline Successfully",
          data: responseData,
        });
      }
    );
  }

  async deleteLifeline(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sqdId = req.params.sqdId;
        const lifelineId = req.params.lifelineId;

        if (!sqdId) {
          res.status(400).json({ message: "Sequence Diagram ID is required." });
          return;
        }
        if (!lifelineId) {
          res.status(400).json({ message: "Lifeline ID is required." });
          return;
        }

        await this.sequenceDiagramService.deleteLifeline(sqdId, lifelineId);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Delete Lifeline Successfully",
        });
      }
    );
  }

  // ==================== MESSAGE CRUD ====================
  async createMessage(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sqdId = req.params.sqdId;
        const data = req.body;

        if (!sqdId) {
          res.status(400).json({ message: "Sequence Diagram ID is required." });
          return;
        }
        if (!data || !data.source_lifeline_id || !data.target_lifeline_id || !data.content) {
          res.status(400).json({
            message: "source_lifeline_id, target_lifeline_id, and content are required."
          });
          return;
        }

        const responseData = await this.sequenceDiagramService.createMessage(
          sqdId,
          data
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Create Message Successfully",
          data: responseData,
        });
      }
    );
  }

  async updateMessage(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sqdId = req.params.sqdId;
        const messageId = req.params.messageId;
        const data = req.body;

        if (!sqdId) {
          res.status(400).json({ message: "Sequence Diagram ID is required." });
          return;
        }
        if (!messageId) {
          res.status(400).json({ message: "Message ID is required." });
          return;
        }
        if (!data) {
          res.status(400).json({ message: "Data is required." });
          return;
        }

        const responseData = await this.sequenceDiagramService.updateMessage(
          sqdId,
          messageId,
          data
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Update Message Successfully",
          data: responseData,
        });
      }
    );
  }

  async deleteMessage(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sqdId = req.params.sqdId;
        const messageId = req.params.messageId;

        if (!sqdId) {
          res.status(400).json({ message: "Sequence Diagram ID is required." });
          return;
        }
        if (!messageId) {
          res.status(400).json({ message: "Message ID is required." });
          return;
        }

        await this.sequenceDiagramService.deleteMessage(sqdId, messageId);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Delete Message Successfully",
        });
      }
    );
  }

  // ==================== FRAGMENT CRUD ====================
  async createFragment(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sqdId = req.params.sqdId;
        const data = req.body;

        if (!sqdId) {
          res.status(400).json({ message: "Sequence Diagram ID is required." });
          return;
        }
        if (!data || !data.type) {
          res.status(400).json({ message: "Fragment type is required." });
          return;
        }

        const responseData = await this.sequenceDiagramService.createFragment(
          sqdId,
          data
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Create Fragment Successfully",
          data: responseData,
        });
      }
    );
  }

  async updateFragment(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sqdId = req.params.sqdId;
        const fragmentId = req.params.fragmentId;
        const data = req.body;

        if (!sqdId) {
          res.status(400).json({ message: "Sequence Diagram ID is required." });
          return;
        }
        if (!fragmentId) {
          res.status(400).json({ message: "Fragment ID is required." });
          return;
        }
        if (!data) {
          res.status(400).json({ message: "Data is required." });
          return;
        }

        const responseData = await this.sequenceDiagramService.updateFragment(
          sqdId,
          fragmentId,
          data
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Update Fragment Successfully",
          data: responseData,
        });
      }
    );
  }

  async deleteFragment(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sqdId = req.params.sqdId;
        const fragmentId = req.params.fragmentId;

        if (!sqdId) {
          res.status(400).json({ message: "Sequence Diagram ID is required." });
          return;
        }
        if (!fragmentId) {
          res.status(400).json({ message: "Fragment ID is required." });
          return;
        }

        await this.sequenceDiagramService.deleteFragment(sqdId, fragmentId);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Delete Fragment Successfully",
        });
      }
    );
  }
}
