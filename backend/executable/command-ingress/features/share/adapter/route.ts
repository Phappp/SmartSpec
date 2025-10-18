import { Router, Request, Response, NextFunction } from "express";
import { ShareProjectController } from "../adapter/controller";
import { requireAuthorizedUser } from "../../../middlewares/auth";
import jwt from "jsonwebtoken";
import { ShareProjectService } from "../domain/service";
const shareProjectService = new ShareProjectService();

export default function initShareProjectRoute(
  controller: ShareProjectController
) {
  const router = Router();

  // POST /:projectId/members/invite -> mời thành viên
  router.post(
    "/:projectId/members/invite",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.inviteMember(req as any, res, next)
  );

  // GET /api/projects/:projectId/members/invites mời ngta
  router.get(
    "/:projectId/members/invites",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.getProjectInvites(req as any, res, next)
  );

  // GET /api/users/me/invites
  router.get(
    "/me/invites",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.getUserInvites(req as any, res, next)
  );

  // POST /api/projects/:projectId/members/accept //ngta chấp nhận
  router.post(
    "/:projectId/members/:memberId/accept",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.acceptInvite(req as any, res, next)
  );

  router.get("/:projectId/members/:memberId/accept", controller.acceptInvite);

  // POST /api/projects/:projectId/members/:memberId/reject
  router.post(
    "/:projectId/members/:memberId/reject",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.rejectInvite(req as any, res, next)
  );

  router.get("/:projectId/members/:memberId/reject", controller.rejectInvite);

  // Cancel Invite
  router.delete(
    "/:projectId/members/:memberId/cancel",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.cancelInvite(req as any, res, next)
  );

  // DELETE /api/projects/:projectId/members/:memberId xoá thành viên khỏi dự án
  router.delete(
    "/:projectId/members/:memberId",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.removeMember(req as any, res, next)
  );

  // POST /:projectId/leave (thành viên rời dự án) //rời dự án
  router.post(
    "/:projectId/leave",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>
      controller.leaveProject(req as any, res, next)
  );

  return router;
}
