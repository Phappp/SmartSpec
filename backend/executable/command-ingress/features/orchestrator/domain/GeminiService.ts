import { ApiKeyService } from "./ApiKeyService";

/**
 * Service gọi Gemini API để phân tích requirements
 */
export class GeminiService {
    private apiKeyService = new ApiKeyService();
    // config
    private readonly BATCH_SIZE = 20;
    private readonly MAX_BATCHES = 100; // safety cap
    private readonly MAX_ATTEMPTS_PER_OFFSET = 3; // tries (across keys) per offset

    // Hai hàm parse JSON an toàn từ response LLM
    private tryParseWhole(text: string): any[] | null {
        try {
            const v = JSON.parse(text);
            if (Array.isArray(v)) return v;
            return [v];
        } catch {
            return null;
        }
    }

    // Find a balanced JSON array by scanning from first '[' and matching pairs
    private extractBalancedArray(text: string): { jsonText?: string; complete: boolean } {
        const start = text.indexOf("[");
        if (start === -1) return { complete: false };

        let depth = 0;
        for (let i = start; i < text.length; i++) {
            const ch = text[i];
            if (ch === "[") depth++;
            else if (ch === "]") {
                depth--;
                if (depth === 0) {
                    // found balanced array from start..i
                    const slice = text.slice(start, i + 1);
                    return { jsonText: slice, complete: true };
                }
            }
        }
        // reached end without closing bracket
        const partial = text.slice(start); // partial array
        return { jsonText: partial, complete: false };
    }

    // Try parse NDJSON (newline-delimited JSON objects)
    private tryParseNdjson(text: string): any[] | null {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const out: any[] = [];
        let success = false;
        for (const line of lines) {
            try {
                const v = JSON.parse(line);
                out.push(v);
                success = true;
            } catch {
                // skip non-json lines
            }
        }
        return success ? out : null;
    }

    /**
     * Robust parse that attempts multiple strategies.
     * Returns { items, incomplete } where incomplete = true means likely truncated.
     */
    private safeJsonParseRobust(txt: string): { items: any[]; incomplete: boolean } {
        if (!txt || txt.trim().length === 0) return { items: [], incomplete: false };

        // 1) Try full-parse
        const whole = this.tryParseWhole(txt);
        if (whole) return { items: whole, incomplete: false };

        // 2) Try extract balanced array
        const extracted = this.extractBalancedArray(txt);
        if (extracted.jsonText) {
            try {
                const parsed = JSON.parse(extracted.jsonText);
                if (Array.isArray(parsed)) {
                    return { items: parsed, incomplete: !extracted.complete };
                } else {
                    return { items: [parsed], incomplete: !extracted.complete };
                }
            } catch {
                // if incomplete (no closing ]) we can attempt to append ']' and parse
                if (!extracted.complete) {
                    try {
                        const attempt = JSON.parse(extracted.jsonText + "]");
                        return { items: Array.isArray(attempt) ? attempt : [attempt], incomplete: false };
                    } catch {
                        // continue to next strategies
                    }
                }
            }
        }

        // 3) Try NDJSON
        const nd = this.tryParseNdjson(txt);
        if (nd) return { items: nd, incomplete: false };

        // 4) Fallback: try to find any {...} objects (non-greedy)
        const objMatches = txt.match(/\{[\s\S]*?\}/g);
        if (objMatches && objMatches.length > 0) {
            const parsedObjs: any[] = [];
            for (const m of objMatches) {
                try {
                    parsedObjs.push(JSON.parse(m));
                } catch {
                    // skip unparseable
                }
            }
            if (parsedObjs.length > 0) return { items: parsedObjs, incomplete: true };
        }

        // nothing usable
        return { items: [], incomplete: true };
    }
    /**
     * Hàm helper parse JSON an toàn từ response LLM
     */
    private safeJsonParse(txt: string): any[] {
        const result = this.safeJsonParseRobust(txt);
        if (!Array.isArray(result.items)) return [];

        return result.items
            .map((it: any) => {
                if (typeof it === "string") {
                    return { name: it }; // ép thành object hợp lệ
                }
                return it;
            })
            .filter(Boolean);
    }




    /**
     * Sinh prompt chuẩn cho Gemini
     */
    private buildPrompt(cleanText: string, offset = 0, batchSize = 20): string {
        const schemaDescription = `BẮT BUỘC: CHỈ trả về JSON array hợp lệ và KHÔNG GÌ KHÁC.
KHÔNG giải thích, KHÔNG markdown, KHÔNG code fence, KHÔNG text thừa.

Phân tích văn bản sau và CHUYỂN THÀNH DANH SÁCH use case CỦA HỆ THỐNG PHẦN MỀM.
❌ KHÔNG mô tả thủ tục hành chính/giấy tờ ngoài đời thật.
✅ CHỈ mô tả các CHỨC NĂNG mà PHẦN MỀM cần hỗ trợ.

Ví dụ: thay vì "Cán bộ UBND xem xét điều chỉnh quy hoạch",
hãy mô tả thành "Người dùng nộp hồ sơ điều chỉnh quy hoạch qua hệ thống"
hoặc "Hệ thống thẩm định và phê duyệt yêu cầu điều chỉnh".

Mỗi use case là một object JSON với các trường:
- id
- name (mô tả chức năng phần mềm, ví dụ: "Đăng nhập hệ thống", "Gửi yêu cầu phê duyệt")
- role (vai trò trong phần mềm: Người dùng, Quản trị viên, Cán bộ thẩm định…)
- goal
- reason
- tasks[] (các bước hệ thống thực hiện, KHÔNG phải thủ tục giấy tờ ngoài đời)
- inputs[]
- outputs[]
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
- OUTPUT PHẢI LÀ JSON ARRAY HỢP LỆ, PARSE ĐƯỢC NGAY.
- Nếu chỉ có 1 use case thì array vẫn phải có 1 phần tử.
- Các trường dạng danh sách luôn là array chuỗi [].
- related_usecases phải là array chuỗi, format "UCx: Tên use case".
- Mỗi lần chỉ trả về TỐI ĐA ${batchSize} use case.
- BẮT ĐẦU từ use case số ${offset + 1}.
- Nếu không còn use case nào thì trả về [].
`;

        return `${schemaDescription}

Văn bản nguồn:
${cleanText}`;
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
        console.log(`🔍 Analyzing text with Gemini. Text length: ${cleanText?.length ?? 0}`);

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        let allResults: any[] = [];
        let offset = 0;
        let batchCount = 0;
        let lastError: any = null;

        while (batchCount < this.MAX_BATCHES) {
            batchCount++;
            let gotBatch = false;
            let attemptsForThisOffset = 0;

            for (const k of keys) {
                if (attemptsForThisOffset >= this.MAX_ATTEMPTS_PER_OFFSET) break;
                attemptsForThisOffset++;

                const key = k.key_value;
                try {
                    console.log(`🔑 Trying Gemini key: ${key.slice(0, 12)}... (offset=${offset})`);
                    const { GoogleGenerativeAI } = await import("@google/generative-ai");
                    const client = new GoogleGenerativeAI(key);
                    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

                    const prompt = this.buildPrompt(cleanText, offset, this.BATCH_SIZE);

                    const resp: any = await model.generateContent({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                    });

                    const text: string = resp?.response?.text?.() || "";
                    console.log(`🤖 Gemini response length: ${text.length}`);

                    const parsed = this.safeJsonParseRobust(text);

                    if (parsed.items.length > 0) {
                        // 🔧 ép phần tử thành object nếu lỡ là string
                        const normalized = parsed.items.map((it: any) => {
                            if (typeof it === "string") {
                                return { name: it };
                            }
                            return it;
                        });

                        allResults = allResults.concat(normalized);

                        console.log(
                            `✅ Parsed ${normalized.length} items (incomplete=${parsed.incomplete}). total=${allResults.length}`
                        );

                        offset += normalized.length;
                        gotBatch = true;

                        // Nếu incomplete = false và số lượng < batch size => coi như xong
                        if (!parsed.incomplete && normalized.length < this.BATCH_SIZE) {
                            return allResults;
                        } else {
                            // tiếp tục lấy batch kế tiếp
                            break;
                        }
                    } else {
                        console.warn(
                            `⚠️ No parsable items from key ${key.slice(0, 12)}. Response preview: ${text.slice(
                                0,
                                200
                            )}`
                        );

                        // Nếu response là [] thì coi như đã hết
                        if (text.trim() === "[]") {
                            return allResults;
                        }

                        lastError = new Error("No parsable items");
                        continue; // thử key tiếp theo
                    }
                } catch (err: any) {
                    lastError = err;
                    const msg = (err?.message || "").toLowerCase();
                    console.error(`❌ Gemini key ${k._id} failed:`, err?.message || err);
                    if (msg.includes("invalid") || msg.includes("unauthorized")) {
                        try {
                            await this.apiKeyService.disableKey(k._id);
                            console.warn(`⚠️ Disabled invalid Gemini key: ${k._id}`);
                        } catch {
                            /* ignore */
                        }
                    }
                    continue;
                }
            } // end for keys

            if (!gotBatch) {
                console.warn("⚠️ Could not fetch a valid batch for current offset. Stopping further attempts.");
                break;
            }
        } // end while

        if (allResults.length > 0) {
            return allResults;
        }

        throw lastError || new Error("All Gemini API keys failed or no parsable output");
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
