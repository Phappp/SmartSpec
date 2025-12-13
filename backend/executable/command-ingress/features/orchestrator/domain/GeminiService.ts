import { Types } from "mongoose";
import { ApiKeyService } from "./ApiKeyService";
import { logApiUsage, extractGeminiTokens } from "../../stats/domain/apiUsageLogger";

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
Mỗi use case PHẢI có đầy đủ các trường sau (KHÔNG bao gồm field "id" - hệ thống sẽ tự tạo):
[
  {
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
    "related_usecases": []
  }
]

 **QUY TẮC XỬ LÝ**:
• Mỗi lần trả về TỐI ĐA ${batchSize} use case
• Bắt đầu từ use case số ${offset + 1}
• QUAN TRỌNG: Nếu đã phân tích hết tất cả use case từ văn bản → TRẢ VỀ NGAY mảng rỗng []
• KHÔNG được tạo use case mới nếu đã phân tích hết nội dung
• KHÔNG được lặp lại các use case đã trả về ở các batch trước
• Ưu tiên chức năng phần mềm cốt lõi
• Quy trình phức tạp → tách thành nhiều use case
• Không rõ vai trò → mặc định "Người dùng hệ thống"
• KHÔNG thêm field "id" vào response - hệ thống sẽ tự tạo identifier

 **KIỂM TRA CUỐI**:
✓ KHÔNG có thao tác thủ công ngoài đời
✓ CHỈ có tương tác phần mềm
✓ Role là object đầy đủ {id, name, description}
✓ Tất cả trường đều theo đúng schema
✓ KHÔNG có field "id" trong response
✓ Related usecases để mảng rỗng [] (sẽ được xử lý sau)

`,
        relatedUseCases: (simplified: any, incremental?: boolean) => `Đây là danh sách use case phần mềm đã có:\n${JSON.stringify(simplified, null, 2)}\n\nNhiệm vụ của bạn:\n${incremental ? `- KHÔNG được xóa hoặc ghi đè related_usecases cũ.\n- Chỉ bổ sung liên kết giữa use case mới và use case cũ.` : `- Phân tích và sinh lại toàn bộ related_usecases cho tất cả use case.`}\n\nYÊU CẦU:\n- related_usecases[] chỉ tham chiếu tới use case trong danh sách trên.\n- Format: Sử dụng chính xác ID từ field "id" trong danh sách trên (ví dụ: nếu id là "507f1f77bcf86cd799439011" thì dùng "507f1f77bcf86cd799439011").\n- Nếu không có liên quan, để mảng rỗng [].\n- Trả về toàn bộ danh sách use case với related_usecases được cập nhật.\n- Giữ nguyên cấu trúc và các field khác của mỗi use case.`,
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
- Sử dụng chính xác giá trị từ field "id" trong danh sách use case trên.
- KHÔNG giải thích, KHÔNG markdown.

Ví dụ output (sử dụng ID thực tế từ danh sách):
[
  ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  ["507f1f77bcf86cd799439014", "507f1f77bcf86cd799439015"]
]
`,
        estimateUseCasesCount: (text: string) => `
Bạn là một chuyên gia phân tích yêu cầu phần mềm.

NHIỆM VỤ: Đọc toàn bộ văn bản dưới đây và ước tính số lượng use case sẽ được tạo ra.

VĂN BẢN CẦN PHÂN TÍCH:
${text}

YÊU CẦU:
- Phân tích toàn bộ văn bản một cách kỹ lưỡng
- Đếm số lượng chức năng/phân hệ/module có thể tạo use case
- Ước tính số lượng use case sẽ được generate dựa trên độ phức tạp và số lượng chức năng

TRẢ VỀ JSON:
{
  "estimated_count": 94,
  "summary": "Hệ thống quản lý với 5 module chính: User Management, Order Processing, Product Catalog, Payment Gateway, Report Generation",
  "estimated_batches": 2,
  "reasoning": "Dựa trên số lượng chức năng và độ phức tạp, ước tính sẽ có khoảng 94 usecases được tạo ra, chia thành 2 batch (50 usecases/batch)"
}

QUAN TRỌNG:
- Chỉ trả về JSON, không có markdown, không có code fence
- estimated_count phải là số nguyên dương
- estimated_batches = Math.ceil(estimated_count / 50)
- summary phải ngắn gọn, mô tả tổng quan hệ thống
`,
        generateBatchUseCases: (text: string, batchNumber: number, totalBatches: number, offset: number, batchSize: number) => ` **MỤC TIÊU**: Generate use cases từ văn bản theo batch

**VĂN BẢN GỐC**:
${text}

**BATCH THÔNG TIN**:
- Batch số: ${batchNumber}/${totalBatches}
- Bắt đầu từ use case số: ${offset + 1}
- Số lượng use case cần generate trong batch này: ${batchSize}

**YÊU CẦU**:
- Generate chính xác ${batchSize} use cases (hoặc ít hơn nếu đã hết nội dung)
- Bắt đầu từ use case số ${offset + 1}
- KHÔNG lặp lại các use case đã generate ở batch trước
- Mỗi use case phải đầy đủ thông tin (~400-500 tokens)

**CẤU TRÚC USE CASE** (giống như schema cũ):
[
  {
    "name": "Tên use case",
    "role": { "id": "...", "name": "...", "description": "..." },
    "goal": "...",
    "reason": "...",
    "tasks": [...],
    "inputs": [...],
    "outputs": [...],
    "context": "...",
    "priority": "high|medium|low",
    "feedback": "...",
    "rules": [...],
    "triggers": [...],
    "preconditions": [...],
    "postconditions": [...],
    "exceptions": [...],
    "stakeholders": [...],
    "constraints": [...],
    "related_usecases": []
  }
]

**QUAN TRỌNG**:
- Chỉ trả về JSON array, không có markdown
- Nếu đã hết nội dung để generate → trả về mảng rỗng []
- KHÔNG thêm field "id" vào response
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
Each use case MUST have the following fields (DO NOT include "id" field - system will auto-generate):
[
  {
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
    "related_usecases": []
  }
]

 **PROCESSING RULES**:
• Return MAXIMUM ${batchSize} use cases per batch
• Start from use case number ${offset + 1}
• IMPORTANT: If you have already analyzed all use cases from the text → RETURN immediately an empty array []
• DO NOT create new use cases if you have already analyzed all content
• DO NOT repeat use cases that were already returned in previous batches
• Prioritize core software functions
• Complex processes → split into multiple use cases
• Unclear role → default to "System User"
• DO NOT add "id" field to response - system will auto-generate identifier

 **FINAL CHECK**:
✓ NO manual real-world operations
✓ ONLY software interactions
✓ Role is complete object {id, name, description}
✓ All fields follow exact schema
✓ NO "id" field in response
✓ Related usecases as empty array [] (will be processed later)
:`,
        relatedUseCases: (simplified: any, incremental?: boolean) => `Here is a list of existing software use cases:\n${JSON.stringify(simplified, null, 2)}\n\nYour task:\n${incremental ? `- DO NOT delete or overwrite existing related_usecases.\n- Only add links between new and old use cases.` : `- Analyze and regenerate all related_usecases for all use cases.`}\n\nREQUIREMENTS:\n- related_usecases[] must only reference use cases from the list above.\n- Format: Use the exact ID value from the "id" field in the list above (e.g., if id is "507f1f77bcf86cd799439011", use "507f1f77bcf86cd799439011").\n- If a use case has no relations, return an empty array [].\n- Return the entire list of use cases with the 'related_usecases' field updated.\n- Keep all other fields and structure of each use case unchanged.`,
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
- Use the exact ID value from the "id" field in the use case list above.
- NO explanations, NO markdown.

Example output (using actual IDs from the list):
[
  ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  ["507f1f77bcf86cd799439014", "507f1f77bcf86cd799439015"]
]
`,
        estimateUseCasesCount: (text: string) => `
You are a software requirements analysis expert.

TASK: Read the entire text below and estimate the number of use cases that will be generated.

TEXT TO ANALYZE:
${text}

REQUIREMENTS:
- Analyze the entire text thoroughly
- Count the number of functions/modules/subsystems that can create use cases
- Estimate the number of use cases to be generated based on complexity and number of functions

RETURN JSON:
{
  "estimated_count": 94,
  "summary": "Management system with 5 main modules: User Management, Order Processing, Product Catalog, Payment Gateway, Report Generation",
  "estimated_batches": 2,
  "reasoning": "Based on the number of functions and complexity, estimated to generate approximately 94 usecases, divided into 2 batches (50 usecases/batch)"
}

IMPORTANT:
- Return ONLY JSON, no markdown, no code fence
- estimated_count must be a positive integer
- estimated_batches = Math.ceil(estimated_count / 50)
- summary must be concise, describing the system overview
`,
        generateBatchUseCases: (text: string, batchNumber: number, totalBatches: number, offset: number, batchSize: number) => ` **OBJECTIVE**: Generate use cases from text in batches

**ORIGINAL TEXT**:
${text}

**BATCH INFORMATION**:
- Batch number: ${batchNumber}/${totalBatches}
- Start from use case number: ${offset + 1}
- Number of use cases to generate in this batch: ${batchSize}

**REQUIREMENTS**:
- Generate exactly ${batchSize} use cases (or fewer if content is exhausted)
- Start from use case number ${offset + 1}
- DO NOT repeat use cases already generated in previous batches
- Each use case must have complete information (~400-500 tokens)

**USE CASE STRUCTURE** (same as previous schema):
[
  {
    "name": "Use case name",
    "role": { "id": "...", "name": "...", "description": "..." },
    "goal": "...",
    "reason": "...",
    "tasks": [...],
    "inputs": [...],
    "outputs": [...],
    "context": "...",
    "priority": "high|medium|low",
    "feedback": "...",
    "rules": [...],
    "triggers": [...],
    "preconditions": [...],
    "postconditions": [...],
    "exceptions": [...],
    "stakeholders": [...],
    "constraints": [...],
    "related_usecases": []
  }
]

**IMPORTANT**:
- Return ONLY JSON array, no markdown
- If content is exhausted → return empty array []
- DO NOT add "id" field to response
`
    }
};

export class GeminiService {
    private apiKeyService = new ApiKeyService();
    // config
    private readonly BATCH_SIZE = 20;
    private readonly MAX_BATCHES = 100;
    private readonly MAX_ATTEMPTS_PER_OFFSET = 3;
    private readonly MAX_TOTAL_USE_CASES = 500; // Giới hạn tổng số use case tối đa

    private cleanJsonString(text: string): string {
        if (!text || typeof text !== 'string') return '{}';

        const trimmed = text.trim();

        // Remove markdown code fences (```json ... ``` or ``` ... ```)
        const codeFencePattern = /```(?:json)?\s*([\s\S]*?)\s*```/g;
        const codeFenceMatch = codeFencePattern.exec(trimmed);
        if (codeFenceMatch) {
            return codeFenceMatch[1].trim();
        }

        // If no code fence, return trimmed text
        return trimmed;
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

    /**
     * ✅ CẢI THIỆN: Parse JSON robust với xử lý tốt hơn cho response bị cắt
     * - Phát hiện response bị truncate
     * - Parse từng object riêng lẻ khi array bị cắt
     * - Repair JSON bị cắt
     */
    private safeJsonParseRobust(txt: string): { items: any[]; incomplete: boolean; isTruncated?: boolean } {
        if (!txt || txt.trim().length === 0) {
            return { items: [], incomplete: false, isTruncated: false };
        }

        // Chiến lược 1: Thử phân tích toàn bộ chuỗi dưới dạng JSON array/object
        const whole = this.tryParseWhole(txt);
        if (whole) {
            const filtered = this.filterValidUseCases(whole);
            // Chỉ trả về nếu lọc ra có kết quả, hoặc nếu chuỗi gốc là một mảng rỗng '[]'
            if (filtered.length > 0 || txt.trim() === '[]') {
                return { items: filtered, incomplete: false, isTruncated: false };
            }
        }

        // Chiến lược 2: Trích xuất một mảng JSON cân bằng (thường nằm trong markdown)
        const extracted = this.extractBalancedArray(txt);
        if (extracted.jsonText) {
            try {
                const parsed = JSON.parse(extracted.jsonText);
                const items = Array.isArray(parsed) ? parsed : [parsed];
                const filtered = this.filterValidUseCases(items);
                const isTruncated = !extracted.complete;
                if (isTruncated) {
                    console.warn(`⚠️ [safeJsonParseRobust] Phát hiện response bị cắt (incomplete array). Parse được ${filtered.length} items.`);
                }
                return { items: filtered, incomplete: !extracted.complete, isTruncated };
            } catch {
                // Nếu thất bại và chuỗi không hoàn chỉnh, thử thêm ký tự đóng mảng ']'
                if (!extracted.complete) {
                    try {
                        const attempt = JSON.parse(extracted.jsonText + "]");
                        const items = Array.isArray(attempt) ? attempt : [attempt];
                        const filtered = this.filterValidUseCases(items);
                        console.warn(`⚠️ [safeJsonParseRobust] Đã repair JSON bị cắt bằng cách thêm ']'. Parse được ${filtered.length} items.`);
                        return { items: filtered, incomplete: false, isTruncated: true };
                    } catch {
                        // Thất bại, thử parse từng object riêng lẻ
                        const partialItems = this.parsePartialArray(extracted.jsonText);
                        if (partialItems.length > 0) {
                            console.warn(`⚠️ [safeJsonParseRobust] Parse từng object riêng lẻ từ array bị cắt. Parse được ${partialItems.length} items.`);
                            return { items: partialItems, incomplete: true, isTruncated: true };
                        }
                    }
                }
            }
        }

        // Chiến lược 3: Thử phân tích dưới dạng JSON mỗi dòng (ndjson)
        const nd = this.tryParseNdjson(txt);
        if (nd) {
            const filtered = this.filterValidUseCases(nd);
            if (filtered.length > 0) {
                return { items: filtered, incomplete: false, isTruncated: false };
            }
        }

        // Chiến lược 4 (Fallback): Dùng regex để tìm tất cả các object JSON có thể có
        // ✅ CẢI THIỆN: Parse từng object riêng lẻ với balanced brackets
        const parsedObjs = this.parseIndividualObjects(txt);
        if (parsedObjs.length > 0) {
            const filtered = this.filterValidUseCases(parsedObjs);
            if (filtered.length > 0) {
                console.warn(`⚠️ [safeJsonParseRobust] Parse từng object riêng lẻ (fallback strategy). Parse được ${filtered.length} items.`);
                return { items: filtered, incomplete: true, isTruncated: true };
            }
        }

        // Nếu tất cả các chiến lược đều thất bại, trả về mảng rỗng
        return { items: [], incomplete: true, isTruncated: true };
    }

    /**
     * ✅ MỚI: Parse từng object riêng lẻ từ array bị cắt
     * Tìm tất cả các object JSON hoàn chỉnh trong text, kể cả khi array bị cắt
     */
    private parsePartialArray(text: string): any[] {
        const items: any[] = [];
        let currentPos = 0;
        const startPos = text.indexOf('[');
        if (startPos === -1) return items;

        // Tìm từng object trong array
        let depth = 0;
        let objStart = -1;
        let braceDepth = 0;

        for (let i = startPos + 1; i < text.length; i++) {
            const ch = text[i];

            if (ch === '{') {
                if (braceDepth === 0) {
                    objStart = i; // Bắt đầu object mới
                }
                braceDepth++;
            } else if (ch === '}') {
                braceDepth--;
                if (braceDepth === 0 && objStart !== -1) {
                    // Đã đóng object hoàn chỉnh
                    try {
                        const objText = text.slice(objStart, i + 1);
                        const parsed = JSON.parse(objText);
                        items.push(parsed);
                    } catch {
                        // Bỏ qua object không parse được
                    }
                    objStart = -1;
                }
            } else if (ch === '[') {
                depth++;
            } else if (ch === ']') {
                depth--;
                if (depth < 0) break; // Đã ra ngoài array
            }
        }

        return items;
    }

    /**
     * ✅ MỚI: Parse từng object JSON riêng lẻ với balanced brackets
     * Tìm tất cả các object JSON hoàn chỉnh trong text
     */
    private parseIndividualObjects(text: string): any[] {
        const items: any[] = [];
        let braceDepth = 0;
        let objStart = -1;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];

            if (ch === '{') {
                if (braceDepth === 0) {
                    objStart = i; // Bắt đầu object mới
                }
                braceDepth++;
            } else if (ch === '}') {
                braceDepth--;
                if (braceDepth === 0 && objStart !== -1) {
                    // Đã đóng object hoàn chỉnh
                    try {
                        const objText = text.slice(objStart, i + 1);
                        const parsed = JSON.parse(objText);
                        // Chỉ thêm nếu là object hợp lệ (có name hoặc goal)
                        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                            items.push(parsed);
                        }
                    } catch {
                        // Bỏ qua object không parse được
                    }
                    objStart = -1;
                }
            }
        }

        return items;
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
                // Bỏ field 'id' từ Gemini response và tạo _id mới
                if (it.id) {
                    delete it.id;
                }
                // Tạo _id nếu chưa có
                if (!it._id) {
                    it._id = new Types.ObjectId();
                }
                return it;
            })
            .filter(Boolean);
    }

    /**
     * ✅ MỚI: Build prompt đơn giản cho single call - yêu cầu trả về TẤT CẢ usecases
     */
    private buildPromptSimple(cleanText: string, language: string): string {
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const schemaDescription = prompts[lang].schemaDescription(500, 0); // Large batch size, offset 0

        // Thêm instruction rõ ràng: trả về TẤT CẢ usecases
        const instruction = lang === 'vi-VN'
            ? `\n\n**QUAN TRỌNG**: Phân tích TOÀN BỘ văn bản và trả về TẤT CẢ use cases bạn tìm thấy. Không bỏ sót bất kỳ use case nào.`
            : `\n\n**IMPORTANT**: Analyze the ENTIRE text and return ALL use cases you find. Do not miss any use cases.`;

        return `${schemaDescription}${instruction}\n\nVăn bản nguồn (Source text):\n${cleanText}`;
    }

    private buildPrompt(cleanText: string, language: string, offset = 0, batchSize = 20): string {
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const schemaDescription = prompts[lang].schemaDescription(batchSize, offset);

        // ✅ Validate và clean text trước khi build prompt (sync để không làm chậm)
        // Sử dụng require để tránh async trong sync function
        const textPreprocessor = require("../../../shared/textPreprocessor");
        const validation = textPreprocessor.validateTextForLLM(cleanText);

        if (!validation.isValid) {
            console.warn(`⚠️ Invalid text in buildPrompt (offset=${offset}):`, validation.warnings);
        }

        if (validation.warnings.length > 0 && offset % 10 === 0) {
            // Chỉ log warnings mỗi 10 batches để tránh spam log
            console.warn(`⚠️ Text warnings in buildPrompt (offset=${offset}):`, validation.warnings.slice(0, 2));
        }

        // Sử dụng cleaned text
        const safeText = validation.cleanedText;

        // Kiểm tra token limit (ước tính) - chỉ cảnh báo nếu quá lớn
        if (validation.estimatedTokens > 100000) {
            console.warn(`⚠️ Chunk quá lớn (${validation.estimatedTokens} tokens, offset=${offset}). Có thể LLM không đọc hết.`);
        }

        return `${schemaDescription}\n\nVăn bản nguồn (Source text):\n${safeText}`;
    }

    /**
     * ✅ MỚI: Normalize use cases từ parsed items
     */
    private normalizeUseCases(items: any[]): any[] {
        return items.map((it: any) => {
            if (typeof it === "string") return { name: it };

            // Normalize role
            if (it.role && typeof it.role === 'string') {
                it.role = {
                    id: `role_${it.role.toLowerCase().replace(/\s+/g, '_')}`,
                    name: it.role
                };
            } else if (it.role && typeof it.role === 'object' && !it.role.id) {
                it.role.id = `role_${it.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`;
            }

            // Remove id field (system will generate)
            if (it.id) {
                delete it.id;
            }

            // Generate _id if not exists
            if (!it._id) {
                it._id = new Types.ObjectId();
            }

            return it;
        }).filter(uc =>
            uc && typeof uc === 'object' &&
            ((uc.name && typeof uc.name === 'string' && uc.name.trim() !== '') ||
                (uc.goal && typeof uc.goal === 'string' && uc.goal.trim() !== ''))
        );
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

        const simplified = useCases.map((u) => ({ id: u._id ? String(u._id) : '', name: u.name, goal: u.goal }));
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const basePrompt = prompts[lang].relatedUseCases(simplified, options?.incremental);

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        for (const k of keys) {
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const modelName = k.model_name || 'gemini-2.0-flash-001';
                const model = client.getGenerativeModel({ model: modelName });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: basePrompt }] }],
                });

                let text: string = resp?.response?.text?.() || "[]";
                text = this.cleanJsonString(text);
                const parsed = this.safeJsonParse(text);

                if (Array.isArray(parsed)) {
                    // Tạo mapping từ id (từ Gemini response) sang _id (trong useCases)
                    const updated = useCases.map((u) => {
                        const uId = u._id ? String(u._id) : '';
                        // Tìm match theo _id hoặc id (nếu Gemini trả về id cũ)
                        const match = parsed.find((p: any) => {
                            const pId = p._id ? String(p._id) : (p.id || '');
                            return pId === uId;
                        });

                        if (match && Array.isArray(match.related_usecases)) {
                            // Map related_usecases từ id cũ (UC1) sang _id mới
                            const mappedRelated = match.related_usecases.map((refId: string) => {
                                // Nếu refId là format cũ (UC1, UC2), tìm trong parsed để lấy _id tương ứng
                                if (refId.match(/^UC\d+$/)) {
                                    const refUseCase = parsed.find((p: any) => p.id === refId || p._tempOldId === refId);
                                    if (refUseCase && refUseCase._id) {
                                        return String(refUseCase._id);
                                    }
                                    // Nếu không tìm thấy trong parsed, tìm trong useCases
                                    // (trường hợp này ít xảy ra vì Gemini chỉ trả về related trong cùng batch)
                                }
                                // Nếu refId đã là _id, giữ nguyên
                                return refId;
                            }).filter(Boolean);

                            return { ...u, related_usecases: mappedRelated };
                        }
                        return u;
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

    /**
     * ✅ MỚI: Estimate số lượng usecases sẽ được generate
     */
    async estimateUseCasesCount(
        text: string,
        language: string = 'vi-VN',
        modelName?: string,
        userId?: string,
        projectId?: string
    ): Promise<{
        estimated_count: number;
        summary: string;
        estimated_batches: number;
        reasoning?: string;
    }> {
        console.log(`📊 [ESTIMATE] Estimating use cases count. Text length: ${text?.length ?? 0} chars`);

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = prompts[lang].estimateUseCasesCount(text);

        // Thử từng key cho đến khi thành công
        for (const k of keys) {
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const effectiveModelName = modelName || k.model_name || 'gemini-2.0-flash-001';
                const model = client.getGenerativeModel({ model: effectiveModelName });

                const startTime = Date.now();
                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                const responseTime = Date.now() - startTime;
                const tokens = extractGeminiTokens(resp);

                // Log API usage
                logApiUsage({
                    api_key_id: k._id.toString(),
                    provider: 'gemini',
                    model_name: effectiveModelName,
                    user_id: userId,
                    project_id: projectId,
                    request_type: 'text',
                    endpoint: 'estimateUseCasesCount',
                    ...tokens,
                    status: 'success',
                    status_code: 200,
                    response_time: responseTime,
                }).catch(err => console.error('Failed to log API usage:', err));

                let text: string = resp?.response?.text?.() || "{}";

                // Log raw response for debugging
                console.log(`🔍 [ESTIMATE] Raw response (first 500 chars): ${text.substring(0, 500)}`);

                text = this.cleanJsonString(text);

                // Try to parse as JSON object (not array)
                let parsed: any = null;
                try {
                    parsed = JSON.parse(text);
                } catch (parseError: any) {
                    // Try to extract JSON object from text if it's wrapped in markdown or has extra text
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            parsed = JSON.parse(jsonMatch[0]);
                        } catch (e) {
                            console.error(`❌ [ESTIMATE] Failed to parse JSON: ${parseError.message}`);
                            console.error(`❌ [ESTIMATE] Cleaned text: ${text.substring(0, 1000)}`);
                            throw new Error(`Invalid JSON format: ${parseError.message}`);
                        }
                    } else {
                        console.error(`❌ [ESTIMATE] No JSON object found in response`);
                        console.error(`❌ [ESTIMATE] Cleaned text: ${text.substring(0, 1000)}`);
                        throw new Error("No JSON object found in response");
                    }
                }

                // Validate parsed object
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    const estimate = parsed as any;

                    // Validate required fields
                    if (typeof estimate.estimated_count !== 'number' || estimate.estimated_count < 1) {
                        console.error(`❌ [ESTIMATE] Invalid estimated_count: ${estimate.estimated_count}`);
                        throw new Error(`Invalid estimated_count: must be a positive number, got ${estimate.estimated_count}`);
                    }

                    const estimated_count = Math.max(1, Math.floor(estimate.estimated_count || 1));
                    const estimated_batches = Math.ceil(estimated_count / 50);

                    console.log(`✅ [ESTIMATE] Estimated ${estimated_count} use cases, ${estimated_batches} batches`);

                    return {
                        estimated_count,
                        summary: estimate.summary || 'System analysis',
                        estimated_batches,
                        reasoning: estimate.reasoning
                    };
                }

                console.error(`❌ [ESTIMATE] Parsed result is not a valid object. Type: ${typeof parsed}, IsArray: ${Array.isArray(parsed)}`);
                console.error(`❌ [ESTIMATE] Parsed value: ${JSON.stringify(parsed).substring(0, 500)}`);
                throw new Error("Invalid estimate response format: expected JSON object, got " + (Array.isArray(parsed) ? "array" : typeof parsed));
            } catch (err: any) {
                console.error(`❌ [ESTIMATE] Error with key ${k._id}:`, err.message);
                const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
                const errorInfo = analyzeApiKeyError(err);

                if (!errorInfo.retryable) {
                    throw err;
                }
                continue;
            }
        }

        throw new Error("All Gemini API keys failed for estimate");
    }

    /**
     * ✅ MỚI: Generate usecases theo batch
     */
    async generateUseCasesBatch(
        text: string,
        batchNumber: number,
        totalBatches: number,
        offset: number,
        batchSize: number = 50,
        language: string = 'vi-VN',
        modelName?: string,
        userId?: string,
        projectId?: string
    ): Promise<any[]> {
        console.log(`📦 [BATCH ${batchNumber}/${totalBatches}] Generating use cases ${offset + 1} to ${offset + batchSize}`);

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = prompts[lang].generateBatchUseCases(text, batchNumber, totalBatches, offset, batchSize);

        // Thử từng key cho đến khi thành công
        for (const k of keys) {
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const effectiveModelName = modelName || k.model_name || 'gemini-2.0-flash-001';
                const model = client.getGenerativeModel({ model: effectiveModelName });

                const startTime = Date.now();
                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                const responseTime = Date.now() - startTime;
                const tokens = extractGeminiTokens(resp);

                // Log API usage
                logApiUsage({
                    api_key_id: k._id.toString(),
                    provider: 'gemini',
                    model_name: effectiveModelName,
                    user_id: userId,
                    project_id: projectId,
                    request_type: 'text',
                    endpoint: 'generateUseCasesBatch',
                    ...tokens,
                    status: 'success',
                    status_code: 200,
                    response_time: responseTime,
                }).catch(err => console.error('Failed to log API usage:', err));

                let responseText: string = resp?.response?.text?.() || "[]";
                responseText = this.cleanJsonString(responseText);

                const parsed = this.safeJsonParseRobust(responseText);
                const useCases = parsed.items || [];

                if (useCases.length === 0) {
                    console.log(`⏩ [BATCH ${batchNumber}/${totalBatches}] No more use cases to generate`);
                    return [];
                }

                const normalized = this.normalizeUseCases(useCases);
                console.log(`✅ [BATCH ${batchNumber}/${totalBatches}] Generated ${normalized.length} use cases`);

                return normalized;
            } catch (err: any) {
                console.error(`❌ [BATCH ${batchNumber}/${totalBatches}] Error with key ${k._id}:`, err.message);
                const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
                const errorInfo = analyzeApiKeyError(err);

                if (!errorInfo.retryable) {
                    throw err;
                }
                continue;
            }
        }

        throw new Error(`All Gemini API keys failed for batch ${batchNumber}`);
    }

    /**
     * ✅ REFACTORED: Phân tích requirements với logic đơn giản hơn
     * - Text nhỏ (< 80% context window): Single call, trả về TẤT CẢ usecases
     * - Text lớn: Đã được chunk ở RequirementService, mỗi chunk gọi 1 lần
     * ⚠️ DEPRECATED: Sẽ được thay thế bởi estimateUseCasesCount + generateUseCasesBatch
     */
    async analyzeRequirements(
        cleanText: string,
        language: string,
        userId?: string,
        projectId?: string,
        chunkIndex?: number,
        totalChunks?: number
    ): Promise<any[]> {
        const chunkLabel = chunkIndex ? `[Chunk ${chunkIndex}${totalChunks ? `/${totalChunks}` : ''}]` : '';
        console.log(`${chunkLabel} Analyzing text with Gemini (lang: ${language}). Text length: ${cleanText?.length ?? 0}`);

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        // ✅ Lấy model config để quyết định strategy
        const { getModelConfig, estimateTokens, determineStrategy } = await import("../../../shared/tokenManager");
        const firstKey = keys[0];
        const modelConfig = getModelConfig(firstKey.model_name || 'gemini-2.0-flash', 'gemini');
        const estimatedTokens = estimateTokens(cleanText, modelConfig);
        const strategy = determineStrategy(cleanText, modelConfig);

        console.log(`${chunkLabel} 📊 Token Analysis: ${estimatedTokens.toLocaleString()} tokens, Context Window: ${modelConfig.contextWindow.toLocaleString()}, Strategy: ${strategy.strategy}`);

        // ✅ QUAN TRỌNG: Nếu text vừa với context window (< 80%) → single call, không batch
        const contextThreshold = modelConfig.contextWindow * 0.8; // 80% để reserve cho prompt và output
        const useSimpleStrategy = estimatedTokens < contextThreshold && !strategy.needsChunking;

        if (useSimpleStrategy) {
            console.log(`${chunkLabel} ✅ Text nhỏ (${estimatedTokens.toLocaleString()} < ${Math.floor(contextThreshold).toLocaleString()} tokens). Sử dụng single call strategy.`);
            return await this.analyzeRequirementsSingleCall(cleanText, language, keys, modelConfig, userId, projectId, chunkLabel);
        } else {
            // Text lớn hoặc đã được chunk → sử dụng batch strategy (giữ logic cũ nhưng tối ưu)
            console.log(`${chunkLabel} 📦 Text lớn hoặc đã chunk. Sử dụng batch strategy.`);
            return await this.analyzeRequirementsBatch(cleanText, language, keys, modelConfig, userId, projectId, chunkLabel);
        }
    }

    /**
     * ✅ MỚI: Single call strategy - gọi 1 lần, trả về TẤT CẢ usecases
     * Dùng cho text nhỏ vừa với context window
     */
    private async analyzeRequirementsSingleCall(
        cleanText: string,
        language: string,
        keys: { _id: string; key_value: string; model_name: string }[],
        modelConfig: any,
        userId?: string,
        projectId?: string,
        chunkLabel?: string
    ): Promise<any[]> {
        const prompt = this.buildPromptSimple(cleanText, language);

        // Thử từng key cho đến khi thành công
        for (const k of keys) {
            try {
                console.log(`${chunkLabel} 🔑 Trying Gemini key: ${k.key_value.slice(0, 12)}... (single call)`);
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const modelName = k.model_name || 'gemini-2.0-flash-001';
                const model = client.getGenerativeModel({ model: modelName });

                const startTime = Date.now();
                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                const responseTime = Date.now() - startTime;
                const tokens = extractGeminiTokens(resp);

                // Log API usage
                logApiUsage({
                    api_key_id: k._id.toString(),
                    provider: 'gemini',
                    model_name: modelName,
                    user_id: userId,
                    project_id: projectId,
                    request_type: 'text',
                    endpoint: 'analyzeRequirements',
                    ...tokens,
                    status: 'success',
                    status_code: 200,
                    response_time: responseTime,
                }).catch(err => console.error('Failed to log API usage:', err));

                let text: string = resp?.response?.text?.() || "";
                text = this.cleanJsonString(text);
                console.log(`${chunkLabel} 🤖 Gemini response length: ${text.length} (single call)`);

                // Parse và normalize
                const parsed = this.safeJsonParseRobust(text);

                // ✅ CẢI THIỆN: Log chi tiết về truncation trong single call
                if (parsed.isTruncated) {
                    console.warn(`${chunkLabel} ⚠️ PHÁT HIỆN RESPONSE BỊ CẮT trong single call! Parse được ${parsed.items.length} items từ response dài ${text.length} chars.`);
                    console.warn(`${chunkLabel} ⚠️ Response preview (last 500 chars): ${text.slice(-500)}`);
                    console.warn(`${chunkLabel} ⚠️ LƯU Ý: Single call strategy không thể retry. Có thể cần chuyển sang batch strategy cho text lớn.`);
                }

                if (parsed.items.length === 0) {
                    console.log(`${chunkLabel} ✅ No use cases found in response.`);
                    return [];
                }

                const normalizeStartTime = Date.now();
                const normalized = this.normalizeUseCases(parsed.items);
                const normalizeTime = Date.now() - normalizeStartTime;
                console.log(`${chunkLabel} ✅ Parsed ${normalized.length} use cases from single call (normalize took ${normalizeTime}ms, truncated=${parsed.isTruncated || false}).`);

                // ✅ QUAN TRỌNG: Return ngay sau khi parse xong để tránh timeout
                // ⚠️ Nếu response bị cắt, có thể cần chuyển sang batch strategy
                return normalized;

            } catch (err: any) {
                const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
                const errorInfo = analyzeApiKeyError(err);

                console.error(`${chunkLabel} ❌ Gemini key ${k._id} failed:`, err?.message || err, `[${errorInfo.type}]`);

                // Disable key nếu cần
                if (errorInfo.shouldDisableKey) {
                    try {
                        await this.apiKeyService.disableKey(k._id);
                        console.warn(`${chunkLabel} ⚠️ Disabled ${errorInfo.type} Gemini key: ${k._id}`);
                    } catch { /* ignore */ }
                }

                // Nếu không retryable, throw ngay
                if (!errorInfo.retryable) {
                    const { ApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
                    throw new ApiKeyError(err, 'vi');
                }

                // Tiếp tục thử key tiếp theo
                continue;
            }
        }

        throw new Error("All Gemini API keys failed");
    }

    /**
     * Batch strategy - giữ logic cũ nhưng tối ưu
     * Dùng cho text lớn hoặc đã được chunk
     */
    private async analyzeRequirementsBatch(
        cleanText: string,
        language: string,
        keys: { _id: string; key_value: string; model_name: string }[],
        modelConfig: any,
        userId?: string,
        projectId?: string,
        chunkLabel?: string
    ): Promise<any[]> {
        let allResults: any[] = [];
        let offset = 0;
        let batchCount = 0;
        let lastError: any = null;
        let consecutiveEmptyBatches = 0;
        let lastOffset = 0;

        while (batchCount < this.MAX_BATCHES) {
            batchCount++;
            let gotBatch = false;
            let attemptsForThisOffset = 0;

            if (allResults.length >= this.MAX_TOTAL_USE_CASES) {
                console.warn(`${chunkLabel} ⚠️ Đã đạt giới hạn tối đa ${this.MAX_TOTAL_USE_CASES} use case. Dừng xử lý.`);
                return allResults.slice(0, this.MAX_TOTAL_USE_CASES);
            }

            for (const k of keys) {
                if (attemptsForThisOffset >= this.MAX_ATTEMPTS_PER_OFFSET) break;
                attemptsForThisOffset++;

                const key = k.key_value;
                const startTime = Date.now();
                try {
                    console.log(`${chunkLabel} 🔑 Trying Gemini key: ${key.slice(0, 12)}... (offset=${offset}, batch=${batchCount})`);
                    const { GoogleGenerativeAI } = await import("@google/generative-ai");
                    const client = new GoogleGenerativeAI(key);
                    const modelName = k.model_name || 'gemini-2.0-flash-001';
                    const model = client.getGenerativeModel({ model: modelName });

                    const prompt = this.buildPrompt(cleanText, language, offset, this.BATCH_SIZE);

                    const resp: any = await model.generateContent({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                    });

                    const responseTime = Date.now() - startTime;
                    const tokens = extractGeminiTokens(resp);

                    // Log API usage
                    logApiUsage({
                        api_key_id: k._id.toString(),
                        provider: 'gemini',
                        model_name: modelName,
                        user_id: userId,
                        project_id: projectId,
                        request_type: 'text',
                        endpoint: 'analyzeRequirements',
                        ...tokens,
                        status: 'success',
                        status_code: 200,
                        response_time: responseTime,
                    }).catch(err => console.error('Failed to log API usage:', err));

                    let text: string = resp?.response?.text?.() || "";
                    text = this.cleanJsonString(text);
                    console.log(`${chunkLabel} 🤖 Gemini response length: ${text.length}, offset=${offset}, batch=${batchCount}`);

                    // Kiểm tra sớm nếu response là mảng rỗng
                    if (text.trim() === "[]" || text.trim().length === 0) {
                        console.log(`✅ Gemini trả về mảng rỗng. Đã xử lý xong. Tổng: ${allResults.length} use case`);
                        return allResults;
                    }

                    const parsed = this.safeJsonParseRobust(text);

                    // ✅ CẢI THIỆN: Log chi tiết về truncation
                    if (parsed.isTruncated) {
                        console.warn(`${chunkLabel} ⚠️ PHÁT HIỆN RESPONSE BỊ CẮT! Parse được ${parsed.items.length} items từ response dài ${text.length} chars.`);
                        console.warn(`${chunkLabel} ⚠️ Response preview (last 500 chars): ${text.slice(-500)}`);
                    }

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
                            // Bỏ field 'id' từ Gemini response và tạo _id mới
                            const tempId = it.id; // Lưu tạm id từ Gemini để xử lý related_usecases sau
                            if (it.id) {
                                delete it.id;
                            }
                            // Tạo _id nếu chưa có
                            if (!it._id) {
                                it._id = new Types.ObjectId();
                            }
                            // Lưu mapping từ id cũ sang _id mới để xử lý related_usecases
                            if (tempId) {
                                it._tempOldId = tempId;
                            }
                            return it;
                        });

                        // Xử lý related_usecases: map từ id cũ (UC1, UC2) sang _id mới
                        const idToNewIdMap = new Map<string, string>();
                        normalized.forEach((uc: any) => {
                            if (uc._tempOldId && uc._id) {
                                idToNewIdMap.set(uc._tempOldId, String(uc._id));
                            }
                        });

                        // Cập nhật related_usecases trong normalized array
                        normalized.forEach((uc: any) => {
                            if (Array.isArray(uc.related_usecases) && uc.related_usecases.length > 0) {
                                uc.related_usecases = uc.related_usecases
                                    .map((oldId: string) => idToNewIdMap.get(oldId) || oldId)
                                    .filter((newId: string) => idToNewIdMap.has(newId) || normalized.some((x: any) => String(x._id) === newId));
                            }
                            // Xóa temp field
                            delete uc._tempOldId;
                        });

                        // Lọc lại để đảm bảo chỉ có use case hợp lệ (có name hoặc goal)
                        const validNormalized = normalized.filter(uc =>
                            uc && typeof uc === 'object' &&
                            ((uc.name && typeof uc.name === 'string' && uc.name.trim() !== '') ||
                                (uc.goal && typeof uc.goal === 'string' && uc.goal.trim() !== ''))
                        );

                        // Nếu không có items hợp lệ từ response, log warning và xử lý
                        if (validNormalized.length === 0) {
                            console.warn(`⚠️ Response không chứa use case hợp lệ nào sau khi filter. Parsed items: ${parsed.items.length}, Normalized: ${normalized.length}, Response length: ${text.length}`);
                            // Không cập nhật offset nếu không có items
                            // Nhưng vẫn break để thử batch tiếp theo hoặc dừng nếu đã hết
                            if (!parsed.incomplete) {
                                // Response hoàn chỉnh nhưng không có items → có thể đã hết
                                console.log(`✅ Response hoàn chỉnh nhưng không có use case hợp lệ. Có thể đã phân tích hết.`);
                                return allResults;
                            }
                            break; // Thử batch tiếp theo hoặc key tiếp theo
                        }

                        // Kiểm tra nếu offset không tăng (có thể Gemini đang lặp lại)
                        // CHỈ kiểm tra sau batch đầu tiên (khi lastOffset đã được set từ batch trước)
                        // Và CHỈ khi có items hợp lệ (validNormalized.length > 0)
                        if (lastOffset !== 0 && offset === lastOffset && validNormalized.length > 0) {
                            console.warn(`⚠️ Phát hiện offset không tăng (${offset}). Có thể Gemini đang lặp lại. Dừng xử lý.`);
                            return allResults;
                        }

                        allResults = allResults.concat(validNormalized);
                        console.log(`${chunkLabel} ✅ Parsed ${validNormalized.length} valid items from ${parsed.items.length} parsed items (incomplete=${parsed.incomplete}, truncated=${parsed.isTruncated || false}). total=${allResults.length}, offset=${offset} → ${offset + validNormalized.length}`);

                        lastOffset = offset;
                        offset += validNormalized.length;
                        gotBatch = true;
                        consecutiveEmptyBatches = 0; // Reset counter khi có items mới

                        // Kiểm tra giới hạn tổng số use case sau khi thêm
                        if (allResults.length >= this.MAX_TOTAL_USE_CASES) {
                            console.warn(`⚠️ Đã đạt giới hạn tối đa ${this.MAX_TOTAL_USE_CASES} use case. Dừng xử lý.`);
                            return allResults.slice(0, this.MAX_TOTAL_USE_CASES);
                        }

                        // ✅ CẢI THIỆN: Xử lý response bị cắt
                        if (parsed.isTruncated) {
                            console.warn(`${chunkLabel} ⚠️ Response bị cắt nhưng đã parse được ${validNormalized.length} items. Tiếp tục batch tiếp theo để lấy phần còn lại.`);
                            // Không dừng, tiếp tục batch tiếp theo với offset mới
                            // Có thể retry với chunk nhỏ hơn nếu cần
                            break;
                        }

                        // Dừng nếu response hoàn chỉnh và số lượng < BATCH_SIZE (đã hết use case)
                        if (!parsed.incomplete && validNormalized.length < this.BATCH_SIZE) {
                            console.log(`✅ Response hoàn chỉnh và số lượng (${validNormalized.length}) < BATCH_SIZE (${this.BATCH_SIZE}). Đã xử lý xong.`);
                            return allResults;
                        } else {
                            break;
                        }
                    } else {
                        // Không có items hợp lệ từ response
                        consecutiveEmptyBatches++;
                        console.warn(`⚠️ No parsable items from key ${key.slice(0, 12)}. Response preview: ${text.slice(0, 200)}`);

                        // Nếu có 2 batch liên tiếp không có items → dừng
                        if (consecutiveEmptyBatches >= 2) {
                            console.warn(`⚠️ Có ${consecutiveEmptyBatches} batch liên tiếp không có items. Dừng xử lý.`);
                            return allResults;
                        }

                        if (text.trim() === "[]" || text.trim().length === 0) {
                            console.log(`✅ Response rỗng. Đã xử lý xong. Tổng: ${allResults.length} use case`);
                            return allResults;
                        }
                        lastError = new Error("No parsable items");
                        continue;
                    }
                } catch (err: any) {
                    const responseTime = Date.now() - startTime;

                    // Phân tích lỗi API key
                    const { analyzeApiKeyError, ApiKeyErrorType } = await import("../../../shared/apiKeyErrorHandler");
                    const errorInfo = analyzeApiKeyError(err);
                    lastError = err;

                    console.error(`❌ Gemini key ${k._id} failed:`, err?.message || err, `[${errorInfo.type}]`);

                    // Log failed API usage
                    const modelName = k.model_name || 'gemini-2.0-flash-001';
                    logApiUsage({
                        api_key_id: k._id.toString(),
                        provider: 'gemini',
                        model_name: modelName,
                        user_id: userId,
                        project_id: projectId,
                        request_type: 'text',
                        endpoint: 'analyzeRequirements',
                        status: 'failed',
                        status_code: err.status || err.statusCode || 500,
                        error_message: err.message || 'Unknown error',
                        error_type: errorInfo.type,
                        response_time: responseTime,
                    }).catch(logErr => console.error('Failed to log API usage:', logErr));

                    // Disable key nếu cần (invalid, unauthorized)
                    if (errorInfo.shouldDisableKey) {
                        try {
                            await this.apiKeyService.disableKey(k._id);
                            console.warn(`⚠️ Disabled ${errorInfo.type} Gemini key: ${k._id}`);
                        } catch { /* ignore */ }
                    }

                    // ✅ THAY ĐỔI: Lưu lại lỗi nhưng tiếp tục thử các key khác
                    // Chỉ throw error khi đã thử hết tất cả các key
                    console.warn(`${chunkLabel} ⚠️ Key ${k._id} failed (${errorInfo.type}), trying next key...`);
                    continue;
                }
            } // end for keys

            if (!gotBatch) {
                consecutiveEmptyBatches++;
                console.warn(`${chunkLabel} ⚠️ Could not fetch a valid batch for current offset. Consecutive empty batches: ${consecutiveEmptyBatches}`);

                // Nếu có 2 batch liên tiếp không lấy được data → dừng
                if (consecutiveEmptyBatches >= 2) {
                    console.warn(`${chunkLabel} ⚠️ Có ${consecutiveEmptyBatches} batch liên tiếp không lấy được data. Dừng xử lý.`);
                    break;
                }
            } else {
                consecutiveEmptyBatches = 0; // Reset counter khi có batch thành công
            }
        } // end while

        console.log(`${chunkLabel} 📊 Kết thúc vòng lặp. Tổng số use case: ${allResults.length}, batch count: ${batchCount}`);

        // ✅ QUAN TRỌNG: Nếu có partial results, luôn return chúng thay vì throw error
        // Điều này đảm bảo dữ liệu đã generate được không bị mất
        if (allResults.length > 0) {
            if (lastError) {
                // Có lỗi nhưng đã có partial results → log warning nhưng vẫn return
                const { analyzeApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
                const errorInfo = analyzeApiKeyError(lastError);
                console.warn(`${chunkLabel} ⚠️ Có lỗi trong quá trình generate (${errorInfo.type}), nhưng đã có ${allResults.length} use cases. Trả về partial results.`);
            }
            return allResults;
        }

        // Chỉ throw error khi KHÔNG có partial results nào
        if (lastError) {
            const { ApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
            throw new ApiKeyError(lastError, 'vi');
        }

        throw new Error("All Gemini API keys failed or no parsable output");
    }

    async checkConflictWithGemini(textA: string, textB: string, language: string, userId?: string, projectId?: string): Promise<boolean> {
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = prompts[lang].conflictCheck(textA, textB);

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        let lastError: any;
        for (const k of keys) {
            const startTime = Date.now();
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const modelName = k.model_name || 'gemini-2.0-flash-001';
                const model = client.getGenerativeModel({ model: modelName });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                const responseTime = Date.now() - startTime;
                const tokens = extractGeminiTokens(resp);

                logApiUsage({
                    api_key_id: k._id.toString(),
                    provider: 'gemini',
                    model_name: modelName,
                    user_id: userId,
                    project_id: projectId,
                    request_type: 'text',
                    endpoint: 'checkConflict',
                    ...tokens,
                    status: 'success',
                    status_code: 200,
                    response_time: responseTime,
                }).catch(err => console.error('Failed to log API usage:', err));

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
            } catch (err: any) {
                const responseTime = Date.now() - startTime;

                // Phân tích lỗi API key
                const { analyzeApiKeyError, ApiKeyErrorType } = await import("../../../shared/apiKeyErrorHandler");
                const errorInfo = analyzeApiKeyError(err);
                lastError = err;

                console.error("❌ Gemini checkConflictWithGemini error:", err, `[${errorInfo.type}]`);

                const modelName = k.model_name || 'gemini-2.0-flash-001';
                logApiUsage({
                    api_key_id: k._id.toString(),
                    provider: 'gemini',
                    model_name: modelName,
                    user_id: userId,
                    project_id: projectId,
                    request_type: 'text',
                    endpoint: 'checkConflict',
                    status: 'failed',
                    status_code: err.status || err.statusCode || 500,
                    error_message: err.message || 'Unknown error',
                    error_type: errorInfo.type,
                    response_time: responseTime,
                }).catch(logErr => console.error('Failed to log API usage:', logErr));

                // Disable key nếu cần (invalid, unauthorized)
                if (errorInfo.shouldDisableKey) {
                    try {
                        await this.apiKeyService.disableKey(k._id);
                        console.warn(`⚠️ Disabled ${errorInfo.type} Gemini key: ${k._id}`);
                    } catch { /* ignore */ }
                }

                // ✅ THAY ĐỔI: Lưu lại lỗi nhưng tiếp tục thử các key khác
                console.warn(`⚠️ Key ${k._id} failed (${errorInfo.type}), trying next key...`);
                continue;
            }
        }

        // Nếu tất cả key đều fail, throw error với thông tin chi tiết
        if (lastError) {
            const { ApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
            throw new ApiKeyError(lastError, 'vi');
        }

        throw new Error("All Gemini API keys failed for conflict check");
    }

    // --- HÀM MỚI: Gọi Gemini để tìm các nhóm ID xung đột ---
    async findConflictGroups(useCases: any[], language: string, userId?: string, projectId?: string): Promise<string[][]> {
        if (!useCases || useCases.length < 2) {
            return [];
        }

        const simplifiedUseCases = useCases.map(uc => ({
            id: uc._id ? String(uc._id) : '',
            name: uc.name,
            goal: uc.goal
        }));

        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = prompts[lang].groupConflicts(JSON.stringify(simplifiedUseCases, null, 2));

        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        let lastError: any;
        for (const k of keys) {
            const startTime = Date.now();
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const modelName = k.model_name || 'gemini-2.0-flash-001';
                const model = client.getGenerativeModel({ model: modelName });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                const responseTime = Date.now() - startTime;
                const tokens = extractGeminiTokens(resp);

                logApiUsage({
                    api_key_id: k._id.toString(),
                    provider: 'gemini',
                    model_name: modelName,
                    user_id: userId,
                    project_id: projectId,
                    request_type: 'text',
                    endpoint: 'findConflictGroups',
                    ...tokens,
                    status: 'success',
                    status_code: 200,
                    response_time: responseTime,
                }).catch(err => console.error('Failed to log API usage:', err));

                let text: string = resp?.response?.text?.() || "[]";
                text = this.cleanJsonString(text);
                const parsed = JSON.parse(text.trim());

                if (Array.isArray(parsed) && (parsed.length === 0 || Array.isArray(parsed[0]))) {
                    console.log(` Gemini found ${parsed.length} conflict groups.`);
                    return parsed;
                } else {
                    console.warn("⚠️ Gemini did not return a valid array of arrays:", text);
                }
            } catch (err: any) {
                const responseTime = Date.now() - startTime;

                // Phân tích lỗi API key
                const { analyzeApiKeyError, ApiKeyErrorType } = await import("../../../shared/apiKeyErrorHandler");
                const errorInfo = analyzeApiKeyError(err);
                lastError = err;

                console.error("❌ Gemini findConflictGroups error:", err, `[${errorInfo.type}]`);

                const modelName = k.model_name || 'gemini-2.0-flash-001';
                logApiUsage({
                    api_key_id: k._id.toString(),
                    provider: 'gemini',
                    model_name: modelName,
                    user_id: userId,
                    project_id: projectId,
                    request_type: 'text',
                    endpoint: 'findConflictGroups',
                    status: 'failed',
                    status_code: err.status || err.statusCode || 500,
                    error_message: err.message || 'Unknown error',
                    error_type: errorInfo.type,
                    response_time: responseTime,
                }).catch(logErr => console.error('Failed to log API usage:', logErr));

                // Disable key nếu cần (invalid, unauthorized)
                if (errorInfo.shouldDisableKey) {
                    try {
                        await this.apiKeyService.disableKey(k._id);
                        console.warn(`⚠️ Disabled ${errorInfo.type} Gemini key: ${k._id}`);
                    } catch { /* ignore */ }
                }

                // ✅ THAY ĐỔI: Lưu lại lỗi nhưng tiếp tục thử các key khác
                console.warn(`⚠️ Key ${k._id} failed (${errorInfo.type}), trying next key...`);
                continue;
            }
        }

        // Nếu tất cả key đều fail, throw error với thông tin chi tiết
        if (lastError) {
            const { ApiKeyError } = await import("../../../shared/apiKeyErrorHandler");
            throw new ApiKeyError(lastError, 'vi');
        }

        throw new Error("All Gemini API keys failed for conflict grouping");
    }
}