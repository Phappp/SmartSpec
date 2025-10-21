import { Router, Request, Response, NextFunction } from 'express';
import { InputHandleController } from './controller'; // đường dẫn tới controller của bạn
import { requireAuthorizedUser } from '../../../middlewares/auth';
import multer from 'multer';

export default function initInputHandleRoute(controller: InputHandleController) {

  const router = Router();
  // POST /versions/:versionId/inputs -> Thêm input (file/text) vào một version đã có
  router.post(
    '/versions/:versionId/inputs',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.addInputsToVersion(req as any, res, next)
  );

  // DELETE /versions/:versionId/inputs/:inputId -> Xóa một input cụ thể
  router.delete(
    '/versions/:versionId/inputs/:inputId',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.deleteSpecificInput(req as any, res, next)
  );

  return router;
}
