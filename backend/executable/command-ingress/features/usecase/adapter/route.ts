import { Router, Request, Response, NextFunction } from 'express';
import { UsecaseController } from './controller'; // đường dẫn tới controller của bạn
import requireAuthorizedUser from '../../../middlewares/auth';
import multer from 'multer';

export default function initUsecaseRoute(controller: UsecaseController) {

  const router = Router();
  // GET /myproject -> lấy danh sách project của user
  // Thêm vào file route.ts

  // GET /versions/:versionId/usecases -> Lấy danh sách usecases
  router.get(
    '/versions/:versionId/usecases',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.getUsecasesByVersion(req as any, res, next)
  );

  // POST /versions/:versionId/usecases -> Thêm usecase mới
  router.post(
    '/versions/:versionId/usecases',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.addUsecaseToVersion(req as any, res, next)
  );

  // PUT /versions/:versionId/usecases/:usecaseId -> Cập nhật usecase
  router.put(
    '/versions/:versionId/usecases/:usecaseId',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.updateUsecaseInVersion(req as any, res, next)
  );

  // DELETE /versions/:versionId/usecases/:usecaseId -> Xóa usecase
  router.delete(
    '/versions/:versionId/usecases/:usecaseId',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.deleteUsecaseFromVersion(req as any, res, next)
  );

  return router;
}
