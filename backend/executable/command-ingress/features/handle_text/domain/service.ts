import Input from '../../../../../internal/model/input';
import Version from '../../../../../internal/model/version';
import { HashUtil } from '../../../utils/hash.util';

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
        options?: { language?: string, original_filename?: string | null }
    ) {
        const detected = options?.language || this.detectLanguageFromText(rawText);
        const textHash = HashUtil.calculateTextHash(rawText);

        // THAY ĐỔI LOGIC: Luôn tạo input mới, không tìm và ghi đè nữa.
        // Việc kiểm tra trùng lặp nên được thực hiện ở tầng cao hơn (InputService)
        // giống như cách nó làm với file.
        // ✅ Clean text ngay khi save
        const { cleanTextForLLM, validateTextForLLM } = require("../../../shared/textPreprocessor");
        const cleanedText = cleanTextForLLM(rawText || '');
        const validation = validateTextForLLM(rawText || '');
        
        // Log warnings nếu có
        if (validation.warnings.length > 0) {
            console.warn(`⚠️ Text input warnings:`, validation.warnings.slice(0, 3));
        }
        
        const input = new Input({
            project_id: projectId,
            version_id: versionId,
            type: 'text',
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
                footers: [],
                text_validation_warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
                original_text_length: validation.originalLength,
                cleaned_text_length: validation.cleanedLength,
                estimated_tokens: validation.estimatedTokens
            },
            confidence_score: 1.0,
            quality_score: 1.0,
            processing_status: 'completed',
            cleaned_text: cleanedText, // Sử dụng cleaned text
            language: detected || null,
            pipeline_steps: { extraction: true, lang_detect: { ok: true, value: detected || null } },
            is_processed: false, // Luôn là false khi tạo mới
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