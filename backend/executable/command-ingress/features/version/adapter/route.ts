import { Router, Request, Response, NextFunction } from "express";
import { VersionController } from "./controller";
import { requireAuthorizedUser } from "../../../middlewares/auth";

/**
 * 🧩 Version Routes
 */
export default function initVersionRoute(controller: VersionController) {
  const router = Router();

  // 🚀 Tạo version mới từ version hiện tại
  router.post(
    "/:versionId/bump",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.bumpVersion(req as any, res, next)
  );

  // 🗑️ Xóa version
  router.delete(
    "/:versionId",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.deleteVersion(req as any, res, next)
  );

  // 📄 Lấy danh sách version theo project
  router.get(
    "/project/:projectId",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.getVersionsByProject(req as any, res, next)
  );

  // 🔄 Đổi version làm việc (current)
  router.patch(
    "/projects/:projectId/current-version/:versionId",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.setCurrentVersion(req as any, res, next)
  );

  // 📋 Preview và upgrade version
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

  // // ✅ Đánh dấu version ổn định (stable)
  // router.post(
  //   "/mark-stable",
  //   requireAuthorizedUser,
  //   (req, res, next) => controller.markVersionAsStable(req as any, res, next)
  // );

  // // 🔒 Khóa version (không cho chỉnh sửa)
  // router.post(
  //   "/lock",
  //   requireAuthorizedUser,
  //   (req, res, next) => controller.lockVersion(req as any, res, next)
  // );

  return router;
}
