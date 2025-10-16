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
import user from "@/internal/model/user";

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
        console.log("sender: ", sender_id);
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
        const notId = req.params.id;
        if (!notId) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "NotificationID are required",
          });
          return;
        }

        const userId = req.getSubject();

        const serviceResponse = await this.service.getNotificationById(
          userId,
          notId
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Get notification by id successfull",
          data: serviceResponse,
        });
      }
    );
  }

  async getAllMyNotifications(
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
        const serviceResponse = await this.service.getNotificationsByUserId(
          userId
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Get all notification by user successfull",
          data: serviceResponse,
        });
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
        const userId = req.getSubject();
        const notId = req.params.id;
        const serviceResponse = await this.service.deleteNotification(
          userId,
          notId
        );

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Delete notification successfull",
          data: serviceResponse,
        });
      }
    );
  }

  async markAsRead(
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
        const notId = req.params.id;
        const {is_read} = req.body;

        if (is_read == undefined || is_read == null) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "is_read are required",
          });
          return;
        }
        if (!notId) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "NotificationID are required",
          });
          return;
        }

        const serviceResponse = await this.service.markAsRead(userId, notId, is_read);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Mark notification successfull",
          data: serviceResponse,
        });
      }
    );
  }
}

export { NotificationController };
