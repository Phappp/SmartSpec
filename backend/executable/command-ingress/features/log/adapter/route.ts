import { Router, Request, Response, NextFunction } from 'express';
import { LogController } from "../adapter/controller";
import {requireAuthorizedUser} from "../../../middlewares/auth";

export default function initLogRoute(controller: LogController) {
  const router = Router();

  router.post("/", requireAuthorizedUser,(req: Request, res: Response, next: NextFunction) => controller.createLog(req as any, res, next));
  router.get("/", requireAuthorizedUser,(req: Request, res: Response, next: NextFunction) =>  controller.queryLog(req as any, res, next));
  router.get("/export", requireAuthorizedUser,(req: Request, res: Response, next: NextFunction) =>  controller.exportLog(req as any, res, next));
  router.get("/user-activity", requireAuthorizedUser,(req: Request, res: Response, next: NextFunction) =>  controller.getUserActivityLogs(req as any, res,next));
  router.get("/project", requireAuthorizedUser,(req: Request, res: Response, next: NextFunction) =>  controller.getProjectLogs(req as any, res,next));
  router.get("/output", requireAuthorizedUser,(req: Request, res: Response, next: NextFunction) =>  controller.getOutputLogs(req as any, res,next));
  router.post("/retention", requireAuthorizedUser,(req: Request, res: Response, next: NextFunction) =>  controller.runLogRetention(req as any, res,next));
  router.get("/system", requireAuthorizedUser, (req: Request, res: Response, next: NextFunction) =>  controller.getSystemLogs(req as any, res,next));
  return router;
}
