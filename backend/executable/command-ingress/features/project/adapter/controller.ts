import { Request, Response, NextFunction, Router } from 'express';
import { BaseController } from '../../../shared/base-controller';
import { ProjectService, CreateProjectRequest, UpdateProjectRequest } from '../../project/domain/service';
import { handleServiceResponse } from '../../../services/httpHandlerResponse';
import { ResponseStatus, ServiceResponse } from '../../../services/serviceResponse';
import requireAuthorizedUser from '../../../middlewares/auth';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {CreateProjectDto,UpdateProjectDto} from '../adapter/dto'

export class ProjectController extends BaseController {
  private service: ProjectService;

  constructor(service: ProjectService) {
    super();
    this.service = service;
  }

  getMyProjects = async (
    req: Request & { getSubject?: () => string },
    res: Response,
    next: NextFunction
  ) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      console.log('userId:', userId);

      if (!userId) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),
          res
        );
        return;
      }
      const projects = await this.service.getMyProjects(userId);
      handleServiceResponse(new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200), res);
    });
  };

  createProject = async (req: Request & { getSubject?: () => string }, res: Response, next: NextFunction) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      if (!userId) {
        22
      }

      const dto = plainToClass(CreateProjectDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors.map((error: any) => Object.values(error.constraints || {}).join(', ')).join('; ');
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, errorMessages, null, 400), res);
        return;
      }

      const projectData: CreateProjectRequest = {
        name: dto.name,
        description: dto.description
      };

      const project = await this.service.createProject(userId, projectData);
      handleServiceResponse(new ServiceResponse(ResponseStatus.Success, 'Project created successfully', project, 201), res);
    });
  };

  updateProject = async (
    req: Request & { getSubject?: () => string },
    res: Response,
    next: NextFunction
  ) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),
          res
        );
        return;
      }

      const projectId = req.params.projectId;
      if (!projectId) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, 'Project ID is required', null, 400),
          res
        );
        return;
      }

      const dto = plainToClass(UpdateProjectDto, req.body);
      const errors = await validate(dto, { skipMissingProperties: true });

      if (errors.length > 0) {
        const errorMessages = errors
          .map((error: any) =>
            Object.values(error.constraints || {}).join(', ')
          )
          .join('; ');
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, errorMessages, null, 400),
          res
        );
        return;
      }

      // Loại bỏ field nhạy cảm
      const disallowedFields = ['_id', 'owner_id', 'created_at', 'updated_at'];
      const updateData: UpdateProjectRequest = {} as UpdateProjectRequest;
      Object.keys(dto).forEach((key) => {
        if (!disallowedFields.includes(key)) {
          (updateData as any)[key] = (dto as any)[key];
        }
      });

      const project = await this.service.updateProject(projectId, userId, updateData);

      if (!project) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, 'Project not found or access denied', null, 404),
          res
        );
        return;
      }

      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Success, 'Project updated successfully', project, 200),
        res
      );
    });
  };

  deleteProject = async (req: Request & { getSubject?: () => string }, res: Response, next: NextFunction) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      const projectId = req.params.projectId;
      if (!projectId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Project ID is required', null, 400), res);
        return;
      }

      const deleted = await this.service.deleteProject(projectId, userId);

      if (!deleted) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Project not found or access denied', null, 404), res);
        return;
      }

      res.status(204).send();
    });
  };

  restoreProject = async (
    req: Request & { getSubject?: () => string },
    res: Response,
    next: NextFunction
  ) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),
          res
        );
        return;
      }

      const projectId = req.params.projectId;
      if (!projectId) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, 'Project ID is required', null, 400),
          res
        );
        return;
      }

      const restored = await this.service.restoreProject(projectId, userId);

      if (!restored) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, 'Project not found, not trashed, or access denied', null, 404),
          res
        );
        return;
      }

      res.status(200).json(
        new ServiceResponse(ResponseStatus.Success, 'Project restored successfully', restored, 200)
      );
    });
  };

  getRecentProjects = async (
    req: Request & { getSubject?: () => string },
    res: Response,
    next: NextFunction
  ) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      console.log('userId:', userId);

      if (!userId) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),
          res
        );
        return;
      }

      const projects = await this.service.getRecentProjects(userId);
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200),
        res
      );
    });
  };

  getSharedProjects = async (
    req: Request & { getSubject?: () => string },
    res: Response,
    next: NextFunction
  ) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),
          res
        );
        return;
      }

      const projects = await this.service.getSharedProjects(userId);
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200),
        res
      );
    });
  };

}

