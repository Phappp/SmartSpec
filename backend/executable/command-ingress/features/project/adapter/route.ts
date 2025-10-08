import { Router, Request, Response, NextFunction } from 'express';
import { ProjectController } from './controller'; // đường dẫn tới controller của bạn
import requireAuthorizedUser from '../../../middlewares/auth';
import multer from 'multer';

export default function initProjectRoute(controller: ProjectController) {

  const router = Router();
  // GET /myproject -> lấy danh sách project của user
  router.get('/myproject',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.getMyProjects(req as any, res, next));

  // POST /projects -> tạo project mới với upload file
  router.post("/",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.createProject(req as any, res, next));

  // PUT /:projectId -> update project
  router.put('/:projectId',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.updateProject(req as any, res, next));

  // DELETE /:projectId -> xóa project
  router.delete('/:projectId',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.deleteProject(req as any, res, next));

  // POST /:projectId/restore -> restore project từ trash
  router.post('/:projectId/restore',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.restoreProject(req as any, res, next));

  // GET /recent -> lấy 5 dự án gần đây
  router.get('/recent',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.getRecentProjects(req as any, res, next));

  // GET /shared -> lấy danh sách project đã được chia sẻ cho user
  router.get('/shared',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.getSharedProjects(req as any, res, next));

  // GET /trashed -> lấy danh sách project đã xóa (trash)
  router.get('/trashed',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.getDeleteProjects(req as any, res, next)
  );

  // GET /:projectId -> lấy chi tiết project với version hiện tại 
  router.get('/:projectId',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.getProjectDetail(req as any, res, next));

  router.get(
    "/versions/:versionId/status",
    requireAuthorizedUser,
    controller.getVersionStatus // Thêm phương thức này vào controller
  )

  // GET /admin/all -> Lấy tất cả dự án (dành cho admin)
  router.get(
    '/admin/all',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.getAllProjectsForAdmin(req as any, res, next)
  );

  // POST /versions/:versionId/inputs -> Thêm input (file/text) vào một version đã có
  router.post(
    '/versions/:versionId/inputs',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.addInputsToVersion(req as any, res, next)
  );

  router.delete(
    '/versions/:versionId/unprocessed-inputs',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.deleteUnprocessedInputs(req as any, res, next)
  );

  // DELETE /versions/:versionId/inputs/:inputId -> Xóa một input cụ thể
  router.delete(
    '/versions/:versionId/inputs/:inputId',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.deleteSpecificInput(req as any, res, next)
  );

  // router.post('/:versionId/suggest-relations',
  //   requireAuthorizedUser, (req: Request, res: Response, next: NextFunction) => controller.suggestRelations(req as any, res, next));

  return router;
}
