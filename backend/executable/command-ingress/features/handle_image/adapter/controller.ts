import { Request, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import { OcrService } from '../domain/service';
import Project from '../../../../../internal/model/project';
import Version from '../../../../../internal/model/version';

/**
 * @class OcrController
 * @description Xử lý yêu cầu upload và OCR file ảnh thành văn bản.
 */
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  /**
   * @method processImage
   * @description Nhận file image, xác thực, và gọi service OCR để xử lý.
   * Chấp nhận project_id và version_id từ params, query, body, hoặc headers.
   */
  async processImage(req: Request, res: Response): Promise<Response> {
    // --- 1. Lấy ID từ nhiều nguồn theo thứ tự ưu tiên ---
    const project_id = req.params.project_id ||
                       (req.query.project_id as string) ||
                       req.body.project_id ||
                       (req.headers['x-project-id'] as string);

    const version_id = req.params.version_id ||
                       (req.query.version_id as string) ||
                       req.body.version_id ||
                       (req.headers['x-version-id'] as string);

    // --- 2. Kiểm tra sự tồn tại của ID ---
    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: "Bad Request: Missing project_id. Provide it in URL params, query, body, or headers."
      });
    }
    if (!version_id) {
      return res.status(400).json({
        success: false,
        error: "Bad Request: Missing version_id. Provide it in URL params, query, body, or headers."
      });
    }

    // --- 3. Kiểm tra file upload ---
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.image) {
      return res.status(400).json({ 
        success: false, 
        error: "Bad Request: No image files were uploaded under the 'image' key." 
      });
    }

    try {
      // --- 4. Xác thực ID trong DB ---
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

      const imageFiles = Array.isArray(req.files.image)
        ? req.files.image
        : [req.files.image];

      // --- 5. Gọi Service xử lý ---
      const results = await this.ocrService.handleImages(
        imageFiles,
        project_id,
        version_id
      );

      // --- 6. Trả về kết quả ---
      return res.status(200).json({
        success: true,
        message: 'Image file(s) processed successfully.',
        project_id,
        version_id,
        results,
      });

    } catch (err) {
      const error = err as Error;
      console.error('[OcrController] Error:', error);

      if ((err as any).kind === 'ObjectId') {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid ID format for path: '${(err as any).path}'` 
        });
      }

      return res.status(500).json({
        success: false,
        error: error.message || 'An internal server error occurred.'
      });
    }
  }
}
