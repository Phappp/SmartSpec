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
        throw new Error("Method not implemented.");
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
        throw new Error("Method not implemented.");
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
      async (req, res, _next) => {
        throw new Error("Method not implemented.");
      }
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
        throw new Error("Method not implemented.");
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
        throw new Error("Method not implemented.");
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
        throw new Error("Method not implemented.");
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
        throw new Error("Method not implemented.");
      }
    );
  }
}

export { ApiKeyController };
