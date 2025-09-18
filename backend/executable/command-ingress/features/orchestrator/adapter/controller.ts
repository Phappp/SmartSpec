import { Request, Response } from 'express';
import { OrchestratorService } from '../domain/service';

export class OrchestratorController {
    constructor(private readonly service: OrchestratorService) { }

    async run(req: Request, res: Response) {
        const project_id = req.params.project_id || (req.query.project_id as string) || (req.body.project_id as string) || (req.headers['x-project-id'] as string);
        const version_id = req.params.version_id || (req.query.version_id as string) || (req.body.version_id as string) || (req.headers['x-version-id'] as string);
        const mode = (req.query.mode === 'incremental' ? 'incremental' : 'full') as 'full' | 'incremental';

        if (!project_id || !version_id) {
            return res.status(400).json({ success: false, error: 'Missing project_id or version_id' });
        }

        const rawText: string | undefined = req.body?.raw_text;
        const files = req.files && (req.files as any).files ? (Array.isArray((req.files as any).files) ? (req.files as any).files : [(req.files as any).files]) : [];

        if ((!rawText || rawText.trim().length === 0) && (!files || files.length === 0)) {
            return res.status(400).json({ success: false, error: 'Vui lòng gửi ít nhất một trong hai: raw_text hoặc files' });
        }

        if (!['full', 'incremental'].includes(mode)) {
            return res.status(400).json({ success: false, error: 'Mode phải là full hoặc incremental' });
        }

        try {
            const result = await this.service.run(project_id, version_id, {
                files,
                rawText,
                mode
            });

            return res.status(200).json({ success: true, data: result });
        } catch (e: any) {
            return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
        }
    }

    async resolveDuplicate(req: Request, res: Response) {
        const project_id = req.params.project_id || (req.query.project_id as string) || (req.body.project_id as string) || (req.headers['x-project-id'] as string);
        const version_id = req.params.version_id || (req.query.version_id as string) || (req.body.version_id as string) || (req.headers['x-version-id'] as string);
        const { conflict_id, keep } = req.body;

        if (!project_id || !version_id) {
            return res.status(400).json({ success: false, error: 'Missing project_id or version_id' });
        }

        if (!conflict_id || !['old', 'new'].includes(keep)) {
            return res.status(400).json({ success: false, error: 'Missing conflict_id or invalid keep value (old/new)' });
        }

        try {
            const result = await this.service.resolveDuplicate(version_id, conflict_id, keep);
            return res.status(200).json({ success: true, data: result });
        } catch (e: any) {
            return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
        }
    }
}


