import { Response, NextFunction } from "express";
import { HttpRequest } from "../../../types";
import { BaseController } from "../../../shared/base-controller";
import { VersionService } from "../domain/service";
import { handleServiceResponse } from "../../../services/httpHandlerResponse";
import { ServiceResponse, ResponseStatus } from "../../../services/serviceResponse";
import { PreviewChangeDto } from "../adapter/preview.dto";

export class VersionController extends BaseController {
  private service: VersionService;

  constructor(service: VersionService) {
    super();
    this.service = service;
  }
  /**
   * 📄 Lấy danh sách version theo project
   */
  public getVersionsByProject = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }
      const projectId = req.params.projectId;
      if (!projectId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Missing projectId", null, 400), res);
        return;
      }
      const result = await this.service.getVersionsByProject(projectId);
      handleServiceResponse(result, res);
    });
  };

  /**
   * 📘 Lấy chi tiết version
   */
  public setCurrentVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Unauthorized', null, 401), res);
        return;
      }

      const { projectId, versionId } = req.params;
      if (!projectId || !versionId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, 'Project ID and Version ID are required', null, 400), res);
        return;
      }

      // Gọi xuống service để thực hiện cập nhật
      const result = await this.service.setCurrentVersion(projectId, versionId, userId);
      handleServiceResponse(result, res);
    });
  };
  public deleteVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      const { versionId } = req.params;

      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      if (!versionId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Missing versionId", null, 400), res);
        return;
      }

      const result = await this.service.deleteVersion(versionId, userId);
      handleServiceResponse(result, res);
    });
  };

  /**
   * 🧩 Tạo hoặc cập nhật Preview từ thay đổi
   */
  public createOrUpdatePreview = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const userId = req.getSubject();
      const { versionId } = req.params;
      const { change } = req.body;
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }
      if (!versionId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Missing required version_id", null, 400), res);
        return;
      }
      if (!change) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Missing required change", null, 400), res);
        return;
      }

      const result = await this.service.createOrUpdatePreview(versionId, userId, change);
      handleServiceResponse(result, res);
    });
  };

  /**
   * 📋 Lấy preview tất cả outputs của version
   */
  public getPreview = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }
      const { versionId } = req.params;
      if (!versionId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Missing versionId", null, 400), res);
        return;
      }
      const result = await this.service.getPreview(versionId);
      handleServiceResponse(result, res);
    });
  };

  public approve = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req, res) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      const { versionId } = req.params;
      const { changeType = "minor", comment } = req.body;

      if (!versionId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Missing baseVersionId", null, 400), res);
        return;
      }

      const result = await this.service.approve(versionId, userId, changeType, comment);
      handleServiceResponse(result, res);
    });
  };

  /**
   * 🚀 Upgrade version với preview (nhận changeType từ bên ngoài)
   */
  public bumpVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      const { previewId } = req.params;
      const changeType = (req.query.changeType as "major" | "minor") || (req.body.changeType as "major" | "minor") || "minor";

      if (!previewId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Missing previewId", null, 400), res);
        return;
      }
      const result = await this.service.bumpVersion(previewId, userId, changeType);
      handleServiceResponse(result, res);
    });
  };

  public revertChangeController = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      const { versionId } = req.params;
      const { changeId } = req.params;

      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      if (!versionId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Missing versionId", null, 400), res);
        return;
      }

      if (!changeId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Missing changeId", null, 400), res);
        return;
      }
      const result = await this.service.revertChange(versionId, userId, changeId);
      handleServiceResponse(result, res);
    });
  };

  public markEditingController = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }
      const { versionId } = req.params;

      const result = await this.service.markEditing(versionId, userId);

      res.status(result.code || 200).json(result);
    });
  };
  public markLockedController = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }
      const { versionId } = req.params;
      const result = await this.service.markLocked(versionId, userId);
      res.status(result.code || 200).json(result);
    });
  };
  // file: controller.ts
  public rollbackVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      const { versionId } = req.params;

      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      if (!versionId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Missing versionId", null, 400), res);
        return;
      }

      const result = await this.service.rollbackVersion(versionId, userId);
      handleServiceResponse(result, res);
    });
  };
} 