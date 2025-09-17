import { ApiKeyService } from "./ApiKeyService";

/**
 * Service gọi Gemini API để phân tích requirements
 */
export class GeminiService {
    private apiKeyService = new ApiKeyService();

    /**
     * Hàm helper parse JSON an toàn từ response LLM
     */
    private safeJsonParse(txt: string): any[] {
        try {
            return JSON.parse(txt);
        } catch {
            // Thử tìm mảng JSON
            const arrayMatch = txt.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                try {
                    return JSON.parse(arrayMatch[0]);
                } catch { }
            }
            // Thử parse object đơn
            const objMatch = txt.match(/\{[\s\S]*\}/);
            if (objMatch) {
                try {
                    return [JSON.parse(objMatch[0])];
                } catch { }
            }
            console.error("❌ JSON parse failed. Raw text snippet:", txt.slice(0, 500));
            return [];
        }
    }

    /**
     * Sinh prompt chuẩn cho Gemini
     */
    private buildPrompt(cleanText: string): string {
        const schemaDescription = `BẮT BUỘC: CHỈ trả về JSON array hợp lệ và KHÔNG GÌ KHÁC. 
KHÔNG giải thích, KHÔNG markdown, KHÔNG code fence, KHÔNG text thừa.

Phân tích văn bản sau và CHUYỂN THÀNH DANH SÁCH (array) các USE CASE CỦA HỆ THỐNG PHẦN MỀM.
KHÔNG mô tả nghiệp vụ tổ chức/hành chính ngoài đời thật, mà phải diễn đạt thành chức năng mà PHẦN MỀM cần hỗ trợ.

Ví dụ: thay vì "Cán bộ UBND xem xét điều chỉnh quy hoạch", hãy mô tả thành "Người dùng nộp hồ sơ điều chỉnh quy hoạch qua hệ thống" hoặc "Hệ thống thẩm định và phê duyệt yêu cầu điều chỉnh".

Mỗi use case là một object JSON với các trường:
- id
- name (mô tả chức năng phần mềm, ví dụ: "Đăng nhập hệ thống", "Gửi yêu cầu phê duyệt")
- role (vai trò trong phần mềm: Người dùng, Quản trị viên, Cán bộ thẩm định…)
- goal
- reason
- tasks[] (các bước phần mềm cần thực hiện, không phải thủ tục giấy tờ ngoài đời)
- inputs[] (dữ liệu nhập vào hệ thống)
- outputs[] (kết quả/phản hồi phần mềm cung cấp)
- context
- priority ("low"|"medium"|"high")
- feedback
- rules[]
- triggers[]
- preconditions[]
- postconditions[]
- exceptions[]
- stakeholders[]
- constraints[]

YÊU CẦU QUAN TRỌNG:
- OUTPUT PHẢI LÀ JSON ARRAY HỢP LỆ CÓ THỂ PARSE ĐƯỢC NGAY
- Nếu chỉ có 1 use case thì mảng vẫn có 1 phần tử
- Các trường dạng danh sách luôn là mảng chuỗi []
- Trường related_usecases phải là mảng chuỗi, format "UCx: Tên use case"
- Chỉ tập trung vào NGHIỆP VỤ CỦA PHẦN MỀM

`;

        return `${schemaDescription}\n\nVăn bản nguồn:\n${cleanText}`;
    }

    // Hàm để bổ sung related_usecases cho danh sách use case 

    async addRelatedUseCases(
        useCases: any[],
        options?: { incremental?: boolean }
    ): Promise<any[]> {
        // ✅ Nếu danh sách trống hoặc chỉ có 1 use case thì bỏ qua
        if (!useCases || useCases.length <= 1) {
            console.log("⏩ Bỏ qua addRelatedUseCases vì danh sách quá ít use case.");
            return useCases;
        }

        // ✅ Rút gọn dữ liệu gửi sang Gemini (id + name + goal)
        const simplified = useCases.map((u) => ({
            id: u.id,
            name: u.name,
            goal: u.goal,
        }));

        const basePrompt = `
Đây là danh sách use case phần mềm đã có:
${JSON.stringify(simplified, null, 2)}

Nhiệm vụ của bạn:
${options?.incremental
                ? `- KHÔNG được xóa hoặc ghi đè related_usecases cũ.
- Chỉ bổ sung liên kết giữa use case mới và use case cũ.`
                : `- Phân tích và sinh lại toàn bộ related_usecases cho tất cả use case.`}

YÊU CẦU:
- related_usecases[] chỉ tham chiếu tới use case trong danh sách trên.
- Format: "UCx: Tên use case".
- Nếu không có liên quan, để mảng rỗng [].
- Trả về toàn bộ danh sách use case với related_usecases được cập nhật.
`;

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        for (const k of keys) {
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: basePrompt }] }],
                });

                const text: string = resp?.response?.text?.() || "[]";
                const parsed = this.safeJsonParse(text);

                // ✅ Nếu parse được array → gán related_usecases lại vào danh sách gốc
                if (Array.isArray(parsed)) {
                    const updated = useCases.map((u) => {
                        const match = parsed.find((p: any) => p.id === u.id);
                        return match ? { ...u, related_usecases: match.related_usecases || [] } : u;
                    });
                    return updated;
                }

                return useCases; // fallback nếu parse lỗi
            } catch (err: any) {
                console.error("❌ addRelatedUseCases error:", err);

                // ✅ Nếu có RetryInfo → delay trước khi thử key tiếp theo
                const retryInfo = err?.errorDetails?.find(
                    (d: any) => d["@type"]?.includes("RetryInfo")
                );
                if (retryInfo?.retryDelay) {
                    const seconds = parseInt(retryInfo.retryDelay);
                    if (!isNaN(seconds) && seconds > 0) {
                        console.log(`⏳ Đợi ${seconds}s trước khi thử key tiếp theo...`);
                        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
                    }
                }

                continue; // thử key tiếp theo
            }
        }

        return useCases; // fallback nếu tất cả key đều fail
    }



    /**
     * Phân tích text với Gemini → trả về danh sách use case
     */
    async analyzeRequirements(cleanText: string): Promise<any[]> {
        console.log(`🔍 Analyzing text with Gemini. Text length: ${cleanText.length}`);
        console.log(`📝 Text preview: ${cleanText.slice(0, 200)}...`);

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) {
            throw new Error("No active Gemini API key");
        }

        const prompt = this.buildPrompt(cleanText);
        let lastError: any;

        for (const k of keys) {
            const key = k.key_value;
            try {
                console.log(`🔑 Trying Gemini key: ${key.slice(0, 10)}...`);

                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(key);
                const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

                console.log(`📤 Sending prompt to Gemini (${prompt.length} chars)...`);
                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                const text: string = resp?.response?.text?.() || "[]";
                console.log(`🤖 Gemini response length: ${text.length}`);
                console.log(`📄 Gemini response preview: ${text.slice(0, 500)}...`);

                const parsed = this.safeJsonParse(text);
                console.log(
                    `✅ Parsed result: ${Array.isArray(parsed) ? parsed.length : "not array"} items`
                );

                return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
            } catch (err: any) {
                const msg = err?.message?.toLowerCase() || "";
                console.error(`❌ Gemini key ${key.slice(0, 8)}... failed:`, err.message);

                if (msg.includes("invalid") || msg.includes("unauthorized")) {
                    await this.apiKeyService.disableKey(k._id);
                    console.warn(`⚠️ Disabled invalid Gemini key: ${key.slice(0, 8)}...`);
                }

                lastError = err;
                continue; // thử key tiếp theo
            }
        }

        throw lastError || new Error("All Gemini API keys failed");
    }

    // Check conflic
    async checkConflictWithGemini(textA: string, textB: string): Promise<boolean> {
        const prompt = `So sánh hai mô tả use case sau:
A: "${textA}"
B: "${textB}"

Trả lời duy nhất bằng JSON:
{ "conflict": true }  nếu chúng THỰC SỰ là cùng một use case (chỉ khác cách viết, nhưng cùng ý nghĩa).
{ "conflict": false } nếu chúng là hai use case khác nhau (ví dụ: "Đăng nhập" KHÁC "Đăng ký").`;

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) {
            throw new Error("No active Gemini API key");
        }

        let lastError: any;
        for (const k of keys) {
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                const text: string = resp?.response?.text?.() || "{}";
                const parsed = JSON.parse(text.trim());

                if (typeof parsed.conflict === "boolean") {
                    return parsed.conflict;
                }
            } catch (err) {
                lastError = err;
                continue;
            }
        }

        throw lastError || new Error("All Gemini API keys failed for conflict check");
    }
}
