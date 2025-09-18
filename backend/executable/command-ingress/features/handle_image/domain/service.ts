// features/ocr/domain/service.ts
import { UploadedFile } from 'express-fileupload';
import path from 'path';
import fs from 'fs/promises';
import fsExtra from 'fs-extra';
import { spawn } from 'child_process';
import InputModel from '../../../../../internal/model/input';
import VersionModel from '../../../../../internal/model/version';


export class OcrService {
    private enqueueRefineJob(inputId: string, provider: 'gemini' | 'openai' | 'claude' = 'gemini') {
        import('../../handle_extraction/index')
            .then((m) => m.refineInputById(inputId, provider))
            .catch((err) => console.error('[refine] image error', err?.message || err));
    }
    /**
     * @method saveDocumentToDB
     * @description Lưu dữ liệu image đã xử lý vào database theo chuẩn chung
     */
    async saveDocumentToDB(data: {
        projectId: string;
        versionId: string;
        type: string;
        originalFilename: string;
        mimeType: string;
        rawText: string;
        metadata: any;
        confidenceScore: number;
        cleanedText?: string;
        language?: string;
        pipelineSteps?: any;
        processingStatus: string;
    }) {
        const input = new InputModel({
            project_id: data.projectId,
            version_id: data.versionId,
            type: data.type,
            original_filename: data.originalFilename,
            mime_type: data.mimeType,
            raw_text: data.rawText,
            cleaned_text: data.rawText,
            metadata: data.metadata,
            confidence_score: data.confidenceScore,
            quality_score: data.confidenceScore,
            processing_status: data.processingStatus,
            language: data.language,
            pipeline_steps: data.pipelineSteps
        });

        return await input.save();
    }

    async handleImages(
        images: UploadedFile[],
        projectId: string,
        versionId: string
    ): Promise<any> {
        const uploadDir = path.join(__dirname, '../../../uploads_ocr');
        await fs.mkdir(uploadDir, { recursive: true });

        const savedPaths: string[] = [];
        for (const img of images) {
            const mime = (img as any).mimetype || '';
            const isImageMime = typeof mime === 'string' && mime.startsWith('image/');
            let ext = path.extname(img.name || '').toLowerCase();
            if (!ext && isImageMime) {
                const mimeToExt: Record<string, string> = {
                    'image/jpeg': '.jpg',
                    'image/jpg': '.jpg',
                    'image/png': '.png',
                    'image/webp': '.webp',
                    'image/bmp': '.bmp',
                    'image/tiff': '.tiff',
                    'image/gif': '.gif',
                };
                ext = mimeToExt[mime] || '.png';
            }
            const base = path.basename(img.name || `image${ext}`, path.extname(img.name || '')) || 'image';
            const safeBase = base.replace(/[^\w.-]/g, '_');
            const filename = `${safeBase}${ext}`;
            const savePath = path.join(uploadDir, filename);
            await img.mv(savePath);
            savedPaths.push(savePath);
        }

        const result = await this.runOCR(savedPaths);

        // ✅ Lưu vào MongoDB
        const docs = [];
        for (let i = 0; i < savedPaths.length; i++) {
            const img = images[i];
            const res = result[i]; // OCR script trả về JSON

            const metadata = {
                file_path: savedPaths[i],
                file_size: img.size,
                language: res?.language || null,
                pages: 1,
                is_scanned: true,
                created: new Date(),
                modified: new Date(),
                paragraphs_count: 0,
                tables_count: 0,
                headers: [],
                footers: []
            };

            const rawConfidence: number =
                (res?.confidence_score ?? res?.quality_score ?? res?.confidence ?? 0);
            const normalizedConfidence =
                rawConfidence > 1 ? Math.min(1, rawConfidence / 100) : Math.max(0, rawConfidence || 0);

            const savedDoc = await this.saveDocumentToDB({
                projectId,
                versionId,
                type: 'image',
                originalFilename: img.name,
                mimeType: img.mimetype,
                rawText: res?.raw_text || '',
                metadata,
                confidenceScore: normalizedConfidence,
                cleanedText: res?.raw_text || '',
                language: res?.language || null,
                pipelineSteps: { preprocessing: true, ocr: true },
                processingStatus: res?.error ? 'failed' : 'extracted'
            });

            docs.push(savedDoc);

            // 🔗 Link vào Version.inputs
            await VersionModel.findByIdAndUpdate(versionId, {
                $push: { inputs: savedDoc._id },
                $set: { updated_at: new Date() }
            });

            // 📝 Append text vào merged_text
            // if (res?.raw_text && res.raw_text.trim().length > 0) {
            //     try {
            //         const current = await VersionModel.findById(versionId).lean();
            //         const merged = [current?.merged_text || '', res.raw_text]
            //             .filter(Boolean)
            //             .join('\n\n');
            //         await VersionModel.findByIdAndUpdate(versionId, {
            //             $set: { merged_text: merged, updated_at: new Date() }
            //         });
            //     } catch (err) {
            //         console.error('[OcrService] Merge text error:', err);
            //     }
            // }

            if (!res?.error && savedDoc?._id) {
                this.enqueueRefineJob(String(savedDoc._id), 'gemini');
            }
        }


        // 🧹 Dọn thư mục tạm
        try {
            await fsExtra.emptyDir(uploadDir);
        } catch (e) {
            console.warn('⚠️ Không thể dọn thư mục uploads_ocr:', e);
        }

        return docs;
    }

    private async runOCR(imagePaths: string[]): Promise<any[]> {
        const scriptPath = path.join(__dirname, '../pythonScript/process_OCR.py');
        const args = [scriptPath, ...imagePaths];

        return new Promise((resolve, reject) => {
            const python = spawn('python', args);

            let result = '';
            let error = '';

            python.stdout.on('data', (data) => result += data.toString());
            python.stderr.on('data', (data) => error += data.toString());

            python.on('close', (code) => {
                if (code !== 0) {
                    return reject(new Error(error || `OCR script exited with code ${code}`));
                }
                try {
                    const parsed = JSON.parse(result);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Invalid JSON from OCR script'));
                }
            });

            python.on('error', (err) => reject(err));
        });
    }
}
