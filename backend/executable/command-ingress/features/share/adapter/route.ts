import { Router, Request, Response, NextFunction } from 'express';
import { ShareProjectController } from '../adapter/controller';
import  requireAuthorizedUser from '../../../middlewares/auth';
import jwt from "jsonwebtoken";
import { ShareProjectService } from '../domain/service';
const shareProjectService = new ShareProjectService();

export default function initShareProjectRoute(controller: ShareProjectController) {
  const router = Router();

  // POST /:projectId/members/invite -> mời thành viên
  router.post('/:projectId/members/invite',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.inviteMember(req as any, res, next));

  // GET /api/projects/:projectId/members/invites
  router.get('/:projectId/members/invites',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.getProjectInvites(req as any, res, next));

  // GET /api/users/me/invites
  router.get('/me/invites',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.getUserInvites(req as any, res, next));

  // POST /api/projects/:projectId/members/accept
  router.post('/:projectId/members/:memberId/accept', 
    requireAuthorizedUser, 
    (req: Request, res: Response, next: NextFunction) => controller.acceptInvite(req as any, res, next));

  router.get('/:projectId/members/:memberId/accept', async (req, res) => {
    const { projectId, memberId } = req.params;
    const token = req.query.token as string;

    if (!token) return res.status(400).json({ message: "Missing token" });

    try {
      // verify token email
      const payload = jwt.verify(token, process.env.JWT_EMAIL_SECRET!) as any;
      if (payload.projectId !== projectId || payload.userId !== memberId) {
        return res.status(403).json({ message: "Invalid token" });
      }

      // gọi service trực tiếp
      const result = await shareProjectService.acceptInvite(projectId, memberId);
      return res.status(result.code || 200).json(result);

    } catch (err) {
      console.error("Error verifying invite token:", err);
      return res.status(403).json({ message: "Expired or invalid token" });
    }
  });

  // POST /api/projects/:projectId/members/:memberId/reject
  router.post('/:projectId/members/:memberId/reject',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.rejectInvite(req as any, res, next));
  
  router.get('/:projectId/members/:memberId/reject', async (req, res) => {
    const { projectId, memberId } = req.params;
    const token = req.query.token as string;

    if (!token) return res.status(400).json({ message: "Missing token" });

    try {
      // verify token email
      const payload = jwt.verify(token, process.env.JWT_EMAIL_SECRET!) as any;
      if (payload.projectId !== projectId || payload.userId !== memberId) {
        return res.status(403).json({ message: "Invalid token" });
      }

      // gọi service trực tiếp
      const result = await shareProjectService.rejectInvite(projectId, memberId);
      return res.status(result.code || 200).json(result);

    } catch (err) {
      console.error("Error verifying invite token:", err);
      return res.status(403).json({ message: "Expired or invalid token" });
    }
  });

  // Cancel Invite
  router.delete(
    "/:projectId/members/:memberId/cancel",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.cancelInvite(req as any, res, next));

 // DELETE /api/projects/:projectId/members/:memberId
  router.delete(
    "/:projectId/members/:memberId",
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) => controller.removeMember(req as any, res, next));

  // POST /:projectId/leave (thành viên rời dự án)
  router.post('/:projectId/leave',
    requireAuthorizedUser,
    (req: Request, res: Response, next: NextFunction) =>controller.leaveProject(req as any, res, next));

  return router;
}
