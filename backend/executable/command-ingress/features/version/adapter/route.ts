import { Router, Request, Response, NextFunction } from "express";
import { VersionController } from "./controller";
import { requireAuthorizedUser } from "../../../middlewares/auth";

/**
 */
export default function initVersionRoute(controller: VersionController) {
  const router = Router();

  // 📘 Tạo version mới từ version hiện tại
  router.post(
    "/:versionId/bump",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>controller.bumpVersion(req as any, res, next));

  // ♻️ Rollback version
  router.post(
    "/rollback",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>controller.rollbackVersion(req as any, res, next));

  // 🔍 So sánh 2 version
  router.get(
    "/compare",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>controller.compareVersions(req as any, res, next));

  // 📄 Lấy danh sách version theo project
  router.get(
    "/project/:projectId",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>controller.getVersionsByProject(req as any, res, next));

  // 📘 Lấy chi tiết 1 version
  router.patch(
    "/projects/:projectId/current-version/:versionId",
    requireAuthorizedUser,
    (req, res, next) => controller.setCurrentVersion(req as any, res, next)
  );
  // ✅ Đánh dấu version ổn định (stable)
  router.post(
    "/mark-stable",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>controller.markVersionAsStable(req as any, res, next));

  // 🔒 Khóa version (không cho chỉnh sửa)
  router.post(
    "/lock",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>controller.lockVersion(req as any, res, next));

  // ⚙️ Tự động bump version khi có thay đổi lớn/nhỏ
  router.post(
    "/auto-bump",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>controller.autoBumpVersionOnChange(req as any, res, next));

  return router;
} 