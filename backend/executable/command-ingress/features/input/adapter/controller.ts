import { Request, Response, NextFunction } from 'express';
import { HttpRequest } from "../../../types";
import { BaseController } from '../../../shared/base-controller';
import { InputHandleService } from '../domain/service';
import { handleServiceResponse } from '../../../services/httpHandlerResponse';
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { UploadedFile } from "express-fileupload";

export class InputHandleController extends BaseController {
  // Chỉ giữ lại service được inject qua constructor, xóa các khai báo thừa
  constructor(private service: InputHandleService) {
    super();
  }

  // Chuyển tất cả các phương thức thành arrow function `public myMethod = async (...) => { ... }`
  // để giải quyết triệt để lỗi `this` context

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
}