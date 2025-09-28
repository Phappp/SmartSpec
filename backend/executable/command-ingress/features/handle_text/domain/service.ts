import Input from '../../../../../internal/model/input';
import Version from '../../../../../internal/model/version';
import {HashUtil} from '../../../utils/hash.util';

export class TextService {
    private detectLanguageFromText(text: string): string | null {
        const sample = (text || '').slice(0, 5000);
        if (!sample.trim()) return null;

        const hasVietnamese = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỉĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴ]/.test(sample);
        const hasHiraganaKatakana = /[\u3040-\u30ff]/.test(sample);
        const hasHangul = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(sample);
        const hasHan = /[\u4E00-\u9FFF]/.test(sample);

        if (hasVietnamese) return 'vi-VN';
        if (hasHiraganaKatakana) return 'ja-JP';
        if (hasHangul) return 'ko-KR';
        if (hasHan) return 'zh-CN';
        return 'en-US';
    }

    async saveText(
        rawText: string,
        projectId: string,
        versionId: string,
        options?: { language?: string }
    ) {
        const detected = options?.language || this.detectLanguageFromText(rawText);
        const textHash = HashUtil.calculateTextHash(rawText);
        
        // Tìm input hiện tại cùng version và project
        const existingInput = await Input.findOne({
            project_id: projectId,
            version_id: versionId,
            type: 'text'
        });

        if (existingInput) {
            // Cập nhật input hiện tại
            existingInput.raw_text = rawText || '';
            existingInput.text_hash = textHash;
            existingInput.metadata = {
                ...existingInput.metadata,
                language: detected || null,
                file_size: (rawText || '').length,
                modified: new Date(),
                paragraphs_count: 0,
                tables_count: 0
            };
            existingInput.confidence_score = 1.0;
            existingInput.quality_score = 1.0;
            existingInput.processing_status = 'completed';
            existingInput.cleaned_text = rawText || '';
            existingInput.language = detected || null;
            existingInput.pipeline_steps = { 
                extraction: true, 
                lang_detect: { ok: true, value: detected || null } 
            };
            existingInput.is_processed = false; // Đặt lại thành false
            existingInput.updated_at = new Date(); // Cập nhật updated_at

            const saved = await existingInput.save();
            return saved;
        } else {
            // Tạo input mới nếu không tìm thấy
            const input = new Input({
                project_id: projectId,
                version_id: versionId,
                type: 'text',
                original_filename: null,
                mime_type: 'text/plain',
                raw_text: rawText || '',
                text_hash: textHash,
                paragraphs: [],
                tables: [],
                metadata: {
                    language: detected || null,
                    file_size: (rawText || '').length,
                    pages: 1,
                    is_scanned: false,
                    created: new Date(),
                    modified: new Date(),
                    paragraphs_count: 0,
                    tables_count: 0,
                    headers: [],
                    footers: []
                },
                confidence_score: 1.0,
                quality_score: 1.0,
                processing_status: 'completed',
                cleaned_text: rawText || '',
                language: detected || null,
                pipeline_steps: { extraction: true, lang_detect: { ok: true, value: detected || null } },
                is_processed: false,
                created_at: new Date(),
                updated_at: new Date()
            });

            const saved = await input.save();

            // Link vào Version.inputs
            await Version.findByIdAndUpdate(versionId, {
                $push: { inputs: saved._id },
                $set: { updated_at: new Date() }
            });

            return saved;
        }
    }
}