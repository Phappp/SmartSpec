import { Request, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import { ReadDocxService } from '../../handle_docx/domain/service';

// Import các model của bạn
const Project = require('../../../../../internal/model/project').default;
const Version = require('../../../../../internal/model/version').default;

/**
 * @class ReadDocxController
 * @description Xử lý yêu cầu upload và phân tích file DOCX với nhiều phương thức lấy ID.
 */
export class ReadDocxController {
    constructor(private readonly readDocxService: ReadDocxService) { }

    /**
     * @method processDocx
     * @description Nhận file docx và xử lý.
     * Chấp nhận project_id và version_id từ params, query, body, hoặc headers theo thứ tự ưu tiên.
     */
    async processDocx(req: Request, res: Response) {
        // --- 1. Lấy ID từ nhiều nguồn theo thứ tự ưu tiên ---
        // Sử dụng toán tử OR (||) để tạo chuỗi fallback.
        // Nó sẽ lấy giá trị đầu tiên không phải là null/undefined.
        const project_id = req.params.project_id || 
                             req.query.project_id as string || 
                             req.body.project_id || 
                             req.headers['x-project-id'] as string;

        const version_id = req.params.version_id || 
                             req.query.version_id as string || 
                             req.body.version_id || 
                             req.headers['x-version-id'] as string;

        // --- 2. Kiểm tra ID sau khi đã thử tất cả các nguồn ---
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
        const files = (req as Request & { files?: { docx?: UploadedFile | UploadedFile[] } }).files;
        if (!files || !files.docx) {
            return res.status(400).json({ 
                success: false, 
                error: 'Bad Request: No docx file was uploaded.' 
            });
        }

        try {
            // --- 4. Xác thực sự tồn tại của Project và Version ---
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
            
            // --- 5. Gọi Service để xử lý file ---
            const docxFiles = Array.isArray(files.docx) ? files.docx : [files.docx];
            const results = await this.readDocxService.handleDocxFiles(docxFiles, project_id, version_id);

            // --- 6. Cập nhật thông tin vào Version ---
            if (results.length > 0 && results.every(r => r.text)) {
                // const mergedText = results.map(r => r.text).join('\n\n');
                await Version.findByIdAndUpdate(version_id, {
                    $set: {
                        // merged_text: mergedText,
                        updated_at: new Date()
                    }
                });
            }

            // --- 7. Trả về kết quả thành công ---
            return res.status(200).json({
                success: true,
                message: 'File(s) processed and data updated successfully.',
                project_id,
                version_id,
                results
            });

        } catch (error: any) {
            console.error('Error processing DOCX file:', error);
            // Bắt lỗi nếu ID không hợp lệ (ví dụ: không phải ObjectId)
            if (error.kind === 'ObjectId') {
                 return res.status(400).json({ success: false, error: `Invalid ID format for: ${error.path}` });
            }
            return res.status(500).json({ 
                success: false, 
                error: error.message || 'An internal server error occurred.' 
            });
        }
    }
}