import { Response, Request, NextFunction } from "express";
import env from "../../../utils/env";
import { NotificationService } from "../types";
import { NotificationRequestBody } from "./dto";
import { BaseController } from "../../../shared/base-controller";
import responseValidationError from "../../../shared/response";
import { HttpRequest } from "../../../types";
import { handleServiceResponse } from "../../../services/httpHandlerResponse";
import { StatusCodes } from "http-status-codes";
import { th } from "@faker-js/faker/.";

class NotificationController extends BaseController {
  service: NotificationService;

  constructor(service: NotificationService) {
    super();
    this.service = service;
  }
  async createNotification(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const sender_id = req.getSubject();
        console.log("sender: ", sender_id)
        const { recipient_id, type, title, message, link } = req.body;
        const notificationRequestBody = new NotificationRequestBody(req.body);
        const validationResult = await notificationRequestBody.validate();

        if (!validationResult.ok) {
          responseValidationError(res, validationResult.errors[0]);
          return;
        }

        const serviceResponse = await this.service.createNotification(
          recipient_id,
          sender_id,
          type,
          title,
          message,
          link
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Updated profile successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async getNotificationById(
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

  async getNotificationsByUserId(
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

  async deleteNotification(
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

export { NotificationController };
