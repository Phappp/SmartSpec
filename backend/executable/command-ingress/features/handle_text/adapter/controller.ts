import { Request, Response } from 'express';
import { TextService } from '../../handle_text/domain/service';
import Project from '../../../../../internal/model/project';
import Version from '../../../../../internal/model/version';

export class TextController {
    constructor(private readonly textService: TextService) { }

    async createText(req: Request, res: Response) {
        const project_id = req.params.project_id || (req.query.project_id as string) || (req.body.project_id as string) || req.headers['x-project-id'] as string;
        const version_id = req.params.version_id || (req.query.version_id as string) || (req.body.version_id as string) || req.headers['x-version-id'] as string;
        const { raw_text, language } = req.body || {};

        if (!project_id || !version_id) {
            return res.status(400).json({ success: false, error: 'Missing project_id or version_id' });
        }
        if (typeof raw_text !== 'string' || raw_text.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'raw_text must be a non-empty string' });
        }

        try {
            const [projectExists, versionExists] = await Promise.all([
                Project.findById(project_id).lean(),
                Version.findById(version_id).lean()
            ]);
            if (!projectExists) return res.status(404).json({ success: false, error: `Project ${project_id} not found` });
            if (!versionExists) return res.status(404).json({ success: false, error: `Version ${version_id} not found` });

            const saved = await this.textService.saveText(raw_text, project_id, version_id, { language });

            // Trả về thông báo khác nhau tùy vào việc tạo mới hay cập nhật
            const message = saved.isNew ? 'Text created successfully' : 'Text updated successfully';

            return res.status(201).json({
                success: true,
                input_id: saved._id,
                message,
                action: saved.isNew ? 'created' : 'updated'
            });
        } catch (e: any) {
            return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
        }
    }
}