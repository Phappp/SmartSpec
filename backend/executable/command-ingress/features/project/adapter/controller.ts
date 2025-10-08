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
      handleServiceResponse(new ServiceResponse(ResponseStatus.Success, "Project deleted successfully", null, 204), res);
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

  public getDeleteProjects = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      // Gọi service và nhận về ServiceResponse
      const result = await this.service.getDeleteProjects(userId);

      // Chuyển tiếp kết quả cho handler
      handleServiceResponse(result, res);
    });
  };

  public addInputsToVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      // 1. Lấy userId từ authentication context
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      // 2. Lấy versionId từ URL params
      const { versionId } = req.params;
      if (!versionId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Version ID is required in URL parameters', null, 400), res);
        return;
      }

      // 3. Lấy rawText từ body (nếu có)
      const { rawText } = req.body;

      // 4. Lấy và chuẩn hóa file từ req.files (giống hệt createProject)
      let files: UploadedFile[] = [];
      if (req.files && req.files.files) {
        files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
      }

      // 5. Kiểm tra xem người dùng có cung cấp input nào không
      if (files.length === 0 && (!rawText || rawText.trim() === '')) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'No files or raw text provided', null, 400), res);
        return;
      }

      // 6. Gọi đến service với các tham số đã thu thập
      // Giả định rằng ProjectService đã có phương thức này
      const result = await this.service.addInputsToVersion(
        versionId,
        userId,
        files.length > 0 ? files : undefined,
        rawText
      );

      // 7. Gửi kết quả về cho client
      handleServiceResponse(result, res);
    });
  };

  public deleteUnprocessedInputs = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      // 1. Lấy userId
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      // 2. Lấy versionId từ URL
      const { versionId } = req.params;
      if (!versionId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Version ID is required', null, 400), res);
        return;
      }

      // 3. Gọi service để thực hiện logic
      const result = await this.service.deleteUnprocessedInputs(versionId, userId);

      // 4. Trả về kết quả
      handleServiceResponse(result, res);
    });
  };

  public deleteSpecificInput = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      // Lấy cả versionId và inputId từ URL params
      const { versionId, inputId } = req.params;
      if (!versionId || !inputId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Version ID and Input ID are required', null, 400), res);
        return;
      }

      const result = await this.service.deleteSpecificInput(versionId, inputId, userId);
      handleServiceResponse(result, res);
    });
  };

  public getAllProjectsForAdmin = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      // 🔐 Kiểm tra quyền admin
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(
          new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401),
          res
        );
        return;
      }

      // (Tuỳ chọn) kiểm tra role admin nếu User có field roles
      // const user = await User.findById(userId);
      // if (!user || !user.roles?.includes('admin')) {
      //   handleServiceResponse(
      //     new ServiceResponse(ResponseStatus.Failed, "Access denied", null, 403),
      //     res
      //   );
      //   return;
      // }

      const result = await this.service.getAllProjectsForAdmin();
      handleServiceResponse(result, res);
    });
  };

  // public suggestRelations = async (req: HttpRequest, res: Response, next: NextFunction) => {
  //   await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
  //     const { versionId } = req.params;
  //     const userId = req.getSubject();
  //     if (!userId) {
  //       handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
  //       return;
  //     }
  //     // Gọi service và trả về response ngay lập tức
  //     const result = await this.service.suggestRelations(versionId);
  //     handleServiceResponse(result, res);
  //   });
  // };
}