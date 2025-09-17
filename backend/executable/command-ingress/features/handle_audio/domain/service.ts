import { spawn } from 'child_process';
import fs from 'fs/promises'; // IMPROVEMENT: Dùng fs/promises để code async/await sạch hơn
import path from 'path';
import os from 'os'; // IMPROVEMENT: Dùng thư mục tạm của hệ điều hành
import { UploadedFile } from 'express-fileupload';
import InputModel from '../../../../../internal/model/input';
import VersionModel from '../../../../../internal/model/version';


// --- IMPROVEMENT: Đưa các hằng số cấu hình ra ngoài ---
const PYTHON_SCRIPT_PATH = path.join(__dirname, '../pythonScript/process_STT.py');
const BATCH_SIZE = 2; // Xử lý 2 file một lúc

// Interface cho kết quả từ Python
export interface SpeechToTextResult {
    file: string; // Đây là đường dẫn file tạm mà Python đã xử lý
    language?: string;
    text?: string;
    warning?: string;
    error?: string;
    confidence?: number;
    segments?: { start: number; end: number; text: string }[];
}

// Interface để theo dõi file trong quá trình xử lý
interface ProcessedFile {
    originalFile: UploadedFile;
    savedPath: string;
}

export class SpeechToTextService {
    private enqueueRefineJob(inputId: string, provider: 'gemini' | 'openai' | 'claude' = 'gemini') {
        import('../../handle_extraction/index')
            .then((m) => m.refineInputById(inputId, provider))
            .catch((err) => console.error('[refine] audio error', err?.message || err));
    }

    /**
     * @method handleAudio
     * @description Nhận file, lưu tạm, gọi Python, lưu kết quả vào DB, và dọn dẹp file tạm.
     */
    public async handleAudio(
        files: UploadedFile[],
        project_id: string,
        version_id: string
    ): Promise<SpeechToTextResult[]> {

        // IMPROVEMENT: Đã loại bỏ logic thừa về xử lý ID, vì controller đã làm việc này.
        // Service giờ đây tin tưởng rằng ID được truyền vào là hợp lệ.

        const processedFiles: ProcessedFile[] = [];

        // --- IMPROVEMENT: Dùng try...finally để đảm bảo file tạm luôn được dọn dẹp ---
        try {
            // === 1. Lưu file vào thư mục tạm một cách an toàn ===
            const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'speech-')); // Tạo thư mục tạm duy nhất
            const allowedExts = ['.mp3', '.m4a', '.wav', '.flac', '.ogg', '.webm', '.aac'];

            for (const file of files) {
                let ext = path.extname(file.name || '').toLowerCase();
                const mime = (file as any).mimetype || '';
                const isAudioMime = typeof mime === 'string' && mime.startsWith('audio/');

                if (!ext && isAudioMime) {
                    const mimeToExt: Record<string, string> = {
                        'audio/mpeg': '.mp3',
                        'audio/mp3': '.mp3',
                        'audio/wav': '.wav',
                        'audio/x-wav': '.wav',
                        'audio/webm': '.webm',
                        'audio/flac': '.flac',
                        'audio/aac': '.aac',
                        'audio/ogg': '.ogg',
                        'audio/m4a': '.m4a',
                        'audio/mp4': '.m4a',
                    };
                    ext = mimeToExt[mime] || '.wav';
                }

                const isAllowed = allowedExts.includes(ext) || isAudioMime;
                if (!isAllowed) {
                    throw new Error(`Unsupported file type: ${file.name}`);
                }

                const unsafeName = file.name || `audio${ext || ''}`;
                const baseName = path.basename(unsafeName, path.extname(unsafeName));
                const safeBase = baseName.replace(/[^\w.-]/g, '_');
                const finalName = ext ? `${safeBase}${ext}` : safeBase;
                const uniqueFilename = `${Date.now()}_${finalName}`;
                const dest = path.join(tempDir, uniqueFilename);

                await file.mv(dest);
                processedFiles.push({ originalFile: file, savedPath: dest });
            }

            // === 2. Gọi Python xử lý theo batch ===
            const savedPaths = processedFiles.map(f => f.savedPath);
            const batches = this.chunk(savedPaths, BATCH_SIZE);
            const allResults: SpeechToTextResult[] = [];

            for (const batch of batches) {
                const batchResult = await this.runPython(batch);
                allResults.push(...batchResult);
            }

            // === 3. Map kết quả và lưu vào DB ===
            await this.saveResultsToDatabase(allResults, processedFiles, project_id, version_id);

            return allResults;

        } finally {
            // === 4. Dọn dẹp file tạm ===
            // Khối finally này sẽ LUÔN LUÔN được thực thi, dù cho khối try thành công hay thất bại.
            // Điều này ngăn chặn việc file rác bị bỏ lại trên server.
            const pathsToClean = processedFiles.map(f => f.savedPath);
            if (pathsToClean.length > 0) {
                console.log(`Cleaning up ${pathsToClean.length} temporary audio files...`);
                // Xóa cả thư mục tạm chứa file
                await fs.rm(path.dirname(pathsToClean[0]), { recursive: true, force: true });
            }
        }
    }

    /**
     * @method saveDocumentToDB
     * @description Lưu dữ liệu audio đã xử lý vào database theo chuẩn chung
     */
    async saveDocumentToDB(data: {
        projectId: string;
        versionId: string;
        type: string;
        originalFilename: string;
        mimeType: string;
        rawText: string;
        segments: { start: number; end: number; text: string }[] | undefined;
        metadata: any;
        confidenceScore: number;
    }) {
        const input = new InputModel({
            project_id: data.projectId,
            version_id: data.versionId,
            type: data.type,
            original_filename: data.originalFilename,
            mime_type: data.mimeType,
            raw_text: data.rawText,
            cleaned_text: data.rawText,
            segments: data.segments || [],
            metadata: data.metadata,
            confidence_score: data.confidenceScore,
            quality_score: data.confidenceScore,
            processing_status: 'extracted', // audio cần refine
            pipeline_steps: { extraction: true, stt: true }
        });

        return await input.save();
    }

    /**
     * @method saveResultsToDatabase
     * @description Chuyển đổi kết quả từ Python sang schema và lưu vào MongoDB.
     */
    private async saveResultsToDatabase(
            results: SpeechToTextResult[],
            processedFiles: ProcessedFile[],
            project_id: string,
            version_id: string
        ): Promise<void> {

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const correspondingFile = processedFiles.find(f => f.savedPath === result.file);

            const lastSegment = result.segments && result.segments.length > 0
                ? result.segments[result.segments.length - 1]
                : null;

            const metadata = {
                file_path: result.file,
                file_size: correspondingFile?.originalFile.size || 0,
                language: result.language,
                duration: lastSegment ? lastSegment.end : 0,
                pages: 1,
                is_scanned: false,
                created: new Date(),
                modified: new Date(),
                paragraphs_count: 0,
                tables_count: 0,
                headers: [],
                footers: []
            };

            const saved = await this.saveDocumentToDB({
                projectId: project_id,
                versionId: version_id,
                type: 'audio',
                originalFilename: correspondingFile?.originalFile.name || path.basename(result.file),
                mimeType: correspondingFile?.originalFile.mimetype || 'audio/mpeg',
                rawText: result.text || '',
                segments: result.segments,
                metadata: metadata,
                confidenceScore: result.confidence ?? 0
            });

            // 🔗 Link vào Version.inputs
            await VersionModel.findByIdAndUpdate(version_id, {
                $push: { inputs: saved._id },
                $set: { updated_at: new Date() }
            });

            // 📝 Append text vào merged_text
            
            // if (result.text && result.text.trim().length > 0) {
            //     try {
            //         const current = await VersionModel.findById(version_id).lean();
            //         const merged = [current?.merged_text || '', result.text]
            //             .filter(Boolean)
            //             .join('\n\n');
            //         await VersionModel.findByIdAndUpdate(version_id, {
            //             $set: { merged_text: merged, updated_at: new Date() }
            //         });
            //     } catch (err) {
            //         console.error('[SpeechToTextService] Merge text error:', err);
            //     }
            // }

            if (!result.error && saved?._id) {
                this.enqueueRefineJob(String(saved._id), 'gemini');
            }
        }
    }

    private chunk<T>(array: T[], size: number): T[][] {
        const result: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    }

    private runPython(audioPaths: string[]): Promise<SpeechToTextResult[]> {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../pythonScript/process_STT.py');
            const python = spawn('python', [scriptPath, ...audioPaths]);

            let stdout = '';
            let stderr = '';

            python.stdout.on('data', data => (stdout += data));
            python.stderr.on('data', data => console.error('[PYTHON STDERR]', data.toString()));
            python.on('error', err => reject(err));
            python.on('close', code => {
                if (code !== 0) {
                    return reject(`Python exited with code ${code}: ${stderr || stdout}`);
                }
                try {
                    const parsed = JSON.parse(stdout);
                    resolve(parsed);
                } catch (e) {
                    reject(`JSON parse error: ${stdout}`);
                }
            });
        });
    }
}
