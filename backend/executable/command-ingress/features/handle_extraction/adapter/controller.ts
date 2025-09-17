import { Request, Response } from "express";
import { UploadedFile } from "express-fileupload";
import { ExtractorService } from "../domain/ExtractorService";
import Project from "../../../../../internal/model/project";
import Version from "../../../../../internal/model/version";

/**
 * @class ExtractorController
 * @description Xử lý các yêu cầu upload và trích xuất dữ liệu từ nhiều loại file.
 */

declare global {
  namespace Express {
    interface Request {
      files?: {
        [key: string]: UploadedFile | UploadedFile[];
      };
    }
  }
}

export class ExtractorController {
  // Sử dụng constructor để inject service, giúp code dễ test và nhất quán.
  constructor(private readonly extractorService: ExtractorService) {}

  /**
   * @method uploadAndExtract
   * @description Nhận file, xác thực, và gọi service để xử lý.
   * Chấp nhận project_id và version_id từ params, query, body, hoặc headers.
   */
  async uploadAndExtract(req: Request, res: Response) {
    // --- 1. Lấy ID từ nhiều nguồn theo thứ tự ưu tiên ---
    const project_id = req.params.project_id ||
                       req.query.project_id as string ||
                       req.body.project_id ||
                       req.headers['x-project-id'] as string;

    const version_id = req.params.version_id ||
                       req.query.version_id as string ||
                       req.body.version_id ||
                       req.headers['x-version-id'] as string;

    // --- 2. Kiểm tra sự tồn tại của ID ---
    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request: Missing project_id. Provide it in URL params, query, body, or headers.'
      });
    }
    if (!version_id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request: Missing version_id. Provide it in URL params, query, body, or headers.'
      });
    }

    // --- 3. Kiểm tra file upload ---
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.files) {
      return res.status(400).json({ success: false, error: "Bad Request: No files were uploaded under the 'files' key." });
    }

    try {
      // --- 4. Xác thực ID có tồn tại trong cơ sở dữ liệu ---
      const [projectExists, versionExists] = await Promise.all([
        Project.findById(project_id).lean(),
        Version.findById(version_id).lean()
      ]);

      if (!projectExists) {
        return res.status(404).json({
          success: false,
          error: `Not Found: Project with id '${project_id}' does not exist.`
        });
      }
      if (!versionExists) {
        return res.status(404).json({
          success: false,
          error: `Not Found: Version with id '${version_id}' does not exist.`
        });
      }

      const files = Array.isArray(req.files.files)
        ? req.files.files
        : [req.files.files];

      // --- 5. Gọi Service để xử lý trích xuất ---
      const results = await this.extractorService.extractFiles(
        files,
        project_id,
        version_id
      );

      // --- 6. Trả về kết quả thành công ---
      return res.status(200).json({
        success: true,
        message: 'Files extracted successfully.',
        project_id,
        version_id,
        results,
      });

    } catch (error: any) {
      // Log lỗi chi tiết ở server để debug
      console.error("[ExtractorController] uploadAndExtract error:", error);
      
      // Xử lý lỗi định dạng ID không hợp lệ
      if (error.kind === 'ObjectId') {
        return res.status(400).json({ success: false, error: `Invalid ID format for path: '${error.path}'` });
      }
      
      // Xử lý các lỗi 500 khác
      return res.status(500).json({
        success: false,
        error: error.message || 'An internal server error occurred.'
      });
    }
  }
}