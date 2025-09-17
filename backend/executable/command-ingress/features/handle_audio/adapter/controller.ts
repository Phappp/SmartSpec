import { Request, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import { SpeechToTextService } from '../../handle_audio/domain/service';
import Project from '../../../../../internal/model/project';
import Version from '../../../../../internal/model/version';

/**
 * @class SpeechController
 * @description Xử lý yêu cầu upload và chuyển đổi file âm thanh thành văn bản.
 */
export class SpeechController {
  constructor(private readonly speechService: SpeechToTextService) { }

  /**
   * @method uploadAudio
   * @description Nhận file audio, xác thực, và gọi service để xử lý.
   * Chấp nhận project_id và version_id từ params, query, body, hoặc headers.
   */
  async uploadAudio(req: Request, res: Response): Promise<Response> {
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
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.audio) {
      return res.status(400).json({ success: false, error: "Bad Request: No audio files were uploaded under the 'audio' key." });
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

      const audioFiles = Array.isArray(req.files.audio)
        ? req.files.audio
        : [req.files.audio];

      // --- 5. Gọi Service để xử lý ---
      // Chỉ truyền vào 2 ID đã được xác thực cuối cùng
      const results = await this.speechService.handleAudio(
        audioFiles,
        project_id,
        version_id
      );

      // --- 6. Cập nhật thông tin vào Version ---
      if (results.length > 0 && results.every(r => r.text)) {
        const mergedText = results.map(r => r.text).join('\n\n');
        await Version.findByIdAndUpdate(version_id, {
          $set: {
            merged_text: mergedText,
            updated_at: new Date()
          }
        });
      }

      // --- 7. Trả về kết quả thành công ---
      return res.status(200).json({
        success: true,
        message: 'Audio file(s) processed successfully.',
        project_id,
        version_id,
        results,
      });

    } catch (err) {
      const error = err as Error;
      console.error('[SpeechController] Error:', error);

      // Xử lý lỗi định dạng ID không hợp lệ
      if ((err as any).kind === 'ObjectId') {
        return res.status(400).json({ success: false, error: `Invalid ID format for path: '${(err as any).path}'` });
      }

      return res.status(500).json({
        success: false,
        error: error.message || 'An internal server error occurred.'
      });
    }
  }
}