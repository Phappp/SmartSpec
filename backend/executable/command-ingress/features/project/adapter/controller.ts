import { Request, Response, NextFunction, Router } from 'express';
import { BaseController } from '../../../shared/base-controller';
import { ProjectService} from '../../project/domain/service';
import { handleServiceResponse } from '../../../services/httpHandlerResponse';
import { ResponseStatus, ServiceResponse } from '../../../services/serviceResponse';
import requireAuthorizedUser from '../../../middlewares/auth';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {CreateProjectDto,UpdateProjectDto,CreateProjectRequest,UpdateProjectRequest} from '../adapter/dto'
import Project from '../../../../../internal/model/project'; 
import Input from '../../../../../internal/model/input';
import Output from '../../../../../internal/model/output';
import Version from '../../../../../internal/model/Version';
import ProjectLog from '../../../../../internal/model/projectLog';

export class ProjectController extends BaseController {
  private service: ProjectService;

  constructor(service: ProjectService) {
    super();
    this.service = service;
  }

  getMyProjects = async (req: Request & { getSubject?: () => string },res: Response,next: NextFunction) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),res);
        return;
      }
      const projects = await this.service.getMyProjects(userId);
      handleServiceResponse(new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200), res);
    });
  };

  createProject = async (req: Request & { getSubject?: () => string },res: Response,next: NextFunction) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),res);
        return;
      }
      const dto = plainToClass(CreateProjectDto, req.body);
      const projectData: CreateProjectRequest = {
        name: dto.name,
        description: dto.description,
      };

      const project = await this.service.createProject(userId, projectData);
      handleServiceResponse(new ServiceResponse(ResponseStatus.Success, "Project created", project, 201),res);
    });
  };

  createProjectWithInput = async (req: Request & { getSubject?: () => string },res: Response,next: NextFunction) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),res);
        return;
      }

      const dto = plainToClass(CreateProjectDto, req.body);
      //Tạo dự án
      const project = await this.service.createProject(userId, {
        name: dto.name,
        description: dto.description,
      });

      const files = req.files as Express.Multer.File[] | undefined;
      const text = req.body.text as string | undefined;
      //Tạo input với dự án vừa được tạo
      try {
        // await inputService.addInputs({
        //   projectId: project._id,
        //   versionId: project.current_version,
        //   files,
        //   text,
        // });
      } catch (err) {
        // rollback nếu input lỗi
        await Version.deleteMany({ project_id: project._id });
        await Input.deleteMany({ project_id: project._id });
        await ProjectLog.deleteMany({ project_id: project._id });
        await Project.findByIdAndDelete(project._id);
        throw err;
      }
      handleServiceResponse(new ServiceResponse(ResponseStatus.Success, "Tạo dự án với input", project, 201),res);
    });
  };

  updateProject = async (req: Request & { getSubject?: () => string },res: Response,next: NextFunction) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),res);
        return;
      }

      const projectId = req.params.projectId;
      if (!projectId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Project ID is required', null, 400),res);
        return;
      }
      
      const dto = plainToClass(UpdateProjectDto, req.body);
      const errors = await validate(dto, { skipMissingProperties: true });
      if (errors.length > 0) {
        const errorMessages = errors
          .map((error: any) =>
            Object.values(error.constraints || {}).join(', ')
          ).join('; ');
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, errorMessages, null, 400),res);
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
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Project not found or access denied', null, 404),res);
        return;
      }
      handleServiceResponse(new ServiceResponse(ResponseStatus.Success, 'Project updated successfully', project, 200),res);
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
      handleServiceResponse(new ServiceResponse(ResponseStatus.Success, "Project deleted successfully", null, 204),res);
    });
  };

  restoreProject = async (req: Request & { getSubject?: () => string },res: Response,next: NextFunction) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),res);
        return;
      }

      const projectId = req.params.projectId;
      if (!projectId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Project ID is required', null, 400),res);
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
      handleServiceResponse(new ServiceResponse(ResponseStatus.Success, "Project restored successfully", null, 200),res);
    });
  };

  getRecentProjects = async (req: Request & { getSubject?: () => string },res: Response,next: NextFunction) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),res);
        return;
      }

      const projects = await this.service.getRecentProjects(userId);
      handleServiceResponse( new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200),res
      );
    });
  };

  getSharedProjects = async (req: Request & { getSubject?: () => string },res: Response,next: NextFunction) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),res);
        return;
      }

      const projects = await this.service.getSharedProjects(userId);
      handleServiceResponse(new ServiceResponse(ResponseStatus.Success, 'OK', projects, 200),res);
    });
  };

  getProjectDetail = async (req: Request & { getSubject?: () => string },res: Response,next: NextFunction) => {
    return this.execWithTryCatchBlock(req as any, res, next, async (_req, _res) => {
      const projectId = req.params.projectId;
      const userId = req.getSubject?.();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401),res);
      }

      const project = await this.service.getProjectDetail(projectId, userId);

      // Luôn return đầy đủ các trường: current_version, inputs, outputs, versions, chatLogs
      handleServiceResponse(new ServiceResponse(ResponseStatus.Success, 'OK', {
        project: project.project,
        current_version: project.current_version,
        inputs: project.inputs,
        outputs: project.outputs,
        versions: project.versions,
        chatLogs: project.chatLogs,
      }, 200),res);
    });
  };
}

