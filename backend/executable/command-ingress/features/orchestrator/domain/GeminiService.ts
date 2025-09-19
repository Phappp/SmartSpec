import { ApiKeyService } from "./ApiKeyService";

// THÊM MỚI: Tập trung hóa toàn bộ prompt để hỗ trợ đa ngôn ngữ
const prompts = {
    'vi-VN': {
        schemaDescription: (batchSize: number, offset: number) => `BẮT BUỘC: CHỈ trả về JSON array hợp lệ và KHÔNG GÌ KHÁC.
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
- related_usecases[]

YÊU CẦU QUAN TRỌNG:
- OUTPUT PHẢI LÀ JSON ARRAY HỢP LỆ, PARSE ĐƯỢC NGAY.
- Nếu chỉ có 1 use case thì array vẫn phải có 1 phần tử.
- Các trường dạng danh sách luôn là array chuỗi [].
- related_usecases phải là array chuỗi, format "UCx: Tên use case".
- Mỗi lần chỉ trả về TỐI ĐA ${batchSize} use case.
- BẮT ĐẦU từ use case số ${offset + 1}.
- Nếu không còn use case nào thì trả về [].
`,
        relatedUseCases: (simplified: any, incremental?: boolean) => `Đây là danh sách use case phần mềm đã có:\n${JSON.stringify(simplified, null, 2)}\n\nNhiệm vụ của bạn:\n${incremental ? `- KHÔNG được xóa hoặc ghi đè related_usecases cũ.\n- Chỉ bổ sung liên kết giữa use case mới và use case cũ.` : `- Phân tích và sinh lại toàn bộ related_usecases cho tất cả use case.`}\n\nYÊU CẦU:\n- related_usecases[] chỉ tham chiếu tới use case trong danh sách trên.\n- Format: "UCx: Tên use case".\n- Nếu không có liên quan, để mảng rỗng [].\n- Trả về toàn bộ danh sách use case với related_usecases được cập nhật.`,
        conflictCheck: (textA: string, textB: string) => `So sánh hai mô tả use case sau:\nA: "${textA}"\nB: "${textB}"\n\nTrả lời duy nhất bằng JSON:\n{ "conflict": true } nếu chúng THỰC SỰ là cùng một use case (chỉ khác cách viết, nhưng cùng ý nghĩa).\n{ "conflict": false } nếu chúng là hai use case khác nhau (ví dụ: "Đăng nhập" KHÁC "Đăng ký").`
    },
    'en-US': {
        schemaDescription: (batchSize: number, offset: number) => `REQUIRED: ONLY return a valid JSON array and NOTHING ELSE.
NO explanations, NO markdown, NO code fences, NO extra text.

Analyze the following text and CONVERT IT INTO a LIST of SOFTWARE SYSTEM use cases.
❌ DO NOT describe real-world administrative/paperwork procedures.
✅ ONLY describe FUNCTIONS that the SOFTWARE needs to support.

Example: instead of "The officer reviews the planning adjustment",
describe it as "User submits a planning adjustment request through the system"
or "The system validates and approves the adjustment request".

Each use case is a JSON object with these fields:
- id
- name (describes a software function, e.g., "Log into the system", "Submit approval request")
- role (role in the software: User, Administrator, Approver...)
- goal
- reason
- tasks[] (steps the system performs, NOT real-world paperwork)
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
- related_usecases[]

CRITICAL REQUIREMENTS:
- THE OUTPUT MUST BE A VALID, IMMEDIATELY PARSABLE JSON ARRAY.
- If there is only one use case, the array must still contain one element.
- List-type fields must always be a string array [].
- related_usecases must be a string array, formatted as "UCx: Use case name".
- Return a MAXIMUM of ${batchSize} use cases at a time.
- START from use case number ${offset + 1}.
- If no more use cases are found, return [].
`,
        relatedUseCases: (simplified: any, incremental?: boolean) => `Here is a list of existing software use cases:\n${JSON.stringify(simplified, null, 2)}\n\nYour task:\n${incremental ? `- DO NOT delete or overwrite existing related_usecases.\n- Only add links between new and old use cases.` : `- Analyze and regenerate all related_usecases for all use cases.`}\n\nREQUIREMENTS:\n- related_usecases[] must only reference use cases from the list above.\n- Format: "UCx: Use case name".\n- If a use case has no relations, return an empty array [].\n- Return the entire list of use cases with the 'related_usecases' field updated.`,
        conflictCheck: (textA: string, textB: string) => `Compare the following two use case descriptions:\nA: "${textA}"\nB: "${textB}"\n\nRespond ONLY with JSON:\n{ "conflict": true } if they are TRULY the same use case (different wording, same meaning).\n{ "conflict": false } if they are two different use cases (e.g., "Login" is DIFFERENT from "Register").`
    }
};


export class GeminiService {
    private apiKeyService = new ApiKeyService();
    // config
    private readonly BATCH_SIZE = 20;
    private readonly MAX_BATCHES = 100;
    private readonly MAX_ATTEMPTS_PER_OFFSET = 3;

    private cleanJsonString(text: string): string {
        const pattern = /```(?:json)?\s*([\s\S]*?)\s*```/g;
        const match = pattern.exec(text.trim());
        // Nếu tìm thấy khối mã, trả về nội dung bên trong, nếu không, trả về chuỗi gốc
        return match ? match[1].trim() : text.trim();
    }

    private tryParseWhole(text: string): any[] | null {
        try {
            const v = JSON.parse(text);
            if (Array.isArray(v)) return v;
            return [v];
        } catch {
            return null;
        }
    }

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
                    const slice = text.slice(start, i + 1);
                    return { jsonText: slice, complete: true };
                }
            }
        }
        const partial = text.slice(start);
        return { jsonText: partial, complete: false };
    }

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

    private safeJsonParseRobust(txt: string): { items: any[]; incomplete: boolean } {
        if (!txt || txt.trim().length === 0) return { items: [], incomplete: false };

        const whole = this.tryParseWhole(txt);
        if (whole) return { items: whole, incomplete: false };

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

        const nd = this.tryParseNdjson(txt);
        if (nd) return { items: nd, incomplete: false };

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

        return { items: [], incomplete: true };
    }

    private safeJsonParse(txt: string): any[] {
        const result = this.safeJsonParseRobust(txt);
        if (!Array.isArray(result.items)) return [];

        return result.items
            .map((it: any) => {
                if (typeof it === "string") {
                    return { name: it };
                }
                return it;
            })
            .filter(Boolean);
    }

    private buildPrompt(cleanText: string, language: string, offset = 0, batchSize = 20): string {
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const schemaDescription = prompts[lang].schemaDescription(batchSize, offset);
        return `${schemaDescription}\n\nVăn bản nguồn (Source text):\n${cleanText}`;
    }

    async addRelatedUseCases(
        useCases: any[],
        options: { incremental?: boolean } | undefined,
        language: string
    ): Promise<any[]> {
        if (!useCases || useCases.length <= 1) {
            console.log("⏩ Skipping addRelatedUseCases: Not enough use cases.");
            return useCases;
        }

        const simplified = useCases.map((u) => ({ id: u.id, name: u.name, goal: u.goal }));
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const basePrompt = prompts[lang].relatedUseCases(simplified, options?.incremental);

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        for (const k of keys) {
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: basePrompt }] }],
                });

                let text: string = resp?.response?.text?.() || "[]";
                text = this.cleanJsonString(text);
                const parsed = this.safeJsonParse(text);

                if (Array.isArray(parsed)) {
                    const updated = useCases.map((u) => {
                        const match = parsed.find((p: any) => p.id === u.id);
                        return match ? { ...u, related_usecases: match.related_usecases || [] } : u;
                    });
                    return updated;
                }
                return useCases;
            } catch (err: any) {
                console.error("❌ addRelatedUseCases error:", err);
                const retryInfo = err?.errorDetails?.find(
                    (d: any) => d["@type"]?.includes("RetryInfo")
                );
                if (retryInfo?.retryDelay) {
                    const seconds = parseInt(retryInfo.retryDelay);
                    if (!isNaN(seconds) && seconds > 0) {
                        console.log(`⏳ Waiting ${seconds}s before trying next key...`);
                        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
                    }
                }
                continue;
            }
        }
        return useCases;
    }

    async analyzeRequirements(cleanText: string, language: string): Promise<any[]> {
        console.log(`🔍 Analyzing text with Gemini (lang: ${language}). Text length: ${cleanText?.length ?? 0}`);

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
                    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

                    const prompt = this.buildPrompt(cleanText, language, offset, this.BATCH_SIZE);

                    const resp: any = await model.generateContent({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                    });

                    let text: string = resp?.response?.text?.() || "";
                    text = this.cleanJsonString(text);
                    console.log(`🤖 Gemini response length: ${text.length}`);

                    const parsed = this.safeJsonParseRobust(text);

                    if (parsed.items.length > 0) {
                        const normalized = parsed.items.map((it: any) => {
                            if (typeof it === "string") return { name: it };
                            return it;
                        });
                        allResults = allResults.concat(normalized);
                        console.log(`✅ Parsed ${normalized.length} items (incomplete=${parsed.incomplete}). total=${allResults.length}`);
                        offset += normalized.length;
                        gotBatch = true;

                        if (!parsed.incomplete && normalized.length < this.BATCH_SIZE) {
                            return allResults;
                        } else {
                            break;
                        }
                    } else {
                        console.warn(`⚠️ No parsable items from key ${key.slice(0, 12)}. Response preview: ${text.slice(0, 200)}`);
                        if (text.trim() === "[]") {
                            return allResults;
                        }
                        lastError = new Error("No parsable items");
                        continue;
                    }
                } catch (err: any) {
                    lastError = err;
                    const msg = (err?.message || "").toLowerCase();
                    console.error(`❌ Gemini key ${k._id} failed:`, err?.message || err);
                    if (msg.includes("invalid") || msg.includes("unauthorized")) {
                        try {
                            await this.apiKeyService.disableKey(k._id);
                            console.warn(`⚠️ Disabled invalid Gemini key: ${k._id}`);
                        } catch { /* ignore */ }
                    }
                    continue;
                }
            } // end for keys

            if (!gotBatch) {
                console.warn("⚠️ Could not fetch a valid batch for current offset. Stopping further attempts.");
                break;
            }
        } // end while

        if (allResults.length > 0) return allResults;
        throw lastError || new Error("All Gemini API keys failed or no parsable output");
    }

    async checkConflictWithGemini(textA: string, textB: string, language: string): Promise<boolean> {
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = prompts[lang].conflictCheck(textA, textB);

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        let lastError: any;
        for (const k of keys) {
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                let text: string = resp?.response?.text?.() || "{}";
                text = this.cleanJsonString(text);
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