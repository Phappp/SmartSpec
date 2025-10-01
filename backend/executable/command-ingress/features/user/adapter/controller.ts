import { Response, Request, NextFunction } from "express";
import env from "../../../utils/env";
import { UserService } from "../types";
import { UpdateProfileRequestBody } from "./dto";
import { BaseController } from "../../../shared/base-controller";
import responseValidationError from "../../../shared/response";
import { HttpRequest } from "../../../types";
import { handleServiceResponse } from "../../../services/httpHandlerResponse";
import { StatusCodes } from "http-status-codes";

class UserController extends BaseController {
  service: UserService;

  constructor(service: UserService) {
    super();
    this.service = service;
  }

  // async getProfile(
  //   req: HttpRequest,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<void> {
  //   await this.execWithTryCatchBlock(
  //     req,
  //     res,
  //     next,
  //     async (req, res, _next) => {
  //       const userId = req.getSubject();
  //       if (!userId) {
  //         res.status(StatusCodes.UNAUTHORIZED).json({
  //           status: "Error",
  //           message: "Unauthorized",
  //         });
  //         return;
  //       }
  //       const serviceResponse = await this.service.getme(userId);
  //       handleServiceResponse(serviceResponse, res);
  //     }
  //   );
  // }

  async updateProfile(
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

        const {
          email,
          name,
          dob,
          gender,
          avatarUrl,
          status,
        } = req.body;
        const { day, month, year } = dob;
        const newDob = new Date(year, month - 1, day);
        const updateProfileRequestBody = new UpdateProfileRequestBody(req.body);
        const validationResult = await updateProfileRequestBody.validate();

        if (!validationResult.ok) {
          responseValidationError(res, validationResult.errors[0]);
          return;
        }

        await this.service.updateProfile(userId, {
          email,
          name,
          newDob,
          gender,
          avatarUrl,
          status,
        });

        res.status(StatusCodes.OK).json({
          status: "Success",
          message: "Updated Information in successfully",
        });
      }
    );
  }
}

export { UserController };
