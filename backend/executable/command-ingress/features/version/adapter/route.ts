import { Router, Request, Response, NextFunction } from "express";
import { VersionController } from "./controller";
import { requireAuthorizedUser } from "../../../middlewares/auth";

export default function initVersionRoute(controller: VersionController) {
  const router = Router();

  router.post(
    "/:versionId/bump",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.bumpVersion(req as any, res, next)
  );

  router.delete(
    "/:versionId",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.deleteVersion(req as any, res, next)
  );

  router.get(
    "/project/:projectId",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.getVersionsByProject(req as any, res, next)
  );
  
  router.patch(
    "/projects/:projectId/current-version/:versionId",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.setCurrentVersion(req as any, res, next)
  );
  
  router.get(
    "/:versionId/preview",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.getPreview(req as any, res, next)
  );

  router.post(
    "/:versionId",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.createOrUpdatePreview(req as any, res, next)
  );

  router.post(
    "/:versionId/approve",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.approve(req as any, res, next)
  );
  router.patch("/versions/:versionId/editing",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.markEditingController(req as any, res, next)
  );

  router.patch("/versions/:versionId/locked", 
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.markLockedController(req as any, res, next)
  );
  return router;
}
