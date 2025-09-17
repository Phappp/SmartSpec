import Input from '../../../../../internal/model/input';
import Version from '../../../../../internal/model/version';
import {HashUtil} from '../../../utils/hash.util';

export class TextService {
    private detectLanguageFromText(text: string): string | null {
        const sample = (text || '').slice(0, 5000);
        if (!sample.trim()) return null;

        const hasVietnamese = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴ]/.test(sample);
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
            is_processed: false
        });

        const saved = await input.save();

        // Link vào Version.inputs và cập nhật merged_text
        await Version.findByIdAndUpdate(versionId, {
            $push: { inputs: saved._id },
            $set: { updated_at: new Date() }
        });

        // if (rawText && rawText.trim().length > 0) {
        //     try {
        //         const current = await Version.findById(versionId).lean();
        //         const merged = [current?.merged_text || '', rawText].filter(Boolean).join('\n\n');
        //         await Version.findByIdAndUpdate(versionId, {
        //             $set: { merged_text: merged, updated_at: new Date() }
        //         });
        //     } catch { }
        // }

        return saved;
    }
}


