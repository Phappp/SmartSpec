 import { Response, NextFunction } from "express";
import { HttpRequest } from "../../../types";
import { BaseController } from "../../../shared/base-controller";
import { VersionService } from "../domain/service";
import { handleServiceResponse } from "../../../services/httpHandlerResponse";
import { ServiceResponse, ResponseStatus } from "../../../services/serviceResponse";

export class VersionController extends BaseController {
  private service: VersionService;

  constructor(service: VersionService) {
    super();
    this.service = service;
  }

  /**
   * 📘 Tạo version mới từ version hiện tại
   */
  public bumpVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      const baseVersionId = req.params.versionId;
      const changeType = (req.query.changeType as "major" | "minor") || "minor";


      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      const result = await this.service.bumpVersion(baseVersionId, userId, changeType);
      handleServiceResponse(result, res);
    });
  };

  /**
   * ♻️ Rollback version
   */
  public rollbackVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      const { targetVersionId, description } = req.body;

      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      // const result = await this.service.rollbackVersion(targetVersionId, userId, description);
      // handleServiceResponse(result, res);
    });
  };

  /**
   * 🔍 So sánh hai version
   */
  public compareVersions = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const { v1Id, v2Id } = req.query as { v1Id: string; v2Id: string };
      // const result = await this.service.compareVersions(v1Id, v2Id);
      //handleServiceResponse(result, res);
    });
  };

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
  public getVersionDetail = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
            return;
        }
      const versionId = req.params.versionId;
      // const result = await this.service.getVersionDetail(versionId);
      //handleServiceResponse(result, res);
    });
  };

  /**
   * ✅ Đánh dấu version là ổn định
   */
  public markVersionAsStable = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      const { versionId } = req.body;
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      // const result = await this.service.markVersionAsStable(versionId, userId);
      //handleServiceResponse(result, res);
    });
  };

  /**
   * 🔒 Khóa version
   */
  public lockVersion = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      const { versionId } = req.body;

      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      // const result = await this.service.lockVersion(versionId, userId);
      //handleServiceResponse(result, res);
    });
  };

  /**
   * ⚙️ Tự động bump version khi có thay đổi
   */
  public autoBumpVersionOnChange = async (req: HttpRequest, res: Response, next: NextFunction) => {
    await this.execWithTryCatchBlock(req, res, next, async (req: HttpRequest, res: Response) => {
      const userId = req.getSubject();
      const { versionId, changeLevel } = req.body;

      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      const result = await this.service.autoBumpVersionOnChange(versionId, userId, changeLevel);
      handleServiceResponse(result, res);
    });
  };
} 