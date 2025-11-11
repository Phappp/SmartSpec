import { ApiKeyService } from "./ApiKeyService";

// THÊM MỚI: Tập trung hóa toàn bộ prompt để hỗ trợ đa ngôn ngữ
const prompts = {
   'vi-VN': {
    schemaDescription: (batchSize: number, offset: number) => ` **MỤC TIÊU**: Chuyển đổi văn bản thành danh sách use case phần mềm dạng JSON
 **PHẠM VI**: CHỈ tập trung vào chức năng PHẦN MỀM - LOẠI BỎ hoàn toàn thủ tục giấy tờ thực tế

 **HÀNH VI CẦN TRÁNH**:
• "Cán bộ ký văn bản giấy" →  SAI
• "Nộp hồ sơ bản cứng" →  SAI  
• "Gửi công văn giấy tờ" →  SAI

 **HÀNH VI PHẦN MỀM ĐÚNG**:
• "Hệ thống xác thực chữ ký số" →  ĐÚNG
• "Upload hồ sơ điện tử" →  ĐÚNG
• "Gửi thông báo qua hệ thống" →  ĐÚNG

 **YÊU CẦU ĐẦU RA**:
• CHỈ trả về JSON array hợp lệ
• KHÔNG giải thích, KHÔNG markdown, KHÔNG code fence
• Parse được ngay bằng JSON.parse()

🛠 **CẤU TRÚC USE CASE BẮT BUỘC**:
Mỗi use case PHẢI có đầy đủ các trường sau:
[
  {
    "id": "UC${offset + 1}",
    "name": "Đăng ký tài khoản hệ thống",
    "role": {
      "id": "guest",
      "name": "Người dùng chưa đăng ký",
      "description": "Người dùng chưa có tài khoản trong hệ thống"
    },
    "goal": "Tạo tài khoản truy cập hệ thống",
    "reason": "Cho phép người dùng sử dụng các chức năng được bảo vệ",
    "tasks": [
      "Truy cập trang đăng ký",
      "Nhập thông tin cá nhân",
      "Xác thực email", 
      "Kích hoạt tài khoản"
    ],
    "inputs": ["email", "mật khẩu", "họ tên", "số điện thoại"],
    "outputs": ["tài khoản đã kích hoạt", "email xác nhận", "thông báo thành công"],
    "context": "Module quản lý người dùng",
    "priority": "high",
    "feedback": "Giao diện thân thiện, hướng dẫn rõ ràng",
    "rules": [
      "Email phải có định dạng hợp lệ",
      "Mật khẩu tối thiểu 8 ký tự",
      "Không trùng email đã đăng ký"
    ],
    "triggers": ["Người dùng click nút 'Đăng ký'"],
    "preconditions": ["Người dùng chưa có tài khoản", "Hệ thống hoạt động bình thường"],
    "postconditions": ["Tài khoản được tạo", "Email xác nhận được gửi"],
    "exceptions": ["Email đã tồn tại", "Mất kết nối mạng", "Server lỗi"],
    "stakeholders": ["Người dùng mới", "Quản trị viên hệ thống"],
    "constraints": ["Hỗ trợ đa ngôn ngữ", "Tương thích mobile"],
    "related_usecases": ["UC${offset + 2}"]
  }
]

 **QUY TẮC XỬ LÝ**:
• Mỗi lần trả về TỐI ĐA ${batchSize} use case
• Bắt đầu từ use case số ${offset + 1}
• Không còn use case nào → trả về []
• Ưu tiên chức năng phần mềm cốt lõi
• Quy trình phức tạp → tách thành nhiều use case
• Không rõ vai trò → mặc định "Người dùng hệ thống"

 **KIỂM TRA CUỐI**:
✓ KHÔNG có thao tác thủ công ngoài đời
✓ CHỈ có tương tác phần mềm
✓ Role là object đầy đủ {id, name, description}
✓ Tất cả trường đều theo đúng schema
✓ Related usecases chỉ chứa ID (ví dụ: ["UC1", "UC3"])

`,
        relatedUseCases: (simplified: any, incremental?: boolean) => `Đây là danh sách use case phần mềm đã có:\n${JSON.stringify(simplified, null, 2)}\n\nNhiệm vụ của bạn:\n${incremental ? `- KHÔNG được xóa hoặc ghi đè related_usecases cũ.\n- Chỉ bổ sung liên kết giữa use case mới và use case cũ.` : `- Phân tích và sinh lại toàn bộ related_usecases cho tất cả use case.`}\n\nYÊU CẦU:\n- related_usecases[] chỉ tham chiếu tới use case trong danh sách trên.\n- Format: CHỈ chứa ID của use case (ví dụ: "UC1").\n- Nếu không có liên quan, để mảng rỗng [].\n- Trả về toàn bộ danh sách use case với related_usecases được cập nhật.`,
        conflictCheck: (textA: string, textB: string) => `
Bạn là một công cụ kiểm tra trùng lặp use case, cần đánh giá thật nghiêm ngặt.

Nhiệm vụ: Xác định xem hai mô tả use case sau đây có thực sự diễn tả CÙNG một chức năng hay không.

A: "${textA}"
B: "${textB}"

Quy tắc:
1. Trả về { "conflict": true } chỉ khi cả hai mô tả đều nói về CÙNG một mục tiêu/chức năng, 
   ngay cả khi cách viết khác nhau hoặc có lỗi chính tả nhỏ 
   (ví dụ: "Đăng nhập" và "Loginn" → cùng một use case).
2. Trả về { "conflict": false } nếu chúng là HAI chức năng khác nhau,
   kể cả khi có liên quan (ví dụ: "Đăng nhập" KHÁC với "Đăng ký").
3. Không được giả định rằng các từ giống nhau một phần là cùng chức năng,
   chỉ coi là trùng nếu ý nghĩa hoàn toàn giống.

Chỉ trả lời đúng một trong hai JSON sau, không kèm giải thích:
{ "conflict": true }
{ "conflict": false }
`,
        groupConflicts: (useCasesJson: string) => `
Bạn là một chuyên gia phân tích yêu cầu phần mềm cực kỳ chính xác.
Nhiệm vụ của bạn là đọc danh sách các use case sau đây và GOM NHÓM các use case bị TRÙNG LẶP về mặt chức năng.

DANH SÁCH USE CASE:
${useCasesJson}

QUY TẮC:
1. Hai use case được coi là trùng lặp NẾU chúng mô tả CÙNG MỘT MỤC TIÊU hoặc CÙNG MỘT CHỨC NĂNG, bất kể cách diễn đạt.
   Ví dụ: "Đăng nhập vào hệ thống" và "Cho phép người dùng sign-in" là TRÙNG LẶP.
2. Các chức năng liên quan nhưng khác mục tiêu thì KHÔNG trùng lặp.
   Ví dụ: "Đăng nhập" và "Đăng ký" là KHÁC NHAU.
3. Chỉ nhóm các use case bị trùng lặp. Các use case không trùng với bất kỳ use case nào khác thì bỏ qua.

YÊU CẦU OUTPUT:
- CHỈ trả về một JSON array hợp lệ và KHÔNG GÌ KHÁC.
- Mỗi phần tử trong array là một NHÓM các 'id' của các use case bị trùng lặp.
- KHÔNG giải thích, KHÔNG markdown.

Ví dụ output:
[
  ["UC1", "UC5", "UC12"],
  ["UC2", "UC8"]
]
`

    },
    'en-US': {
         schemaDescription: (batchSize: number, offset: number) => ` **OBJECTIVE**: Convert text into software use cases in JSON format
 **SCOPE**: FOCUS ONLY on SOFTWARE functions - COMPLETELY REMOVE real-world paperwork procedures

 **BEHAVIORS TO AVOID**:
• "Officer signs paper documents" →  WRONG
• "Submit hard copy documents" →  WRONG  
• "Send paper official letters" →  WRONG

 **CORRECT SOFTWARE BEHAVIORS**:
• "System verifies digital signature" →  CORRECT
• "Upload electronic documents" →  CORRECT
• "Send notifications via system" →  CORRECT

 **OUTPUT REQUIREMENTS**:
• Return ONLY valid JSON array
• NO explanations, NO markdown, NO code fence
• Immediately parseable with JSON.parse()

🛠 **REQUIRED USE CASE STRUCTURE**:
[
  {
    "id": "UC${offset + 1}",
    "name": "System Account Registration",
    "role": {
      "id": "guest",
      "name": "Unregistered User",
      "description": "User without system account"
    },
    "goal": "Create system access account",
    "reason": "Allow users to use protected features",
    "tasks": [
      "Access registration page",
      "Enter personal information",
      "Verify email",
      "Activate account"
    ],
    "inputs": ["email", "password", "full name", "phone number"],
    "outputs": ["activated account", "confirmation email", "success notification"],
    "context": "User management module",
    "priority": "high",
    "feedback": "User-friendly interface, clear instructions",
    "rules": [
      "Email must have valid format",
      "Minimum 8-character password",
      "No duplicate email registration"
    ],
    "triggers": ["User clicks 'Register' button"],
    "preconditions": ["User has no account", "System is operational"],
    "postconditions": ["Account created", "Confirmation email sent"],
    "exceptions": ["Email already exists", "Network connection lost", "Server error"],
    "stakeholders": ["New user", "System administrator"],
    "constraints": ["Multi-language support", "Mobile compatibility"],
    "related_usecases": ["UC${offset + 2}"]
  }
]

 **PROCESSING RULES**:
• Return MAXIMUM ${batchSize} use cases per batch
• Start from use case number ${offset + 1}
• No more use cases → return []
• Prioritize core software functions
• Complex processes → split into multiple use cases
• Unclear role → default to "System User"

 **FINAL CHECK**:
✓ NO manual real-world operations
✓ ONLY software interactions
✓ Role is complete object {id, name, description}
✓ All fields follow exact schema
✓ Related usecases contain ONLY IDs (example: ["UC1", "UC3"])
:`,
        relatedUseCases: (simplified: any, incremental?: boolean) => `Here is a list of existing software use cases:\n${JSON.stringify(simplified, null, 2)}\n\nYour task:\n${incremental ? `- DO NOT delete or overwrite existing related_usecases.\n- Only add links between new and old use cases.` : `- Analyze and regenerate all related_usecases for all use cases.`}\n\nREQUIREMENTS:\n- related_usecases[] must only reference use cases from the list above.\n- Format: ONLY the use case ID (e.g., "UC1").\n- If a use case has no relations, return an empty array [].\n- Return the entire list of use cases with the 'related_usecases' field updated.`,
        conflictCheck: (textA: string, textB: string) => `
You are a strict use case comparison engine.

Task: Decide if the following two use case descriptions represent the SAME functional requirement.

A: "${textA}"
B: "${textB}"

Rules:
1. They are the SAME (conflict = true) ONLY IF they describe the exact same user goal or functionality,
   even if the wording is slightly different (e.g., "Login" vs "Sign in").
2. They are DIFFERENT (conflict = false) if they serve different purposes (e.g., "Login" vs "Register").
3. Do NOT confuse related but distinct actions as the same.

Respond ONLY with JSON, no explanation:
{ "conflict": true }   // same meaning
{ "conflict": false }  // different meaning
`,
        groupConflicts: (useCasesJson: string) => `
You are an extremely accurate software requirements analyst.
Your task is to read the following list of use cases and GROUP the ones that are functional DUPLICATES.

LIST OF USE CASES:
${useCasesJson}

RULES:
1. Two use cases are duplicates IF they describe THE SAME GOAL or THE SAME FUNCTIONALITY, regardless of wording.
   Example: "Log into the system" and "Allow user to sign-in" are DUPLICATES.
2. Related but distinct functions are NOT duplicates.
   Example: "Login" and "Register" are DIFFERENT.
3. Only group the use cases that have duplicates. Ignore unique use cases.

OUTPUT REQUIREMENTS:
- ONLY return a valid JSON array and NOTHING ELSE.
- Each element in the array should be a GROUP of 'id's of the duplicate use cases.
- NO explanations, NO markdown.

Example output:
[
  ["UC1", "UC5", "UC12"],
  ["UC2", "UC8"]
]
`
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
        if (!txt || txt.trim().length === 0) {
            return { items: [], incomplete: false };
        }

        // Chiến lược 1: Thử phân tích toàn bộ chuỗi dưới dạng JSON array/object
        const whole = this.tryParseWhole(txt);
        if (whole) {
            const filtered = this.filterValidUseCases(whole);
            // Chỉ trả về nếu lọc ra có kết quả, hoặc nếu chuỗi gốc là một mảng rỗng '[]'
            if (filtered.length > 0 || txt.trim() === '[]') {
                return { items: filtered, incomplete: false };
            }
        }

        // Chiến lược 2: Trích xuất một mảng JSON cân bằng (thường nằm trong markdown)
        const extracted = this.extractBalancedArray(txt);
        if (extracted.jsonText) {
            try {
                const parsed = JSON.parse(extracted.jsonText);
                const items = Array.isArray(parsed) ? parsed : [parsed];
                const filtered = this.filterValidUseCases(items);
                return { items: filtered, incomplete: !extracted.complete };
            } catch {
                // Nếu thất bại và chuỗi không hoàn chỉnh, thử thêm ký tự đóng mảng ']'
                if (!extracted.complete) {
                    try {
                        const attempt = JSON.parse(extracted.jsonText + "]");
                        const items = Array.isArray(attempt) ? attempt : [attempt];
                        const filtered = this.filterValidUseCases(items);
                        return { items: filtered, incomplete: false };
                    } catch {
                        // Thất bại, tiếp tục các chiến lược khác
                    }
                }
            }
        }

        // Chiến lược 3: Thử phân tích dưới dạng JSON mỗi dòng (ndjson)
        const nd = this.tryParseNdjson(txt);
        if (nd) {
            const filtered = this.filterValidUseCases(nd);
            if (filtered.length > 0) {
                return { items: filtered, incomplete: false };
            }
        }

        // Chiến lược 4 (Fallback): Dùng regex để tìm tất cả các object JSON có thể có
        const objMatches = txt.match(/\{[\s\S]*?\}/g);
        if (objMatches && objMatches.length > 0) {
            const parsedObjs: any[] = [];
            for (const m of objMatches) {
                try {
                    parsedObjs.push(JSON.parse(m));
                } catch {
                    // Bỏ qua các object không thể parse
                }
            }
            if (parsedObjs.length > 0) {
                const filtered = this.filterValidUseCases(parsedObjs);
                if (filtered.length > 0) {
                    return { items: filtered, incomplete: true };
                }
            }
        }

        // Nếu tất cả các chiến lược đều thất bại, trả về mảng rỗng
        return { items: [], incomplete: true };
    }

    private filterValidUseCases(items: any[]): any[] {
        if (!Array.isArray(items)) return [];
        return items.filter(item =>
            item &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            ((typeof item.name === 'string' && item.name.trim() !== '') ||
                (typeof item.goal === 'string' && item.goal.trim() !== ''))
        );
    }

    private safeJsonParse(txt: string): any[] {
        const result = this.safeJsonParseRobust(txt);
        if (!Array.isArray(result.items)) return [];

        return result.items
            .map((it: any) => {
                if (typeof it === "string") {
                    return { name: it };
                }
                // Normalize role field to match new schema
                if (it.role && typeof it.role === 'string') {
                    it.role = {
                        id: `role_${it.role.toLowerCase().replace(/\s+/g, '_')}`,
                        name: it.role
                    };
                } else if (it.role && typeof it.role === 'object' && !it.role.id) {
                    // Ensure role has id if it's already an object
                    it.role.id = `role_${it.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`;
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
                const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

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
                console.error(" addRelatedUseCases error:", err);
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
        console.log(` Analyzing text with Gemini (lang: ${language}). Text length: ${cleanText?.length ?? 0}`);

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
                    const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

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
                            // Normalize role to match new schema
                            if (it.role && typeof it.role === 'string') {
                                it.role = {
                                    id: `role_${it.role.toLowerCase().replace(/\s+/g, '_')}`,
                                    name: it.role
                                };
                            } else if (it.role && typeof it.role === 'object' && !it.role.id) {
                                // Ensure role has id if it's already an object
                                it.role.id = `role_${it.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`;
                            }
                            return it;
                        });
                        allResults = allResults.concat(normalized);
                        console.log(` Parsed ${normalized.length} items (incomplete=${parsed.incomplete}). total=${allResults.length}`);
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
                    console.error(` Gemini key ${k._id} failed:`, err?.message || err);
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
                const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                let text: string = resp?.response?.text?.() || "{}";
                text = this.cleanJsonString(text);

                //  Debug log
                console.log("🔎 Gemini conflict check raw response:", text);

                const parsed = JSON.parse(text.trim());

                if (typeof parsed.conflict === "boolean") {
                    console.log(
                        ` Gemini conflict decision: ${parsed.conflict ? "CONFLICT" : "NO CONFLICT"} | A="${textA}" | B="${textB}"`
                    );
                    return parsed.conflict;
                } else {
                    console.warn("⚠️ Gemini did not return a valid { conflict: boolean } object:", text);
                }
            } catch (err) {
                lastError = err;
                console.error(" Gemini checkConflictWithGemini error:", err);
                continue;
            }
        }
        throw lastError || new Error("All Gemini API keys failed for conflict check");
    }

    // --- HÀM MỚI: Gọi Gemini để tìm các nhóm ID xung đột ---
    async findConflictGroups(useCases: any[], language: string): Promise<string[][]> {
        if (!useCases || useCases.length < 2) {
            return [];
        }

        const simplifiedUseCases = useCases.map(uc => ({
            id: uc.id,
            name: uc.name,
            goal: uc.goal
        }));

        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = prompts[lang].groupConflicts(JSON.stringify(simplifiedUseCases, null, 2));

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        let lastError: any;
        for (const k of keys) {
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                let text: string = resp?.response?.text?.() || "[]";
                text = this.cleanJsonString(text);
                const parsed = JSON.parse(text.trim());

                if (Array.isArray(parsed) && (parsed.length === 0 || Array.isArray(parsed[0]))) {
                    console.log(` Gemini found ${parsed.length} conflict groups.`);
                    return parsed;
                } else {
                    console.warn("⚠️ Gemini did not return a valid array of arrays:", text);
                }
            } catch (err) {
                lastError = err;
                console.error(" Gemini findConflictGroups error:", err);
                continue;
            }
        }
        throw lastError || new Error("All Gemini API keys failed for conflict grouping");
    }
}