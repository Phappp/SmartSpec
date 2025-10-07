// features/usecase/adapter/controller.ts
import { Request, Response, NextFunction } from 'express';
import { HttpRequest } from "../../../types";
import { BaseController } from '../../../shared/base-controller';
import { UsecaseService } from '../domain/service';
import { handleServiceResponse } from '../../../services/httpHandlerResponse';
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import { CreateUsecaseDto, UpdateUsecaseDto } from './dto';

export class UsecaseController extends BaseController {
  constructor(private service: UsecaseService) {
    super();
  }

  public addUsecaseToVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      const { versionId } = req.params;
      if (!versionId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Version ID is required', null, 400), res);
        return;
      }

      // BỎ VALIDATE - lấy trực tiếp từ body
      const dto: CreateUsecaseDto = req.body;

      const result = await this.service.addUsecaseToVersion(versionId, userId, dto);
      handleServiceResponse(result, res);
    });
  };

  public updateUsecaseInVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      const { versionId, usecaseId } = req.params;
      if (!versionId || !usecaseId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Version ID and Usecase ID are required', null, 400), res);
        return;
      }

      // BỎ VALIDATE - lấy trực tiếp từ body
      const dto: UpdateUsecaseDto = req.body;

      const result = await this.service.updateUsecaseInVersion(versionId, usecaseId, userId, dto);
      handleServiceResponse(result, res);
    });
  };

  public deleteUsecaseFromVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      const { versionId, usecaseId } = req.params;
      if (!versionId || !usecaseId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Version ID and Usecase ID are required', null, 400), res);
        return;
      }

      const result = await this.service.deleteUsecaseFromVersion(versionId, usecaseId, userId);
      handleServiceResponse(result, res);
    });
  };

  public getUsecasesByVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      const { versionId } = req.params;
      if (!versionId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Version ID is required', null, 400), res);
        return;
      }

      const result = await this.service.getUsecasesByVersion(versionId, userId);
      handleServiceResponse(result, res);
    });
  };

  async deleteConflicts(req: Request, res: Response, next: NextFunction) {
    try {
      const { versionId, conflictId } = req.params;
      await this.service.deleteConflicts(versionId, conflictId);
      // Trả về status 204 No Content khi xóa thành công
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}