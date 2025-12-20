import Input from '../../../../internal/model/input';

export async function refineInputById(inputId: string, userId?: string) {
    const input = await Input.findById(inputId);
    if (!input) return;

    const meta: any = input.metadata || {};
    const shouldRefine = input.type === 'image' || input.type === 'audio' || (input.type === 'pdf' && meta.is_scanned === true);
    if (!shouldRefine) return;

    // ✅ Sử dụng LLMService để lấy recommended model (ưu tiên model user đã chọn)
    const { LLMService } = await import('../../shared/LLMService');
    const llmService = new LLMService();
    let modelName: string;
    try {
        modelName = await llmService.getRecommendedModel(undefined, userId);
        console.log(`[refineInputById] Using recommended model: ${modelName}${userId ? ` (for user: ${userId})` : ''}`);
    } catch (error: any) {
        console.error(`[refineInputById] Error getting recommended model: ${error.message}`);
        // Fallback: mark as completed without refinement
        const raw = (input as any).raw_text || '';
        await Input.findByIdAndUpdate(inputId, {
            processing_status: 'completed',
            cleaned_text: raw,
            pipeline_steps: {
                ...(input as any).pipeline_steps,
                refine: {
                    ok: false,
                    skipped: true,
                    reason: 'No API keys available',
                    at: new Date()
                }
            },
            metadata: {
                ...meta,
                refine_skipped: true,
                refine_skip_reason: 'No API keys available'
            }
        });
        return;
    }

    try {
        const raw = (input as any).raw_text || '';

        console.log(`[refineInputById] Starting LLM refinement for inputId ${inputId} using model: ${modelName}`);

        // ✅ Sử dụng LLMService.callLLM để sử dụng model được user chọn
        const systemPrompt = 'Bạn là biên tập viên. Hãy chuẩn hóa chính tả/khoảng trắng/cách dòng, giữ nguyên nội dung, không thêm bớt.';
        const userPrompt = `${meta.language ? `(Ngôn ngữ: ${meta.language}). ` : ''}Văn bản nguồn giữa dấu backticks, hãy chuẩn hóa và trả về đúng văn bản đã sửa.\n\n\`\`\`\n${raw}\n\`\`\``;
        const fullPrompt = systemPrompt + '\n\n' + userPrompt;

        console.log(`[refineInputById] Calling LLMService with model: ${modelName}...`);
        const response = await llmService.callLLM({
            prompt: fullPrompt,
            modelName: modelName,
            userId: userId,
            endpoint: 'refineInput',
            isProductionFreeMode: true
        });

        const cleaned = response.text.trim();
        console.log(`[refineInputById] LLM response received, length: ${cleaned.length}`);

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
            pipeline_steps: { ...(input as any).pipeline_steps, refine: { ok: true, model: modelName, at: new Date() } },
            metadata: {
                ...meta,
                text_validation_warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
                original_text_length: validation.originalLength,
                cleaned_text_length: validation.cleanedLength,
                estimated_tokens: validation.estimatedTokens,
                refine_model: modelName // ✅ Lưu model đã sử dụng
            }
        });

        console.log(`[refineInputById] Refinement completed for inputId ${inputId}`);
    } catch (e: any) {
        console.error(`[refineInputById] Error refining inputId ${inputId}:`, e?.message || 'Refine error');
        await Input.findByIdAndUpdate(inputId, { processing_status: 'failed', processing_error: e?.message || 'Refine error' });
    }
}



