import Input from '../../../../internal/model/input';
import ApiKey from '../../../../internal/model/api_key';

type Provider = 'gemini' | 'openai' | 'claude';

async function getActiveKey(provider: Provider): Promise<string | null> {
    const keyDoc = await ApiKey.findOne({ provider, is_active: true }).sort({ updatedAt: -1 });
    return (keyDoc && (keyDoc as any).key_value) ? (keyDoc as any).key_value : null;
}

export async function refineInputById(inputId: string, provider: Provider = 'gemini') {
    const input = await Input.findById(inputId);
    if (!input) return;

    const meta: any = input.metadata || {};
    const shouldRefine = input.type === 'image' || input.type === 'audio' || (input.type === 'pdf' && meta.is_scanned === true);
    if (!shouldRefine) return;

    const apiKey = await getActiveKey(provider);
    if (!apiKey) {
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
            const client = new GoogleGenerativeAI(apiKey);
            const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

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

        await Input.findByIdAndUpdate(inputId, {
            cleaned_text: cleaned,
            language: meta.language || null,
            quality_score: Math.min(1, cleaned && raw ? 0.9 : 0.3),
            processing_status: 'completed',
            pipeline_steps: { ...(input as any).pipeline_steps, refine: { ok: true, provider, at: new Date() } },
        });

        console.log(`[refineInputById] Refinement completed for inputId ${inputId}`);
    } catch (e: any) {
        console.error(`[refineInputById] Error refining inputId ${inputId}:`, e?.message || 'Refine error');
        await Input.findByIdAndUpdate(inputId, { processing_status: 'failed', processing_error: e?.message || 'Refine error' });
    }
}



