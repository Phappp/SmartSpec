import { UploadedFile } from 'express-fileupload';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
const Input = require('../../../../../internal/model/input').default;
const Version = require('../../../../../internal/model/version').default;

export class ReadDocxService {
    async handleDocxFiles(docxFiles: UploadedFile[], projectId: string, versionId: string): Promise<any[]> {
        const uploadDir = path.join(__dirname, '../../../uploads_docx');
        await fs.mkdir(uploadDir, { recursive: true });

        const results: any[] = [];
        const inputIds: string[] = [];

        for (const file of docxFiles) {
            const savePath = path.join(uploadDir, file.name);
            await file.mv(savePath);
            try {
                const result = await this.runDocxToText(savePath);

                // Lưu vào database
                const savedInput = await this.saveDocumentToDB({
                    projectId,
                    versionId,
                    type: 'docx',
                    originalFilename: file.name,
                    mimeType: file.mimetype || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    rawText: result.text || result.error || 'No text extracted from DOCX',
                    paragraphs: result.paragraphs || [],
                    tables: result.tables || [],
                    metadata: result.metadata || {},
                    confidenceScore: result.confidence || 0.0
                });

                inputIds.push(savedInput._id.toString());

                results.push({
                    ...result,
                    documentId: savedInput._id,
                    fileUrl: savedInput.file_url
                });
            } catch (error: any) {
                results.push({ text: null, confidence: 0, error: error.message || 'Internal error' });
            }
        }

        // Cập nhật version với danh sách input_ids
        if (inputIds.length > 0) {
            await Version.findByIdAndUpdate(versionId, {
                $push: { inputs: { $each: inputIds } },
                updated_at: new Date()
            });
        }

        return results;
    }

    async saveDocumentToDB(data: {
        projectId: string;
        versionId: string;
        type: string;
        originalFilename: string;
        mimeType: string;
        rawText: string;
        paragraphs: string[];
        tables: string[][][];
        metadata: any;
        confidenceScore: number;
    }) {
        const input = new Input({
            project_id: data.projectId,
            version_id: data.versionId,
            type: data.type,
            original_filename: data.originalFilename,
            mime_type: data.mimeType,
            raw_text: data.rawText,
            cleaned_text: data.rawText,
            paragraphs: data.paragraphs,
            tables: data.tables,
            metadata: data.metadata,
            confidence_score: data.confidenceScore,
            quality_score: data.confidenceScore,
            // docx/text không refine → completed ngay
            processing_status: 'completed',
            pipeline_steps: { extraction: true }
        });

        return await input.save();
    }

    async runDocxToText(docxPath: string): Promise<any> {
        const scriptPath = path.join(__dirname, '../pythonScript/process_docx.py');
        const args = [scriptPath, docxPath];

        return new Promise((resolve, reject) => {
            const python = spawn('python', args);
            let result = '';
            let error = '';

            python.stdout.on('data', (data) => result += data.toString());
            python.stderr.on('data', (data) => error += data.toString());

            python.on('close', (code) => {
                if (code !== 0) return reject(new Error(error));
                try {
                    const parsed = JSON.parse(result);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Invalid JSON from docx script'));
                }
            });

            python.on('error', (err) => reject(err));
        });
    }
}