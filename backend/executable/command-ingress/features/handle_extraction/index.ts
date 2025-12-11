import Input from '../../../../internal/model/input';
import ApiKey from '../../../../internal/model/api_key';

type Provider = 'gemini' | 'openai' | 'claude';

async function getActiveKey(provider: Provider): Promise<{ key_value: string; model_name: string } | null> {
    const keyDoc = await ApiKey.findOne({ provider, is_active: true }).sort({ updatedAt: -1 });
    if (!keyDoc || !(keyDoc as any).key_value) return null;
    return {
        key_value: (keyDoc as any).key_value,
        model_name: (keyDoc as any).model_name || 'gemini-2.0-flash'
    };
}

export async function refineInputById(inputId: string, provider: Provider = 'gemini') {
    const input = await Input.findById(inputId);
    if (!input) return;

    const meta: any = input.metadata || {};
    const shouldRefine = input.type === 'image' || input.type === 'audio' || (input.type === 'pdf' && meta.is_scanned === true);
    if (!shouldRefine) return;

    const apiKeyData = await getActiveKey(provider);
    if (!apiKeyData) {
        console.log(`[refineInputById] No active API key for provider ${provider}`);
        await Input.findByIdAndUpdate(inputId, { processing_status: 'failed', processing_error: 'No active API key' });
        return;
    }

    try {
        const raw = (input as any).raw_text || '';
        let cleaned = '';

        console.log(`[refineInputById] Starting LLM refinement for inputId ${inputId} using provider ${provider}`);

        if (provider === 'gemini') {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const client = new GoogleGenerativeAI(apiKeyData.key_value);
            const modelName = apiKeyData.model_name || 'gemini-2.0-flash';
            const model = client.getGenerativeModel({ model: modelName });

            const systemPrompt = 'Bạn là biên tập viên. Hãy chuẩn hóa chính tả/khoảng trắng/cách dòng, giữ nguyên nội dung, không thêm bớt.';
            const userPrompt = `${meta.language ? `(Ngôn ngữ: ${meta.language}). ` : ''}Văn bản nguồn giữa dấu backticks, hãy chuẩn hóa và trả về đúng văn bản đã sửa.\n\n\`\`\`\n${raw}\n\`\`\``;

            console.log(`[refineInputById] Sending request to Gemini...`);
            const resp: any = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }] });
            cleaned = (resp?.response?.text?.() || '').trim();
            console.log(`[refineInputById] LLM response received, length: ${cleaned.length}`);
        } else {
            cleaned = raw.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
            console.log(`[refineInputById] Basic cleaning applied, length: ${cleaned.length}`);
        }

        // ✅ Validate và clean lại text sau khi refine để đảm bảo chất lượng
        const { cleanTextForLLM, validateTextForLLM } = require("../../shared/textPreprocessor");
        const finalCleaned = cleanTextForLLM(cleaned);
        const validation = validateTextForLLM(cleaned);
        
        // Kiểm tra xem LLM có cắt bớt text không
        const truncationCheck = require("../../shared/textPreprocessor").detectTruncation(raw, finalCleaned);
        if (truncationCheck.isTruncated && truncationCheck.lossPercentage > 5) {
            console.warn(`⚠️ [refineInputById] LLM có thể đã cắt bớt text: mất ${truncationCheck.missingChars} ký tự (${truncationCheck.lossPercentage.toFixed(1)}%)`);
        }
        
        if (validation.warnings.length > 0) {
            console.warn(`⚠️ [refineInputById] Text validation warnings:`, validation.warnings.slice(0, 2));
        }

        await Input.findByIdAndUpdate(inputId, {
            cleaned_text: finalCleaned, // Sử dụng cleaned text
            language: meta.language || null,
            quality_score: Math.min(1, finalCleaned && raw ? 0.9 : 0.3),
            processing_status: 'completed',
            pipeline_steps: { ...(input as any).pipeline_steps, refine: { ok: true, provider, at: new Date() } },
            metadata: {
                ...meta,
                text_validation_warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
                original_text_length: validation.originalLength,
                cleaned_text_length: validation.cleanedLength,
                estimated_tokens: validation.estimatedTokens
            }
        });

        console.log(`[refineInputById] Refinement completed for inputId ${inputId}`);
    } catch (e: any) {
        console.error(`[refineInputById] Error refining inputId ${inputId}:`, e?.message || 'Refine error');
        await Input.findByIdAndUpdate(inputId, { processing_status: 'failed', processing_error: e?.message || 'Refine error' });
    }
}



