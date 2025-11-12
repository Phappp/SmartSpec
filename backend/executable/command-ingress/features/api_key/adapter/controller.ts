import { Response, Request, NextFunction } from "express";
import env from "../../../utils/env";
import { ApiKeyService } from "../types";
import {} from "./dto";
import { BaseController } from "../../../shared/base-controller";
import responseValidationError from "../../../shared/response";
import { HttpRequest } from "../../../types";
import { handleServiceResponse } from "../../../services/httpHandlerResponse";
import { StatusCodes } from "http-status-codes";
import { th } from "@faker-js/faker/.";
import { connect } from "http2";

class ApiKeyController extends BaseController {
  service: ApiKeyService;

  constructor(service: ApiKeyService) {
    super();
    this.service = service;
  }

  async createAPIKey(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { key_value, provider, model_name, is_active } = req.body;
        if (!key_value || !provider) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "Key value and provider are required",
          });
          return;
        }
        if (!is_active) {
          const is_active = true;
        }
        const created_by = req.getSubject();
        const serviceResponse = await this.service.createAPIKey(
          key_value,
          provider,
          model_name,
          is_active,
          created_by
        );

        res.status(StatusCodes.CREATED).json({
          status: "Success",
          message: "Create API keys successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async searchAPIKeys(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { content } = req.body;
        if (!content) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "Content to find are required",
          });
          return;
        }
        const serviceResponse = await this.service.searchAPIKeys(
          String(content)
        );

        res.status(StatusCodes.CREATED).json({
          status: "Success",
          message: "Search successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async filterAPIKeys(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {}
    );
  }

  async getAPIKeyStatistics(
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

  async getAllAPIKey(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const serviceResponse = await this.service.getAllAPIKey();

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Get all API keys successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async getAPIKeyById(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { id } = req.params;
        if (!id) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "Key ID is required",
          });
          return;
        }
        const serviceResponse = await this.service.getAPIKeyById(id);

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Get API keys by id successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async updateAPIKey(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { key_value, provider, model_name, is_active } = req.body;
        const { id } = req.params;
        if (!id) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "Key ID is required",
          });
          return;
        }
        const serviceResponse = await this.service.updateAPIKey(id, {
          key_value,
          provider,
          model_name,
          is_active,
        });

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Update API keys successfully",
          data: serviceResponse,
        });
      }
    );
  }

  async deleteAPIKey(
    req: HttpRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.execWithTryCatchBlock(
      req,
      res,
      next,
      async (req, res, _next) => {
        const { id } = req.params;
        if (!id) {
          res.status(StatusCodes.BAD_REQUEST).json({
            status: "Error",
            message: "Key ID is required",
          });
          return;
        }
        const serviceResponse = await this.service.deleteAPIKey(id);
        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Delete API keys successfully",
          data: serviceResponse,
        });
      }
    );
  }
}

export { ApiKeyController };
