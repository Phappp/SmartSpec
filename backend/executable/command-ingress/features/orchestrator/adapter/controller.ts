import { Request, Response } from 'express';
import { HttpRequest } from "../../../types";
import { OrchestratorService } from '../domain/service';
import Project from "../../../../../internal/model/project";
import Version from '../../../../../internal/model/version';
import User from '../../../../../internal/model/user';

export class OrchestratorController {
    constructor(private readonly service: OrchestratorService) { }

    async run(req: HttpRequest, res: Response) {
        const project_id = req.params.project_id || (req.query.project_id as string) || (req.body.project_id as string) || (req.headers['x-project-id'] as string);
        const version_id = req.params.version_id || (req.query.version_id as string) || (req.body.version_id as string) || (req.headers['x-version-id'] as string);
        const mode = (req.query.mode === 'incremental' ? 'incremental' : 'full') as 'full' | 'incremental';
        const userId = (req as any).user?.id || req.headers['x-user-id'] as string;

        if (!project_id || !version_id) {
            return res.status(400).json({ success: false, error: 'Missing project_id or version_id' });
        }
        if (!userId) {
            return res.status(400).json({ success: false, error: 'Missing user identification' });
        }

        const project = await Project.findById(project_id).lean();
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const language = project.language;
        const rawText: string | undefined = req.body?.raw_text;
        const files = req.files && (req.files as any).files ? (Array.isArray((req.files as any).files) ? (req.files as any).files : [(req.files as any).files]) : [];

        // THAY ĐỔI: Sửa lại logic validation để cho phép "Retry" (request không có body)
        const isRetryOrIncremental = (!rawText || rawText.trim().length === 0) && (!files || files.length === 0);

        if (isRetryOrIncremental) {
            console.log("Request is either a Retry or an incremental run on existing data.");
        } else {
            console.log("Request contains new data for processing.");
        }
        // Khối validation cũ đã được loại bỏ để cho phép request đi tiếp.

        if (!['full', 'incremental'].includes(mode)) {
            return res.status(400).json({ success: false, error: 'Mode phải là full hoặc incremental' });
        }
        
        // ✅ QUAN TRỌNG: Kiểm tra xem version đang processing không để tránh chạy đồng thời
        const currentVersion = await Version.findById(version_id).lean();
        if (currentVersion && (currentVersion as any).is_processing === true) {
            console.warn(`⚠️ Version ${version_id} is already processing. Rejecting concurrent request.`);
            return res.status(409).json({ 
                success: false, 
                error: 'Version is already being processed. Please wait for the current process to complete.' 
            });
        }
        
        // const userId = req.getSubject();
        try {
            // Không `await` ở đây để nó chạy nền và trả về response ngay lập tức
            // Nhưng cần catch lỗi để log và đảm bảo version status được cập nhật
            this.service.run(project_id, version_id, {
                files,
                rawText,
                mode
            }, language, userId).catch((error: any) => {
                // Log lỗi để debug
                console.error("❌ Error in background processing:", error);
                // Version status đã được cập nhật thành "failed" trong service.run()
                // Frontend sẽ nhận được thông báo lỗi qua polling status
            });

            // Trả về response ngay lập tức để không bắt người dùng chờ
            return res.status(202).json({ success: true, message: 'Processing started. Check status for results.' });
        } catch (e: any) {
            // Lỗi xảy ra trước khi service.run() được gọi (validation, etc.)
            console.error("❌ Error before processing:", e);
            return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
        }
    }
    // Hàm RETRY chuyên dụng
    async retryProjectAnalysis(req: HttpRequest, res: Response) {
        try {
            const { project_id, version_id } = req.params;
            const userId = (req as any).user?.id || req.headers['x-user-id'] as string;

            if (!project_id || !version_id) {
                return res.status(400).json({ success: false, error: 'Missing project_id or version_id' });
            }
            if (!userId) {
                return res.status(400).json({ success: false, error: 'Missing user identification' });
            }
            const project = await Project.findById(project_id).lean();
            if (!project) {
                return res.status(404).json({ success: false, error: 'Project not found' });
            }

            // ✅ QUAN TRỌNG: Kiểm tra xem version đang processing không
            const currentVersion = await Version.findById(version_id).lean();
            if (currentVersion && (currentVersion as any).is_processing === true) {
                console.warn(`⚠️ Version ${version_id} is already processing. Rejecting retry request.`);
                return res.status(409).json({ 
                    success: false, 
                    error: 'Version is already being processed. Please wait for the current process to complete.' 
                });
            }

            const language = project.language;
            // const userId = req.getSubject();
            
            // Chạy nền với mode 'full' và không có dữ liệu mới
            // Service sẽ tự động dọn dẹp kết quả cũ và set is_processing
            this.service.run(
                project_id,
                version_id,
                { files: [], rawText: '', mode: 'full' },
                language,
                userId 
            ).catch((error: any) => {
                // Log lỗi để debug
                console.error("❌ Error in retry background processing:", error);
                // Version status đã được cập nhật thành "failed" trong service.run()
                // Frontend sẽ nhận được thông báo lỗi qua polling status
            });

            return res.status(202).json({ success: true, message: 'Retry process started.' });

        } catch (e: any) {
            return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
        }
    }

    /**
     * HÀM MỚI: Xử lý request tìm kiếm xung đột.
     */
    async findConflicts(req: Request, res: Response) {
        try {
            const { version_id, project_id } = req.params;
            const project = await Project.findById(project_id).lean();
            if (!project) {
                return res.status(404).json({ success: false, error: 'Project not found' });
            }
            const result = await this.service.findConflicts(version_id, project.language);
            return res.status(200).json({ success: true, data: result });
        } catch (e: any) {
            return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
        }
    }
    /**
     * HÀM ĐÃ SỬA: Xử lý request giải quyết xung đột.
     */
    async resolveConflict(req: Request, res: Response) {
        try {
            const { version_id } = req.params;
            const { conflict_id, keep_use_case_id } = req.body;

            if (!conflict_id || !keep_use_case_id) {
                return res.status(400).json({ success: false, error: 'Missing conflict_id or keep_use_case_id' });
            }

            const result = await this.service.resolveConflict(version_id, conflict_id, keep_use_case_id);
            return res.status(200).json({ success: true, data: result });
        } catch (e: any) {
            return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
        }
    }
}


