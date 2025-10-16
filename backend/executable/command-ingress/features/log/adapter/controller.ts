import { Response, NextFunction } from "express";
import { BaseController } from "../../../shared/base-controller";
import { LogService } from "../domain/service";
import { handleServiceResponse } from "../../../services/httpHandlerResponse";
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import { HttpRequest } from "../../../types";

export class LogController extends BaseController {
  constructor(private service: LogService) { super(); }

  public createLog = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      const result = await this.service.createLog(req.body);
      handleServiceResponse(result, res);
    });
  };

  public queryLog = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const filters: any = { ...req.query };
      if (filters.from) {
        filters.from = new Date(filters.from + "T00:00:00.000Z");
      }
      if (filters.to) {
        filters.to = new Date(filters.to + "T23:59:59.999Z");
      }
      if (filters.at) {
        filters.at = new Date(filters.at);
      }
      const result = await this.service.queryLogs(filters);
      handleServiceResponse(result, res);
    });
  };

  public exportLog = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
          res
        );
        return;
      }

      const format = (req.query.format as string) || "csv";
      const allowedFormats = ["csv", "json", "pdf"];
      if (!allowedFormats.includes(format)) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, "Invalid export format", null, 400),
          res
        );
        return;
      }
      if (format === "pdf") {
        await this.service.exportLogs(req.query, "pdf", res);
        return;
      }
      const result = await this.service.exportLogs(req.query, format as "csv" | "json");
      if (!result?.data) {
        handleServiceResponse(result, res);
        return;
      }

      if (format === "csv") {
        res.setHeader("Content-Disposition", `attachment; filename="logs_${Date.now()}.csv"`);
        res.setHeader("Content-Type", "text/csv");
        res.status(200).send(result.data);
      } else if (format === "json") {
        res.setHeader("Content-Disposition", `attachment; filename="logs_${Date.now()}.json"`);
        res.setHeader("Content-Type", "application/json");
        res.status(200).send(result.data);
      }
    });
  };
  // ------------------ NHÓM API CHO ------------------
  public getUserActivityLogs = async (req: HttpRequest, res: Response, next: NextFunction) => {
  await this.execWithTryCatchBlock(req, res, next, async () => {
    const userId = req.getSubject();
    if (!userId) {
      handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
      return;
    }
    const projectId = req.query.project_id as string | undefined;
    const result = await this.service.getUserActivityLogs(userId, projectId);
    handleServiceResponse(result, res);
  });
};


  public getProjectLogs = async (req: HttpRequest, res: Response,next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next,async () => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const projectId = req.query.project_id as string;
      const targetType = req.query.target_type as string | undefined;
      const result = await this.service.getProjectLogs(userId,projectId,targetType);
      handleServiceResponse(result, res);
    });
  };

  public getOutputLogs = async (req: HttpRequest, res: Response,next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next,async () => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const projectId = req.query.project_id as string | undefined;
      const target_type = req.query.target_type as string;
      const result = await this.service.getOutputLogs(userId,target_type,projectId);
      handleServiceResponse(result, res);
    });
  };

  public getSystemLogs = async (req: HttpRequest, res: Response,next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next,async () => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const level = req.query.level as string | undefined;
      const result = await this.service.getSystemLogs(userId,level);
      handleServiceResponse(result, res);
    });
  };

  public runLogRetention = async (req: HttpRequest, res: Response,next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next,async () => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      await this.service.runLogRetention();
      res.status(200).json({ status: "success", message: "Log retention executed" });
    });
  };
}
