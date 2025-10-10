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
- goal (mục tiêu chính của chức năng)
- reason (tại sao chức năng này tồn tại)
- tasks[] (danh sách các bước tương tác phần mềm hỗ trợ người dùng thực hiện mục tiêu, KHÔNG phải thủ tục giấy tờ ngoài đời)
- inputs[] (dữ liệu đầu vào người dùng cung cấp hoặc hệ thống yêu cầu)
- outputs[] (dữ liệu, thông báo hoặc hành động hệ thống trả về)
- context (ngữ cảnh hoạt động hoặc mô-đun phần mềm mà use case này thuộc v)
- priority ("low"|"medium"|"high")
- feedback (phản hồi, mong đợi hoặc tiêu chí chấp nhận từ người dùng khi sử dụng chức năng)
- rules[] (quy tắc, logic xử lý hoặc điều kiện rẽ nhánh liên quan đến chức năng)
- triggers[] (sự kiện hoặc hành động khởi tạo use case này)
- preconditions[] (điều kiện phải có trước khi thực hiện)
- postconditions[] (trạng thái hệ thống sau khi hoàn tất)
- exceptions[] (các trường hợp lỗi hoặc điều kiện bất thường có thể xảy ra)
- stakeholders[] (các bên liên quan hưởng lợi hoặc bị ảnh hưởng)
- constraints[] (giới hạn, điều kiện kỹ thuật hoặc nghiệp vụ áp dụng cho chức năng)
- related_usecases[]

YÊU CẦU QUAN TRỌNG:
- OUTPUT PHẢI LÀ JSON ARRAY HỢP LỆ, PARSE ĐƯỢC NGAY.
- Nếu chỉ có 1 use case thì array vẫn phải có 1 phần tử.
- Các trường dạng danh sách luôn là array chuỗi [].
- related_usecases phải là một mảng chuỗi CHỈ chứa ID của các use case liên quan (ví dụ: ["UC1", "UC5"]). KHÔNG được bao gồm tên của use case.
- Mỗi lần chỉ trả về TỐI ĐA ${batchSize} use case.
- BẮT ĐẦU từ use case số ${offset + 1}.
- Nếu không còn use case nào thì trả về [].
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
        // --- PROMPT MỚI: Yêu cầu Gemini gom nhóm các UC trùng lặp ---
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
`,
        databaseDesign: (requirementsJson: string) => `
BẠN LÀ MỘT KỸ SƯ CSDL VÀ KIẾN TRÚC SƯ HỆ THỐNG ĐẲNG CẤP THẾ GIỚI, chuyên tạo ra các lược đồ CSDL quan hệ tối ưu và đã được chuẩn hóa từ các yêu cầu nghiệp vụ.

Nhiệm vụ của bạn là phân tích danh sách các use case của phần mềm sau đây và thiết kế một cấu trúc CSDL hoàn chỉnh và logic.

DANH SÁCH USE CASE:
${requirementsJson}

**QUAN TRỌNG:**
- Giữ response CÀNG NGẮN GỌN CÀNG TỐT, chỉ bao gồm các bảng và cột thực sự cần thiết.
- KHÔNG thêm ví dụ, giải thích, hoặc nội dung thừa.
- Ưu tiên thiết kế đơn giản, hiệu quả.

Phản hồi của bạn BẮT BUỘC CHỈ LÀ một đối tượng JSON hợp lệ. KHÔNG bao gồm bất kỳ lời giải thích, bình luận, hay định dạng markdown nào như \`\`\`json. Đầu ra phải sẵn sàng để được một chương trình phân tích ngay lập tức.

Đối tượng JSON BẮT BUỘC phải tuân thủ nghiêm ngặt cấu trúc chi tiết sau. Bao gồm TẤT CẢ các trường cho mỗi cột.
{
  "name": "TenDatabase",
  "description": "Mô tả ngắn gọn nhưng rõ ràng về mục đích của CSDL.",

  "tables": [
    {
      "name": "users",
      "description": "Lưu trữ thông tin tài khoản và thông tin xác thực của người dùng.",
      "columns": [
        { "name": "id", "type": "INT", "is_primary_key": true, "is_foreign_key": false, "nullable": false, "unique": true, "related_usecase_ids": [] },
        { "name": "username", "type": "VARCHAR(50)", "is_primary_key": false, "is_foreign_key": false, "nullable": false, "unique": true, "related_usecase_ids": ["UC1", "UC2"] },
        { "name": "email", "type": "VARCHAR(100)", "is_primary_key": false, "is_foreign_key": false, "nullable": false, "unique": true, "related_usecase_ids": ["UC2", "UC15"] },
        { "name": "password_hash", "type": "VARCHAR(255)", "is_primary_key": false, "is_foreign_key": false, "nullable": false, "unique": false, "related_usecase_ids": ["UC1", "UC2"] },
        { "name": "full_name", "type": "VARCHAR(255)", "is_primary_key": false, "is_foreign_key": false, "nullable": true, "unique": false, "related_usecase_ids": ["UC15"] }
      ]
    },
    {
        "name": "projects",
        "description": "Lưu trữ thông tin về các dự án của người dùng.",
        "columns": [
            { "name": "id", "type": "INT", "is_primary_key": true, "is_foreign_key": false, "nullable": false, "unique": true, "related_usecase_ids": [] },
            { "name": "project_name", "type": "VARCHAR(255)", "is_primary_key": false, "is_foreign_key": false, "nullable": false, "unique": false, "related_usecase_ids": ["UC5"] },
            { "name": "owner_id", "type": "INT", "is_primary_key": false, "is_foreign_key": true, "nullable": false, "unique": false, "references": "users", "related_usecase_ids": ["UC5"] },
            { "name": "created_at", "type": "DATETIME", "is_primary_key": false, "is_foreign_key": false, "nullable": false, "unique": false, "related_usecase_ids": ["UC5"] }
        ]
    }
  ],
  "relationships": [
    { "from_table": "projects", "to_table": "users", "type": "many-to-one" }
  ]
}

QUY TẮC VÀ LOGIC THIẾT KẾ:
- Tên bảng và tên cột BẮT BUỘC phải ở dạng chữ thường và dùng dấu gạch dưới (snake_case).
- Mỗi bảng BẮT BUỘC phải có MỘT VÀ CHỈ MỘT cột 'id' duy nhất làm khóa chính.
- KHÔNG ĐƯỢC sử dụng composite primary keys (nhiều cột cùng là primary key).
- Bất kỳ cột nào có 'is_primary_key' là true thì BẮT BUỘC phải có 'nullable' là false. Đây là một quy tắc nghiêm ngặt.
- Xác định chính xác tất cả các mối quan hệ (one-to-one, one-to-many,...) và định nghĩa CẢ cột khóa ngoại (với 'is_foreign_key: true' và 'references') VÀ mục tương ứng trong mảng 'relationships' chính.
- Sử dụng các kiểu dữ liệu phù hợp từ danh sách sau: INT, VARCHAR(n), TEXT, BOOLEAN, DATETIME, DATE, DECIMAL(p, s).
- Suy luận các bảng cần thiết từ các use case được cung cấp. Ví dụ: "Đăng nhập người dùng" ngụ ý cần có bảng 'users'.
- **YÊU CẦU TRUY VẾT QUAN TRỌNG**: Đối với mỗi cột riêng lẻ, bạn BẮT BUỘC phải xác định những use case nào yêu cầu sự tồn tại của nó. Điền vào mảng 'related_usecase_ids' ID của mọi use case có liên quan. Nếu một cột được yêu cầu bởi nhiều use case (ví dụ: 'username' cho cả đăng nhập và đăng ký), hãy bao gồm tất cả các ID đó. Nếu không thể xác định nguồn gốc, hãy trả về một mảng rỗng [].
`


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
- goal (the main objective or intended outcome of this function)
- reason (the rationale or purpose for why this function exists)
- tasks[] (list of interaction steps the software supports the user to perform, NOT real-world paperwork)
- inputs[] (data or parameters provided by the user or required by the system)
- outputs[] (data, messages, or system actions produced as a result)
- context (operational context or software module this use case belongs to)
- priority ("low"|"medium"|"high")
- feedback (expected user feedback, satisfaction criteria, or acceptance conditions when using this function)
- rules[] (processing logic, validation rules, or conditional branches involved in this function)
- triggers[] (events or actions that initiate this use case)
- preconditions[] (conditions that must be true before execution)
- postconditions[] (system state after successful completion)
- exceptions[] (error cases or abnormal situations that may occur)
- stakeholders[] (parties who benefit from or are affected by this function)
- constraints[] (technical or business limitations applied to this function)
- related_usecases[]

CRITICAL REQUIREMENTS:
- THE OUTPUT MUST BE A VALID, IMMEDIATELY PARSABLE JSON ARRAY.
- If there is only one use case, the array must still contain one element.
- List-type fields must always be a string array [].
- related_usecases must be a string array containing ONLY the IDs of related use cases (e.g., ["UC1", "UC5"]). DO NOT include the use case name.
- Return a MAXIMUM of ${batchSize} use cases at a time.
- START from use case number ${offset + 1}.
- If no more use cases are found, return [].
`,
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
`,
        databaseDesign: (requirementsJson: string) => `
YOU ARE A WORLD-CLASS DATABASE ENGINEER AND SYSTEM ARCHITECT, specializing in creating optimal, normalized relational database schemas from business requirements.

Your task is to analyze the following list of software use cases and design a complete and logical database structure.

LIST OF USE CASES:
${requirementsJson}

**IMPORTANT:**
- Keep the response AS CONCISE AS POSSIBLE, include only essential tables and columns.
- DO NOT add examples, explanations, or extra content.
- Prioritize simple, efficient design.

Your response MUST be ONLY a single, valid JSON object. DO NOT include any explanations, comments, or markdown formatting like \`\`\`json. The output must be ready for immediate parsing by a program.

The JSON object MUST strictly follow this detailed structure. Include ALL fields for every column.
{
  "name": "DatabaseName",
  "description": "A brief but clear description of the database's purpose.",
  "tables": [
    {
      "name": "users",
      "description": "Stores user account information and credentials.",
      "columns": [
        { "name": "id", "type": "INT", "is_primary_key": true, "is_foreign_key": false, "nullable": false, "unique": true, "related_usecase_ids": [] },
        { "name": "username", "type": "VARCHAR(50)", "is_primary_key": false, "is_foreign_key": false, "nullable": false, "unique": true, "related_usecase_ids": ["UC1", "UC2"] },
        { "name": "email", "type": "VARCHAR(100)", "is_primary_key": false, "is_foreign_key": false, "nullable": false, "unique": true, "related_usecase_ids": ["UC2", "UC15"] },
        { "name": "password_hash", "type": "VARCHAR(255)", "is_primary_key": false, "is_foreign_key": false, "nullable": false, "unique": false, "related_usecase_ids": ["UC1", "UC2"] },
        { "name": "full_name", "type": "VARCHAR(255)", "is_primary_key": false, "is_foreign_key": false, "nullable": true, "unique": false, "related_usecase_ids": ["UC15"] }
      ]
    },
    {
        "name": "projects",
        "description": "Stores information about user projects.",
        "columns": [
            { "name": "id", "type": "INT", "is_primary_key": true, "is_foreign_key": false, "nullable": false, "unique": true, "related_usecase_ids": [] },
            { "name": "project_name", "type": "VARCHAR(255)", "is_primary_key": false, "is_foreign_key": false, "nullable": false, "unique": false, "related_usecase_ids": ["UC5"] },
            { "name": "owner_id", "type": "INT", "is_primary_key": false, "is_foreign_key": true, "nullable": false, "unique": false, "references": "users", "related_usecase_ids": ["UC5"] },
            { "name": "created_at", "type": "DATETIME", "is_primary_key": false, "is_foreign_key": false, "nullable": false, "unique": false, "related_usecase_ids": ["UC5"] }
        ]
    }
  ],
  "relationships": [
    { "from_table": "projects", "to_table": "users", "type": "many-to-one" }
  ]
}

DESIGN RULES AND LOGIC:
- Table and column names MUST be in lowercase snake_case.
- Every table MUST have a SINGLE 'id' column as its primary key.
- DO NOT use composite primary keys (multiple columns as primary key).
- Any column where 'is_primary_key' is true MUST also have 'nullable' set to false. This is a strict rule.
- Correctly identify all relationships (one-to-one, one-to-many, etc.) and define BOTH the foreign key column (with 'is_foreign_key: true' and 'references') AND the corresponding entry in the main 'relationships' array.
- Use appropriate data types from this list: INT, VARCHAR(n), TEXT, BOOLEAN, DATETIME, DATE, DECIMAL(p, s).
- Infer necessary tables from the provided use cases. For example, "User Login" implies a 'users' table.
- **CRITICAL TRACEABILITY REQUIREMENT**: For each individual column, you MUST determine which use cases require its existence. Populate the 'related_usecase_ids' array with the 'id' of every relevant use case. If a column is required by multiple use cases (e.g., 'username' for login and registration), include all their IDs. If the origin is unclear, return an empty array [].
`

    }

};


export class GeminiService {
    private apiKeyService = new ApiKeyService();
    // config
    private readonly BATCH_SIZE = 20;
    private readonly MAX_BATCHES = 100;
    private readonly MAX_ATTEMPTS_PER_OFFSET = 3;
    private readonly DB_GEN_BATCH_SIZE = 10;

    private cleanJsonString(text: string): string {
        const pattern = /```(?:json)?\s*([\s\S]*?)\s*```/g;
        const match = pattern.exec(text.trim());
        // Nếu tìm thấy khối mã, trả về nội dung bên trong, nếu không, trả về chuỗi gốc
        return match ? match[1].trim() : text.trim();
    }
    private cleanJsonStringDatabase(text: string): string {
        if (!text) return "";

        let cleanedText = text.trim();

        // Trường hợp 1: Nếu text đã là JSON hợp lệ, trả về luôn
        try {
            JSON.parse(cleanedText);
            return cleanedText;
        } catch {
            // Không phải JSON hợp lệ, tiếp tục xử lý
        }

        // Trường hợp 2: Tìm các khối code có thể chứa JSON
        const codeBlockPatterns = [
            /```(?:json)?\s*([\s\S]*?)\s*```/g,  // ```json ... ```
            /`{3,}\s*([\s\S]*?)\s*`{3,}/g,       // ``` ... ``` (không có json)
            /`([^`]+)`/g                          // `inline code`
        ];

        for (const pattern of codeBlockPatterns) {
            const matches = cleanedText.match(pattern);
            if (matches) {
                for (const match of matches) {
                    // Lấy nội dung bên trong code block
                    let content = match.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').replace(/`/g, '').trim();

                    // Thử parse JSON
                    try {
                        JSON.parse(content);
                        cleanedText = content;
                        break;
                    } catch {
                        // Không phải JSON hợp lệ, tiếp tục
                    }
                }
                if (cleanedText !== text) break;
            }
        }

        // Trường hợp 3: Tìm JSON object/array trong text
        const jsonPatterns = [
            /\{[\s\S]*\}/,  // Tìm object
            /\[[\s\S]*\]/   // Tìm array
        ];

        for (const pattern of jsonPatterns) {
            const match = cleanedText.match(pattern);
            if (match) {
                try {
                    JSON.parse(match[0]);
                    cleanedText = match[0];
                    break;
                } catch {
                    // Không phải JSON hợp lệ
                }
            }
        }

        // Trường hợp 4: Loại bỏ các phần thừa phía trước và sau JSON
        // Tìm vị trí bắt đầu của { hoặc [
        const jsonStart = Math.max(
            cleanedText.indexOf('{'),
            cleanedText.indexOf('[')
        );

        if (jsonStart > 0) {
            cleanedText = cleanedText.substring(jsonStart);
        }

        // Tìm vị trí kết thúc của } hoặc ] cân bằng
        let balance = 0;
        let endPosition = -1;

        for (let i = 0; i < cleanedText.length; i++) {
            const char = cleanedText[i];
            if (char === '{' || char === '[') balance++;
            if (char === '}' || char === ']') balance--;

            if (balance === 0 && i > 0) {
                endPosition = i;
                break;
            }
        }

        if (endPosition !== -1) {
            cleanedText = cleanedText.substring(0, endPosition + 1);
        }

        // Trường hợp 5: Loại bỏ các chú thích, giải thích thừa
        const lines = cleanedText.split('\n').filter(line => {
            // Loại bỏ các dòng chỉ chứa từ khóa giải thích
            const cleanLine = line.trim();
            return !cleanLine.match(/^(Đây là|Here is|Output:|Kết quả:|JSON:|===|---)/i) &&
                !cleanLine.match(/^[#*-]{3,}/) && // Headers, separators
                !cleanLine.match(/^(Ví dụ|Example):/i);
        });

        cleanedText = lines.join('\n').trim();

        // Cuối cùng, thử parse lại để đảm bảo tính hợp lệ
        try {
            JSON.parse(cleanedText);
            return cleanedText;
        } catch (error) {
            console.warn("⚠️ Could not extract valid JSON from response:", {
                originalLength: text?.length,
                cleanedLength: cleanedText?.length,
                preview: cleanedText.substring(0, 200)
            });

            // Fallback: trả về text gốc đã được làm sạch cơ bản
            return text.replace(/```(?:json)?\s*|```/g, '').trim();
        }
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
                return it;
            })
            .filter(Boolean);
    }

    private buildPrompt(cleanText: string, language: string, offset = 0, batchSize = 20): string {
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const schemaDescription = prompts[lang].schemaDescription(batchSize, offset);
        return `${schemaDescription}\n\nVăn bản nguồn (Source text):\n${cleanText}`;
    }

    /**
     * Một hàm chung để gửi prompt tới Gemini và trả về kết quả dạng chuỗi JSON đã được làm sạch.
     * Hàm này đóng gói logic lặp lại: lấy key, thử lại, xử lý lỗi.
     * @param prompt - Chuỗi prompt để gửi cho Gemini.
     * @returns Một Promise chứa chuỗi JSON trả về từ API.
     */
    async generateJsonContent(prompt: string): Promise<string> {
        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) {
            throw new Error("No active Gemini API key found.");
        }

        let lastError: any;
        for (const k of keys) {
            try {
                console.log(`🔑 Trying Gemini key for generic content: ${k.key_value.slice(0, 12)}...`);
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                const text: string = resp?.response?.text?.() || "";

                // Trả về ngay sau khi thành công
                return this.cleanJsonStringDatabase(text);

            } catch (err: any) {
                lastError = err;
                const msg = (err?.message || "").toLowerCase();
                console.error(`❌ Gemini key ${k._id} failed during generic content generation:`, err?.message || err);

                // Vô hiệu hóa key nếu nó không hợp lệ
                if (msg.includes("invalid") || msg.includes("unauthorized")) {
                    try {
                        await this.apiKeyService.disableKey(k._id);
                        console.warn(`⚠️ Disabled invalid Gemini key: ${k._id}`);
                    } catch { /* Bỏ qua lỗi khi disable key */ }
                }
                // Thử key tiếp theo
                continue;
            }
        }

        // Nếu tất cả các key đều thất bại
        throw lastError || new Error("All Gemini API keys failed during generic content generation.");
    }

    /**
     * Generate database schema với chunking để tránh response quá dài
     */
    async generateDatabaseSchema(requirements: any[], language: string): Promise<any> {
        try {
            if (requirements.length <= this.DB_GEN_BATCH_SIZE) {
                // Nếu ít requirements, xử lý một lần
                return await this.generateDatabaseSchemaBatch(requirements, language);
            } else {
                // Nhiều requirements, chia thành các batch và merge
                return await this.generateDatabaseSchemaWithChunking(requirements, language);
            }
        } catch (error) {
            console.error("❌ Error in generateDatabaseSchema:", error);

            // Fallback: trả về schema cơ bản nếu không generate được
            return {
                name: "fallback_database",
                description: "Fallback database schema due to generation failure",
                tables: [],
                relationships: []
            };
        }
    }
    /**
     * Generate schema cho một batch requirements
     */
    /**
 * Generate schema cho một batch requirements
 */
    private async generateDatabaseSchemaBatch(requirements: any[], language: string): Promise<any> {
        const simplifiedRequirements = requirements.map(r => ({
            id: r.id,
            name: r.name,
            role: r.role,
            goal: r.goal,
            tasks: r.tasks,
            inputs: r.inputs,
            outputs: r.outputs,
        }));

        const requirementsJson = JSON.stringify(simplifiedRequirements, null, 2);
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = prompts[lang].databaseDesign(requirementsJson);

        console.log(`📊 Generating database schema batch for ${requirements.length} use cases`);

        const generatedJsonString = await this.generateJsonContent(prompt);

        if (!generatedJsonString) {
            throw new Error("Empty response from Gemini");
        }

        console.log(`📄 Raw response length: ${generatedJsonString.length}`);

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(generatedJsonString);
        } catch (parseError) {
            console.error("❌ JSON parse error in batch, attempting repair...", parseError);
            const repairedJson = this.repairTruncatedJson(generatedJsonString);
            parsedResponse = JSON.parse(repairedJson);
        }

        // Xử lý cả hai định dạng response từ Gemini
        let finalSchema: any;

        // Định dạng 1: Mảng các bảng (Gemini đang trả về)
        if (Array.isArray(parsedResponse)) {
            console.log(`🔍 Detected array format with ${parsedResponse.length} tables`);
            finalSchema = {
                name: "generated_database",
                description: "Database schema generated from use cases",
                tables: parsedResponse,
                relationships: this.inferRelationships(parsedResponse)
            };
        }
        // Định dạng 2: Object schema đầy đủ
        else if (parsedResponse && typeof parsedResponse === 'object') {
            console.log(`🔍 Detected object format`);
            finalSchema = parsedResponse;

            // Đảm bảo có đầy đủ các trường cần thiết
            if (!finalSchema.tables || !Array.isArray(finalSchema.tables)) {
                finalSchema.tables = [];
            }
            if (!finalSchema.relationships || !Array.isArray(finalSchema.relationships)) {
                finalSchema.relationships = this.inferRelationships(finalSchema.tables);
            }
            if (!finalSchema.name) {
                finalSchema.name = "generated_database";
            }
            if (!finalSchema.description) {
                finalSchema.description = "Database schema generated from use cases";
            }
        }
        else {
            throw new Error("Invalid response format from Gemini");
        }

        console.log(`✅ Successfully processed schema with ${finalSchema.tables.length} tables`);

        // Xử lý type/length và đảm bảo single primary key
        finalSchema = this._parseColumnTypesAndLengths(finalSchema);

        return finalSchema;
    }

    /**
     * Tự động suy luận relationships từ các bảng
     */
    private inferRelationships(tables: any[]): any[] {
        const relationships: any[] = [];
        const tableNames = tables.map(t => t.name);

        for (const table of tables) {
            if (!table.columns || !Array.isArray(table.columns)) continue;

            for (const column of table.columns) {
                // Nếu là foreign key và có references
                if (column.is_foreign_key && column.references) {
                    const referencedTable = column.references;
                    if (tableNames.includes(referencedTable)) {
                        relationships.push({
                            from_table: table.name,
                            to_table: referencedTable,
                            type: "many-to-one"
                        });
                    }
                }
                // Tự động phát hiện foreign key bằng naming convention
                else if (column.name.endsWith('_id') && column.name !== 'id') {
                    const potentialTable = column.name.replace(/_id$/, '');
                    if (tableNames.includes(potentialTable)) {
                        relationships.push({
                            from_table: table.name,
                            to_table: potentialTable,
                            type: "many-to-one"
                        });

                        // Cập nhật column information
                        column.is_foreign_key = true;
                        column.references = potentialTable;
                    }
                }
            }
        }

        console.log(`🔗 Inferred ${relationships.length} relationships`);
        return relationships;
    }
    /**
 * Hàm tạm thời để debug response từ Gemini
 */
    private async debugGeminiResponse(prompt: string): Promise<void> {
        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) throw new Error("No active Gemini API key");

        for (const k of keys) {
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

                console.log("🚀 Sending prompt to Gemini...");
                console.log("📝 Prompt preview:", prompt.substring(0, 300) + "...");

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                const text: string = resp?.response?.text?.() || "";
                console.log("📨 Raw Gemini response:");
                console.log("=========================================");
                console.log(text);
                console.log("=========================================");

                return;

            } catch (err: any) {
                console.error("❌ Debug request failed:", err);
                continue;
            }
        }
    }
    /**
     * Generate schema với chunking - chia requirements thành nhiều batch
     */
    private async generateDatabaseSchemaWithChunking(requirements: any[], language: string): Promise<any> {
        console.log(`🔀 Splitting ${requirements.length} requirements into chunks for database generation`);

        const chunks: any[][] = [];
        for (let i = 0; i < requirements.length; i += this.DB_GEN_BATCH_SIZE) {
            chunks.push(requirements.slice(i, i + this.DB_GEN_BATCH_SIZE));
        }

        console.log(`📦 Created ${chunks.length} chunks for processing`);

        const allSchemas: any[] = [];

        // Xử lý từng batch tuần tự để tránh rate limit
        for (let i = 0; i < chunks.length; i++) {
            try {
                console.log(`🔄 Processing chunk ${i + 1}/${chunks.length}`);
                const schema = await this.generateDatabaseSchemaBatch(chunks[i], language);
                allSchemas.push(schema);
                console.log(`✅ Completed chunk ${i + 1}/${chunks.length}`);

                // Thêm delay nhỏ giữa các batch để tránh rate limit
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`❌ Failed chunk ${i + 1}:`, error);
                // Tiếp tục với các chunk khác thay vì dừng hoàn toàn
            }
        }

        if (allSchemas.length === 0) {
            throw new Error("All database schema generation chunks failed");
        }

        console.log(`🔄 Merging ${allSchemas.length} schemas...`);

        // Merge tất cả schemas lại
        return this.mergeDatabaseSchemas(allSchemas);
    }

    /**
     * Merge nhiều database schemas thành một schema thống nhất
     */
    private mergeDatabaseSchemas(schemas: any[]): any {
        if (schemas.length === 1) return schemas[0];

        console.log(`🔄 Merging ${schemas.length} database schemas`);

        const mergedSchema = {
            name: "merged_database",
            description: "Merged database schema from multiple chunks",
            tables: [] as any[],
            relationships: [] as any[]
        };

        const tableMap = new Map<string, any>();
        const relationshipSet = new Set<string>();

        // Merge tables từ tất cả schemas
        for (const schema of schemas) {
            if (schema.tables && Array.isArray(schema.tables)) {
                for (const table of schema.tables) {
                    if (tableMap.has(table.name)) {
                        // Merge columns của table trùng tên
                        const existingTable = tableMap.get(table.name);
                        const existingColumns = new Map(existingTable.columns.map((col: any) => [col.name, col]));

                        for (const column of table.columns) {
                            if (!existingColumns.has(column.name)) {
                                existingTable.columns.push(column);
                                existingColumns.set(column.name, column);
                            } else {
                                // Merge related_usecase_ids nếu column đã tồn tại
                                const existingColumn = existingColumns.get(column.name) as any;
                                if (column.related_usecase_ids && Array.isArray(column.related_usecase_ids)) {
                                    const existingIds = new Set(existingColumn.related_usecase_ids || []);
                                    column.related_usecase_ids.forEach((id: string) => existingIds.add(id));
                                    existingColumn.related_usecase_ids = Array.from(existingIds);
                                }
                            }
                        }
                    } else {
                        tableMap.set(table.name, { ...table });
                    }
                }
            }

            // Merge relationships
            if (schema.relationships && Array.isArray(schema.relationships)) {
                for (const rel of schema.relationships) {
                    const relKey = `${rel.from_table}-${rel.to_table}-${rel.type}`;
                    if (!relationshipSet.has(relKey)) {
                        mergedSchema.relationships.push(rel);
                        relationshipSet.add(relKey);
                    }
                }
            }
        }

        mergedSchema.tables = Array.from(tableMap.values());

        console.log(`✅ Merged result: ${mergedSchema.tables.length} tables, ${mergedSchema.relationships.length} relationships`);

        return mergedSchema;
    }
    /**
     * Sửa chữa JSON bị cắt ngắn
     */
    private repairTruncatedJson(jsonStr: string): string {
        let balance = 0;
        let inString = false;
        let escapeNext = false;

        // Đếm balance hiện tại
        for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i];

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                escapeNext = true;
                continue;
            }

            if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === '{' || char === '[') balance++;
                if (char === '}' || char === ']') balance--;
            }
        }

        // Đóng tất cả các mở ngoặc còn thiếu
        let repaired = jsonStr;
        while (balance > 0) {
            if (repaired.trim().endsWith(',')) {
                repaired = repaired.slice(0, -1); // Remove trailing comma
            }
            repaired += '}';
            balance--;
        }

        // Đảm bảo kết thúc đúng
        if (repaired.startsWith('[') && !repaired.endsWith(']')) {
            repaired += ']';
        } else if (repaired.startsWith('{') && !repaired.endsWith('}')) {
            repaired += '}';
        }

        return repaired;
    }
    /**
    * [MỚI] Duyệt qua schema từ Gemini và tách các loại dữ liệu có độ dài (vd: VARCHAR(255))
    * thành hai trường riêng biệt: `type` và `length`.
    * ĐỒNG THỜI đảm bảo mỗi bảng chỉ có một primary key duy nhất.
    */
    private _parseColumnTypesAndLengths(databaseSchema: any): any {
        const typeRegex = /(\w+)\s*\(([\d,\s]+)\)/;

        if (databaseSchema?.tables && Array.isArray(databaseSchema.tables)) {
            for (const table of databaseSchema.tables) {
                if (table?.columns && Array.isArray(table.columns)) {
                    let primaryKeyCount = 0;
                    let hasIdColumn = false;

                    // Đếm số primary key hiện có và kiểm tra cột id
                    for (const column of table.columns) {
                        if (column.is_primary_key === true) {
                            primaryKeyCount++;
                        }
                        if (column.name === 'id') {
                            hasIdColumn = true;
                        }
                    }

                    // Nếu có nhiều hơn 1 primary key, chỉ giữ lại cột 'id' làm primary key
                    if (primaryKeyCount > 1) {
                        console.warn(`⚠️ Table ${table.name} has ${primaryKeyCount} primary keys. Only keeping 'id' as primary key.`);

                        for (const column of table.columns) {
                            // Chỉ giữ 'id' làm primary key, các cột khác chuyển thành không phải primary key
                            if (column.name === 'id') {
                                column.is_primary_key = true;
                                column.nullable = false;
                            } else {
                                column.is_primary_key = false;
                            }
                        }
                    }
                    // Nếu không có primary key nào, tạo cột id mới
                    else if (primaryKeyCount === 0 && !hasIdColumn) {
                        console.warn(`⚠️ Table ${table.name} has no primary key. Adding 'id' column.`);
                        table.columns.unshift({
                            name: "id",
                            type: "INT",
                            is_primary_key: true,
                            is_foreign_key: false,
                            nullable: false,
                            unique: true,
                            related_usecase_ids: []
                        });
                    }

                    // Xử lý type và length
                    for (const column of table.columns) {
                        if (typeof column.type === 'string') {
                            const match = column.type.match(typeRegex);
                            if (match) {
                                column.type = match[1].toUpperCase();
                                column.length = match[2].replace(/\s/g, '');
                            }
                        }

                        // Đảm bảo primary key không thể nullable
                        if (column.is_primary_key === true) {
                            column.nullable = false;
                        }
                    }
                }
            }
        }
        return databaseSchema;
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
                const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                let text: string = resp?.response?.text?.() || "{}";
                text = this.cleanJsonString(text);

                // 🔍 Debug log
                console.log("🔎 Gemini conflict check raw response:", text);

                const parsed = JSON.parse(text.trim());

                if (typeof parsed.conflict === "boolean") {
                    console.log(
                        `✅ Gemini conflict decision: ${parsed.conflict ? "CONFLICT" : "NO CONFLICT"} | A="${textA}" | B="${textB}"`
                    );
                    return parsed.conflict;
                } else {
                    console.warn("⚠️ Gemini did not return a valid { conflict: boolean } object:", text);
                }
            } catch (err) {
                lastError = err;
                console.error("❌ Gemini checkConflictWithGemini error:", err);
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
                    console.log(`✅ Gemini found ${parsed.length} conflict groups.`);
                    return parsed;
                } else {
                    console.warn("⚠️ Gemini did not return a valid array of arrays:", text);
                }
            } catch (err) {
                lastError = err;
                console.error("❌ Gemini findConflictGroups error:", err);
                continue;
            }
        }
        throw lastError || new Error("All Gemini API keys failed for conflict grouping");
    }
}