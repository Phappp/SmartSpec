import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../shared/base-controller';
import { handleServiceResponse } from '../../../services/httpHandlerResponse';
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { HttpRequest } from "../../../types";
import { InviteMemberByEmailDto } from '../adapter/dto';
import { ShareProjectService } from '../domain/service';

export class ShareProjectController extends BaseController {
  constructor(private service: ShareProjectService) {
    super();
  }

  /**
   * Mời thành viên vào dự án
   * POST /api/projects/:projectId/members/invite
   */
  public inviteMember = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      const subId = req.getSubject();
      if (!subId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
    const dto = plainToClass(InviteMemberByEmailDto, req.body);

      const errors = await validate(dto);
      if (errors.length > 0) {
        const errorMessages = errors.map(e => Object.values(e.constraints || {})).flat().join('; ');
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, errorMessages, null, 400), res);
        return;
      }

      const { projectId } = req.params;

      // Gọi service mới với email
      const result = await this.service.inviteMemberByEmail(projectId, subId, dto.email, dto.role);
      console.log(result);
      handleServiceResponse(result, res);
    });
  };

  /**
   * Lấy tất cả invites của project
   * GET /api/projects/:projectId/members/invites
   */
  public getProjectInvites = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      const userId = (req as any).getSubject?.();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      const { projectId } = req.params;
      const result = await this.service.getProjectInvites(projectId, userId);
      handleServiceResponse(result, res);
    });
  };
  /**
   * Lấy tất cả invites mà user nhận được
   * GET /api/users/me/invites
   */
  public getUserInvites = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      const result = await this.service.getUserInvites(userId);
      handleServiceResponse(result, res);
    });
  }

  /**
   * Chấp nhận invite vào project
   * POST /api/projects/:projectId/members/:memberId/accept
   */
  public acceptInvite = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      const userId = typeof req.getSubject === "function" ? req.getSubject() : req.params.memberId;
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const { projectId} = req.params;
      const token = (req.query.token as string) || (req.body.token as string);
      if (!token) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Token is required", null, 400), res);
        return;
      }
      const result = await this.service.acceptInvite(projectId, userId,token);
      handleServiceResponse(result, res);
    });
  };

  /**
   * Từ chối lời mời vào project
   * POST /api/projects/:projectId/members/:memberId/reject
   */
  public rejectInvite = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      const userId = typeof req.getSubject === "function" ? req.getSubject() : req.params.memberId;
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const { projectId } = req.params;
      const token = (req.query.token as string) || (req.body.token as string);
      if (!token) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Token is required", null, 400), res);
        return;
      }
      const result = await this.service.rejectInvite(projectId, userId,token);
      handleServiceResponse(result, res);
    });
  };
  
  public cancelInvite = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      const { projectId,memberId } = req.params;
      const result = await this.service.cancelInvite(projectId,memberId, userId);
      handleServiceResponse(result, res);
    });
  }
  
  public removeMember = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),res);
        return;
      }

      const { projectId, memberId } = req.params;
      const result = await this.service.removeMember(projectId, memberId, userId);
      handleServiceResponse(result, res);
    });
  };

  /**
 * Thành viên rời khỏi dự án
 * POST /api/projects/:projectId/leave
 */
  public leaveProject = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async () => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      const { projectId } = req.params;
      const result = await this.service.leaveProject(projectId, userId);
      handleServiceResponse(result, res);
    });
  };
}