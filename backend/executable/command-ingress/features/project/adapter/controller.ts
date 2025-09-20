import { Request, Response, NextFunction } from 'express';
import { HttpRequest } from "../../../types";
import { BaseController } from '../../../shared/base-controller';
import { ProjectService } from '../domain/service';
import { handleServiceResponse } from '../../../services/httpHandlerResponse';
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateProjectDto, UpdateProjectDto } from '../adapter/dto';
import { UploadedFile } from "express-fileupload";

export class ProjectController extends BaseController {
  // Chỉ giữ lại service được inject qua constructor, xóa các khai báo thừa
  constructor(private service: ProjectService) {
    super();
  }

  // Chuyển tất cả các phương thức thành arrow function `public myMethod = async (...) => { ... }`
  // để giải quyết triệt để lỗi `this` context

  public getMyProjects = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const result = await this.service.getMyProjects(userId);
      handleServiceResponse(result, res);
    });
  };

  public createProject = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const ownerId = req.getSubject();
      if (!ownerId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      const dto = plainToClass(CreateProjectDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const errorMessages = errors.map(e => Object.values(e.constraints || {})).flat().join('; ');
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, errorMessages, null, 400), res);
        return;
      }

      let files: UploadedFile[] = [];
      if (req.files && req.files.files) {
        files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
      }

      const result = await this.service.createProject(dto, ownerId, files);
      handleServiceResponse(result, res);
    });
  };

  public updateProject = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const projectId = req.params.projectId;

      const dto = plainToClass(UpdateProjectDto, req.body);
      const errors = await validate(dto, { skipMissingProperties: true });
      if (errors.length > 0) {
        const errorMessages = errors.map(e => Object.values(e.constraints || {})).flat().join('; ');
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, errorMessages, null, 400), res);
        return;
      }

      const result = await this.service.updateProject(projectId, userId, dto);
      handleServiceResponse(result, res);
    });
  };

  public deleteProject = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const projectId = req.params.projectId;
      const result = await this.service.deleteProject(projectId, userId);
      handleServiceResponse(result, res);
    });
  };

  public restoreProject = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const projectId = req.params.projectId;
      const result = await this.service.restoreProject(projectId, userId);
      handleServiceResponse(result, res);
    });
  };

  public getRecentProjects = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const result = await this.service.getRecentProjects(userId);
      handleServiceResponse(result, res);
    });
  };

  public getSharedProjects = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const result = await this.service.getSharedProjects(userId);
      handleServiceResponse(result, res);
    });
  };

  public getProjectDetail = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const projectId = req.params.projectId;
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const result = await this.service.getProjectDetail(projectId, userId);
      handleServiceResponse(result, res);
    });
  };

  public getVersionStatus = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const { versionId } = req.params;
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }
      const result = await this.service.getVersionStatus(versionId);
      handleServiceResponse(result, res);
    });
  };
}