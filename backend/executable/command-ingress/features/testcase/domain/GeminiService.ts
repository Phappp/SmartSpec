// TestcaseGeminiService.ts
import { ApiKeyService } from "../../orchestrator/domain/ApiKeyService";
import { LLMService } from "../../../shared/LLMService";

// PROMPTS cho test case generation với Enterprise standard
const testcasePrompts = {
    'vi-VN': {
        estimateTestCasesCount: (requirementsJson: string, testType: string, existingTitles?: string[], remainingCount?: number) => {
            const isShort = requirementsJson.length < 500;
            const existingTitlesSection = existingTitles && existingTitles.length > 0
                ? `\n**DANH SÁCH TESTCASES ĐÃ TẠO (KHÔNG được trùng lặp):**
${existingTitles.map((title, idx) => `${idx + 1}. "${title}"`).join('\n')}

**QUAN TRỌNG**: Bạn cần tạo ${remainingCount || 'số lượng còn lại'} testcases MỚI, KHÔNG được trùng với danh sách trên.`
                : '';

            return `
BẠN LÀ CHUYÊN GIA KIỂM THỬ PHẦN MỀM. Nhiệm vụ của bạn là ƯỚC TÍNH số lượng test cases cần thiết để kiểm thử đầy đủ các use cases được cung cấp.

DANH SÁCH USE CASES:
${requirementsJson}

LOẠI KIỂM THỬ: ${testType}
${existingTitlesSection}

**QUY TẮC ƯỚC TÍNH:**
- Use case đơn giản (CRUD cơ bản): 4-6 test cases
- Use case phức tạp (workflow nhiều bước): 8-12 test cases
- Use case cực kỳ phức tạp (integration phức tạp): 15-20 test cases
- Nếu testType = "all": nhân số lượng với 5 (vì có 5 loại test: integration, api, ui, performance, security)

**TRẢ VỀ CHỈ JSON OBJECT:**
{
  "estimated_count": ${isShort ? '10' : '50'},
  "estimated_batches": ${isShort ? '1' : '3'},
  "summary": "Tóm tắt ngắn gọn về các use cases và số lượng test cases ước tính",
  "reasoning": "Lý do ước tính số lượng test cases",
  "committed_testcases": [
    {
      "title": "Tên testcase cụ thể (ví dụ: Thêm sản phẩm thành công với số lượng hợp lệ)",
      "requirement_id": "ID của use case liên quan",
      "test_type": "integration|api|ui|performance|security",
      "priority": "high|medium|low"
    },
    ...
  ]
}

**QUAN TRỌNG VỀ committed_testcases:**
- Phải liệt kê CHI TIẾT từng testcase sẽ generate (không phải placeholder)
- Mỗi testcase phải có title cụ thể, mô tả rõ ràng testcase đó test gì
${existingTitles && existingTitles.length > 0
                    ? `- Bạn cần tạo CHÍNH XÁC ${remainingCount || 'số lượng còn lại'} testcases MỚI, KHÔNG được trùng với danh sách đã có ở trên
- Số lượng testcases trong committed_testcases PHẢI BẰNG CHÍNH XÁC ${remainingCount || 'số lượng còn lại'} (KHÔNG được thiếu, KHÔNG được thừa)`
                    : `- Số lượng testcases trong committed_testcases PHẢI BẰNG CHÍNH XÁC estimated_count (KHÔNG được thiếu, KHÔNG được thừa)`}
- Title phải ngắn gọn, rõ ràng, dễ hiểu, theo format: "[Test Type]: [Mô tả testcase]" (ví dụ: "UI: Kiểm tra hiển thị thông báo lỗi khi không tính được tổng tiền", "API: Kiểm tra API tính tổng tiền với dữ liệu đầu vào không hợp lệ")
- Tất cả testcases phải có format đồng nhất, không được trộn lẫn format
- KHÔNG được tạo placeholder như "Tên use case - Testcase 1", "Tên use case - Testcase 2"
- Mỗi testcase phải có title riêng biệt, mô tả cụ thể testcase đó test gì

**QUAN TRỌNG:**
- estimated_count phải là số nguyên dương
- estimated_batches = Math.ceil(estimated_count / 20) (mỗi batch 20 test cases)
- Trả về CHỈ JSON, không có markdown, không có code fence
`;
        },
        testcaseDesign: (requirementsJson: string, databaseSchemaJson: string, testType: string = 'integration') => `
BẠN LÀ MỘT CHUYÊN GIA KIỂM THỬ PHẦN MỀM ĐẲNG CẤP THẾ GIỚI, chuyên tạo ra các test case toàn diện và hiệu quả từ yêu cầu nghiệp vụ và thiết kế database.

Nhiệm vụ của bạn là phân tích danh sách use case và cấu trúc database sau đây để tạo ra các test case chất lượng cao ĐẠT CHUẨN ENTERPRISE.

DANH SÁCH USE CASE:
${requirementsJson}

THIẾT KẾ DATABASE (VỚI USE CASE MAPPING):
${databaseSchemaJson}

LOẠI KIỂM THỬ YÊU CẦU: ${testType}

##  QUY ĐỊNH NGHIÊM NGẶT VỀ ĐỊNH DẠNG JSON ĐẦU RA

**YÊU CẦU TUYỆT ĐỐI: CHỈ TRẢ VỀ DUY NHẤT MỘT JSON OBJECT - KHÔNG CÓ BẤT KỲ KÝ TỰ, KHOẢNG TRẮNG, XUỐNG DÒNG NÀO NGOÀI JSON**

###  CẤU TRÚC JSON BẮT BUỘC - VI PHẠM SẼ GÂY LỖI HỆ THỐNG:

\`\`\`json
{
  "testcases": [
    {
      "title": "string (BẮT BUỘC - CHỈ chứa kịch bản test, không có UC_ID)",
      "description": "string (BẮT BUỘC)",
      "test_type": "${testType}",
      "source_requirement_ids": ["UC_ID"], 
      "priority": "string (BẮT BUỘC - enum: low|medium|high|critical)",
      "preconditions": ["array of strings"],
      "database_tables": ["array of table names"],
      "database_operations": ["array of strings - enum: select|insert|update|delete"],
      "steps": [
        {
          "step_number": "number (BẮT BUỘC)",
          "action": "string (BẮT BUỘC)",
          "input_data": {
            "field_name": "specific_value"
          },
          "expected_immediate_result": "string (BẮT BUỘC)"
        }
      ],
      "expected_results": {
        "ui_level": ["array of strings"],
        "api_level": {
          "status_code": "number"
        },
        "database_level": ["array of strings"]
      },
      "test_data": [
        {
          "name": "string (BẮT BUỘC)",
          "input_payload": {},
          "expected_output": {
            "status": "success|failure",
            "message": "string"
          }
        }
      ]
    }
  ]
}
\`\`\`

##  QUY TẮC VALIDATION NGHIÊM NGẶT:

### 1. **FIELD BẮT BUỘC (REQUIRED) - THIẾU SẼ GÂY LỖI:**
- title, description, test_type, priority
- steps (ít nhất 1 step)
- steps[].step_number, steps[].action, steps[].expected_immediate_result
- source_requirement_ids (phải có đúng 1 UC_ID)

### 2. **FIELD TỰ SINH - KHÔNG ĐỂ TRỐNG:**
- preconditions, database_tables, database_operations
- expected_results (ít nhất 1 level)
- test_data (ít nhất 1 bộ test data)

### 3. **FIELD NGƯỜI DÙNG TỰ NHẬP - ĐỂ NULL/MẶC ĐỊNH:**
- postconditions: []
- automation: {}
- execution_logs_format: {}
- exceptions: []
- environment: {}
- insights: {}
- executed_by, executed_at: KHÔNG CÓ TRONG OUTPUT

### 4. **ENUM VALIDATION - SAI SẼ GÂY LỖI:**
- test_type: "${testType}" (CỐ ĐỊNH theo input)
- priority: CHỈ "low", "medium", "high", "critical" 
- database_operations: CHỈ "select", "insert", "update", "delete"

### 5. **TITLE RULE MỚI:**
- **CHỈ CHỨA kịch bản test** - không có UC_ID prefix
- **KHÔNG ĐƯỢC** bắt đầu bằng "[UC" hoặc chứa UC_ID
- Ví dụ đúng:
   "Thành công với thông tin hợp lệ"
   "Thất bại khi thiếu trường bắt buộc"
   "Boundary test với giá trị tối đa"
- Ví dụ sai:
   "[UC1] - Thành công với thông tin hợp lệ"
   "UC1 - Thất bại khi thiếu trường"

### 6. **SOURCE_REQUIREMENT_IDS RULE:**
- **CHỈ CHỨA 1 UC_ID DUY NHẤT** - ví dụ: ["UC1"]
- **KHÔNG ĐƯỢC** chứa nhiều UC -  ["UC1", "UC2"]
- **PHẢI KHỚP** với use case trong danh sách input

##  QUY TẮC TẠO TEST CASE THÔNG MINH:

### 1. **SỐ LƯỢNG TEST CASE THÔNG MINH:**
- **Use case đơn giản** (CRUD cơ bản, form đơn giản): **4-6 test cases**
- **Use case phức tạp** (workflow nhiều bước, business logic phức tạp): **8-12 test cases**  
- **Use case cực kỳ phức tạp** (integration phức tạp, hệ thống phân tán): **15-20 test cases**

### 2. **PHÂN LOẠI TEST CASE TỰ ĐỘNG:**
- **Positive Tests** (30-40%): Happy path, thành công
- **Negative Tests** (40-50%): Validation errors, business logic failures
- **Boundary Tests** (10-20%): Edge cases, limit testing
- **Integration Tests** (10%): Data flow, system integration

### 3. **TIÊU CHUẨN TITLE CHẤT LƯỢNG:**
- Mô tả rõ ràng, ngắn gọn kịch bản test
- Dễ hiểu, không mơ hồ
- Ví dụ:
   "Thành công với tài khoản admin"
   "Thất bại do username không tồn tại"
   "Xử lý timeout khi server không phản hồi"
   "Kiểm tra validation với email không đúng định dạng"

### 4. **DATABASE MAPPING THÔNG MINH:**
- Tự động map tables từ database schema với use case
- Xác định operations (select/insert/update/delete) dựa trên use case type
- Ví dụ: 
  - Create use case → ["insert"]
  - Search use case → ["select"] 
  - Update use case → ["select", "update"]

### 5. **PRIORITY TỰ ĐỘNG:**
- **Critical**: Security, payment, core business logic, data integrity
- **High**: Main workflow, key features, critical user journeys
- **Medium**: Secondary features, enhancements, non-critical validations
- **Low**: UI cosmetics, minor features, edge cases ít xảy ra

### 6. **STEPS CHI TIẾT VÀ THỰC TẾ:**
- Mỗi step PHẢI có input_data với giá trị CỤ THỂ
- Expected result PHẢI đo lường được
- Ví dụ tốt:
   "Nhập username = 'testuser', password = 'Password123!'"
   "Gọi API POST /api/login với payload {username: 'admin', password: '123456'}"
   "Nhập thông tin đăng nhập" (quá mơ hồ)

##  LỖI JSON KHÔNG ĐƯỢC PHÉP:
- Thừa dấu phẩy cuối cùng (trailing comma)
- Thiếu dấu ngoặc, dấu phẩy
- Comment trong JSON
- Bất kỳ text nào ngoài JSON object
- Format date/time không đúng chuẩn
- Sinh các field người dùng tự nhập
- Title chứa UC_ID
- source_requirement_ids chứa nhiều UC

##  VÍ DỤ ĐẦU RA CHUẨN:

\`\`\`json
{
  "testcases": [
    {
      "title": "Thành công với tài khoản admin",
      "description": "Kiểm thử đăng nhập thành công với quyền admin và verify quyền truy cập",
      "test_type": "api",
      "source_requirement_ids": ["UC1"],
      "priority": "high",
      "preconditions": ["Hệ thống đang chạy", "Tài khoản admin đã được tạo"],
      "database_tables": ["users", "sessions"],
      "database_operations": ["select", "insert"],
      "steps": [
        {
          "step_number": 1,
          "action": "Gọi API POST /api/auth/login với payload",
          "input_data": {
            "username": "admin",
            "password": "Admin@123"
          },
          "expected_immediate_result": "Nhận response status 200 OK"
        }
      ],
      "expected_results": {
        "api_level": {
          "status_code": 200
        },
        "database_level": ["Tạo session mới trong bảng sessions", "Cập nhật last_login trong bảng users"]
      },
      "test_data": [
        {
          "name": "Admin credentials valid",
          "input_payload": {
            "username": "admin",
            "password": "Admin@123"
          },
          "expected_output": {
            "status": "success",
            "message": "Login successful"
          }
        }
      ]
    }
  ]
}
\`\`\`

**QUAN TRỌNG: ĐẦU RA DUY NHẤT MỘT JSON OBJECT HỢP LỆ - KHÔNG CÓ BẤT KỲ NỘI DUNG NÀO KHÁC**

**THỰC HIỆN PHÂN TÍCH USE CASE VÀ SINH TEST CASE THEO ĐÚNG SỐ LƯỢNG VÀ CHẤT LƯỢNG YÊU CẦU**
`
    },
    'en-US': {
        estimateTestCasesCount: (requirementsJson: string, testType: string, existingTitles?: string[], remainingCount?: number) => {
            const isShort = requirementsJson.length < 500;
            const existingTitlesSection = existingTitles && existingTitles.length > 0
                ? `\n**EXISTING TESTCASES LIST (DO NOT DUPLICATE):**
${existingTitles.map((title, idx) => `${idx + 1}. "${title}"`).join('\n')}

**IMPORTANT**: You need to create ${remainingCount || 'remaining'} NEW testcases, DO NOT duplicate the list above.`
                : '';

            return `
YOU ARE A SOFTWARE TESTING EXPERT. Your task is to ESTIMATE the number of test cases needed to fully test the provided use cases.

USE CASE LIST:
${requirementsJson}

TEST TYPE: ${testType}
${existingTitlesSection}

**ESTIMATION RULES:**
- Simple use case (basic CRUD): 4-6 test cases
- Complex use case (multi-step workflow): 8-12 test cases
- Highly complex use case (complex integration): 15-20 test cases
- If testType = "all": multiply count by 5 (5 test types: integration, api, ui, performance, security)

**RETURN ONLY JSON OBJECT:**
{
  "estimated_count": ${isShort ? '10' : '50'},
  "estimated_batches": ${isShort ? '1' : '3'},
  "summary": "Brief summary of use cases and estimated test case count",
  "reasoning": "Reasoning for estimated test case count",
  "committed_testcases": [
    {
      "title": "Specific testcase name (e.g., Add product successfully with valid quantity)",
      "requirement_id": "Related use case ID",
      "test_type": "integration|api|ui|performance|security",
      "priority": "high|medium|low"
    },
    ...
  ]
}

${existingTitles && existingTitles.length > 0 ? `**IMPORTANT NOTE:**
- You need to create ${remainingCount || 'remaining'} NEW testcases
- DO NOT duplicate the existing testcases list above
- Each testcase must have a UNIQUE title, cannot be the same` : ''}

**IMPORTANT ABOUT committed_testcases:**
- Must list DETAILED testcases to be generated (not placeholders)
- Each testcase must have a specific title that clearly describes what it tests
${existingTitles && existingTitles.length > 0
                    ? `- You need to create EXACTLY ${remainingCount || 'remaining'} NEW testcases, DO NOT duplicate the existing list above
- Number of testcases in committed_testcases MUST EXACTLY EQUAL ${remainingCount || 'remaining'} (CANNOT be less, CANNOT be more)`
                    : `- Number of testcases in committed_testcases MUST EXACTLY EQUAL estimated_count (CANNOT be less, CANNOT be more)`}
- Titles must be concise, clear, and easy to understand, following format: "[Test Type]: [Testcase description]" (e.g., "UI: Check error message display when total cannot be calculated", "API: Check API with invalid input data")
- All testcases must have consistent format, cannot mix different formats
- DO NOT create placeholders like "Use case name - Testcase 1", "Use case name - Testcase 2"
- Each testcase must have a unique title that specifically describes what it tests
${existingTitles && existingTitles.length > 0
                    ? `- Each new testcase must have a title DIFFERENT from all existing testcases above`
                    : ''}

**IMPORTANT:**
- estimated_count must be a positive integer
- estimated_batches = Math.ceil(estimated_count / 20) (20 test cases per batch)
- Return ONLY JSON, no markdown, no code fence
`;
        },
        testcaseDesign: (requirementsJson: string, databaseSchemaJson: string, testType: string = 'integration') => `
YOU ARE A WORLD-CLASS SOFTWARE TESTING EXPERT, specializing in creating comprehensive and effective test cases from business requirements and database design.

Your task is to analyze the following use case list and database structure to produce high-quality ENTERPRISE-LEVEL test cases.

USE CASE LIST:
${requirementsJson}

DATABASE DESIGN (WITH USE CASE MAPPING):
${databaseSchemaJson}

REQUIRED TEST TYPE: ${testType}

##  STRICT JSON OUTPUT FORMAT REQUIREMENTS

**ABSOLUTE REQUIREMENT: RETURN ONLY A SINGLE JSON OBJECT - NO EXTRA CHARACTERS, WHITESPACE, OR LINE BREAKS OUTSIDE THE JSON**

###  MANDATORY JSON STRUCTURE - VIOLATIONS WILL CAUSE SYSTEM ERRORS:

\`\`\`json
{
  "testcases": [
    {
      "title": "string (REQUIRED - contains only test scenario, no UC_ID)",
      "description": "string (REQUIRED)",
      "test_type": "${testType}",
      "source_requirement_ids": ["UC_ID"], 
      "priority": "string (REQUIRED - enum: low|medium|high|critical)",
      "preconditions": ["array of strings"],
      "database_tables": ["array of table names"],
      "database_operations": ["array of strings - enum: select|insert|update|delete"],
      "steps": [
        {
          "step_number": "number (REQUIRED)",
          "action": "string (REQUIRED)",
          "input_data": {
            "field_name": "specific_value"
          },
          "expected_immediate_result": "string (REQUIRED)"
        }
      ],
      "expected_results": {
        "ui_level": ["array of strings"],
        "api_level": {
          "status_code": "number"
        },
        "database_level": ["array of strings"]
      },
      "test_data": [
        {
          "name": "string (REQUIRED)",
          "input_payload": {},
          "expected_output": {
            "status": "success|failure",
            "message": "string"
          }
        }
      ]
    }
  ]
}
\`\`\`

##  STRICT VALIDATION RULES:

### 1. **REQUIRED FIELDS - MISSING WILL CAUSE ERRORS:**
- title, description, test_type, priority
- steps (minimum 1 step)
- steps[].step_number, steps[].action, steps[].expected_immediate_result
- source_requirement_ids (must contain exactly 1 UC_ID)

### 2. **AUTO-GENERATED FIELDS - DO NOT LEAVE EMPTY:**
- preconditions, database_tables, database_operations
- expected_results (at least 1 level)
- test_data (at least 1 test data set)

### 3. **USER-INPUT FIELDS - LEAVE NULL/DEFAULT:**
- postconditions: []
- automation: {}
- execution_logs_format: {}
- exceptions: []
- environment: {}
- insights: {}
- executed_by, executed_at: NOT IN OUTPUT

### 4. **ENUM VALIDATION - ERRORS IF INVALID:**
- test_type: "${testType}" (FIXED from input)
- priority: ONLY "low", "medium", "high", "critical" 
- database_operations: ONLY "select", "insert", "update", "delete"

### 5. **TITLE RULES:**
- **CONTAINS ONLY test scenario** - no UC_ID prefix
- **MUST NOT** start with "[UC" or contain UC_ID
- Correct examples:
   "Success with valid credentials"
   "Failure when required field is missing"
   "Boundary test with maximum values"
- Wrong examples:
   "[UC1] - Success with valid credentials"
   "UC1 - Failure when required field missing"

### 6. **SOURCE_REQUIREMENT_IDS RULES:**
- **CONTAINS EXACTLY 1 UC_ID** - example: ["UC1"]
- **MUST NOT** contain multiple UCs -  ["UC1", "UC2"]
- **MUST MATCH** use case from input list

##  INTELLIGENT TEST CASE CREATION RULES:

### 1. **SMART TEST CASE COUNTING:**
- **Simple use cases** (basic CRUD, simple forms): **4-6 test cases**
- **Complex use cases** (multi-step workflows, complex business logic): **8-12 test cases**  
- **Highly complex use cases** (complex integrations, distributed systems): **15-20 test cases**

### 2. **AUTOMATIC TEST CATEGORIZATION:**
- **Positive Tests** (30-40%): Happy path, success scenarios
- **Negative Tests** (40-50%): Validation errors, business logic failures
- **Boundary Tests** (10-20%): Edge cases, limit testing
- **Integration Tests** (10%): Data flow, system integration

### 3. **QUALITY TITLE STANDARDS:**
- Clear, concise test scenario description
- Easy to understand, unambiguous
- Examples:
   "Success with admin account"
   "Failure due to non-existent username"
   "Timeout handling when server unresponsive"
   "Validation check with invalid email format"

### 4. **INTELLIGENT DATABASE MAPPING:**
- Automatically map tables from database schema to use cases
- Determine operations (select/insert/update/delete) based on use case type
- Examples:
  - Create use case → ["insert"]
  - Search use case → ["select"]
  - Update use case → ["select", "update"]

### 5. **AUTOMATIC PRIORITY ASSIGNMENT:**
- **Critical**: Security, payment, core business logic, data integrity
- **High**: Main workflow, key features, critical user journeys
- **Medium**: Secondary features, enhancements, non-critical validations
- **Low**: UI cosmetics, minor features, rare edge cases

### 6. **DETAILED AND PRACTICAL STEPS:**
- Each step MUST have specific input_data values
- Expected results MUST be measurable
- Good examples:
   "Enter username = 'testuser', password = 'Password123!'"
   "Call POST /api/login with payload {username: 'admin', password: '123456'}"
   "Enter login information" (too vague)

##  PROHIBITED JSON ERRORS:
- Trailing commas
- Missing brackets, commas
- Comments in JSON
- Any text outside JSON object
- Invalid date/time formats
- Generating user-input fields
- Titles containing UC_ID
- source_requirement_ids with multiple UCs

##  STANDARD OUTPUT EXAMPLE:

\`\`\`json
{
  "testcases": [
    {
      "title": "Success with admin account",
      "description": "Test successful login with admin privileges and access rights verification",
      "test_type": "api",
      "source_requirement_ids": ["UC1"],
      "priority": "high",
      "preconditions": ["System is running", "Admin account exists"],
      "database_tables": ["users", "sessions"],
      "database_operations": ["select", "insert"],
      "steps": [
        {
          "step_number": 1,
          "action": "Call POST /api/auth/login with payload",
          "input_data": {
            "username": "admin",
            "password": "Admin@123"
          },
          "expected_immediate_result": "Receive response status 200 OK"
        }
      ],
      "expected_results": {
        "api_level": {
          "status_code": 200
        },
        "database_level": ["Create new session in sessions table", "Update last_login in users table"]
      },
      "test_data": [
        {
          "name": "Admin credentials valid",
          "input_payload": {
            "username": "admin",
            "password": "Admin@123"
          },
          "expected_output": {
            "status": "success",
            "message": "Login successful"
          }
        }
      ]
    }
  ]
}
\`\`\`

**CRITICAL: OUTPUT ONLY A VALID JSON OBJECT - NO OTHER CONTENT**

**PERFORM USE CASE ANALYSIS AND GENERATE TEST CASES ACCORDING TO REQUIRED QUANTITY AND QUALITY STANDARDS**
`
    }
};

export class TestcaseGeminiService {
    private apiKeyService = new ApiKeyService();
    private llmService = new LLMService();;

    // Configuration
    private readonly BATCH_SIZE = 3;
    private readonly MAX_RESPONSE_LENGTH = 15000;
    private readonly TESTCASE_BATCH_SIZE = 20; // Batch size cho test case generation

    /**
     * ✅ Helper: Generate committed_testcases với loop cho đến khi đủ số lượng
     */
    private async generateCommittedTestcasesWithLoop(
        requirements: any[],
        testType: string,
        language: string,
        remainingCount: number,
        existingTitles: string[],
        modelName?: string,
        userId?: string,
        projectId?: string
    ): Promise<Array<{ title: string; requirement_id?: string; test_type?: string; priority?: string }>> {
        const requirementsJson = JSON.stringify(requirements, null, 2);
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const maxRetries = 5; // Tối đa 5 lần loop
        let allCommittedTestcases: Array<{ title: string; requirement_id?: string; test_type?: string; priority?: string }> = [];
        let existingTitlesSet = new Set(existingTitles.map(t => t.toLowerCase().trim()));
        let attempt = 0;

        while (allCommittedTestcases.length < remainingCount && attempt < maxRetries) {
            attempt++;
            const stillNeeded = remainingCount - allCommittedTestcases.length;
            const currentExistingTitles = Array.from(existingTitlesSet);

            console.log(`🔄 [ESTIMATE_LOOP] Attempt ${attempt}/${maxRetries}: Generating ${stillNeeded} more testcases (already have ${allCommittedTestcases.length}/${remainingCount})`);

            // Tạo prompt với danh sách đã có
            const prompt = testcasePrompts[lang].estimateTestCasesCount(
                requirementsJson,
                testType,
                currentExistingTitles.length > 0 ? currentExistingTitles : undefined,
                stillNeeded
            );

            // ✅ Sử dụng LLMService để lấy recommended model
            let effectiveModelName = modelName;
            if (!effectiveModelName && userId) {
                effectiveModelName = await this.llmService.getRecommendedModel(undefined, userId);
            } else if (!effectiveModelName) {
                effectiveModelName = await this.llmService.getRecommendedModel();
            }

            try {
                const response = await this.llmService.callLLM({
                    prompt: prompt,
                    modelName: effectiveModelName,
                    userId: userId,
                    projectId: projectId,
                    endpoint: 'estimateTestCasesCount',
                    isProductionFreeMode: true,
                    forceModel: !!modelName
                });

                let text: string = response.text || "{}";
                text = this.cleanJsonString(text);

                // Parse JSON
                let parsed: any = null;
                try {
                    parsed = JSON.parse(text);
                } catch (parseError: any) {
                    try {
                        const repairedJson = this.repairTruncatedJson(text);
                        parsed = JSON.parse(repairedJson);
                    } catch (repairError: any) {
                        const jsonMatch = text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const extractedJson = this.repairTruncatedJson(jsonMatch[0]);
                            parsed = JSON.parse(extractedJson);
                        } else {
                            throw new Error("No JSON object found in response");
                        }
                    }
                }

                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    const estimate = parsed as any;

                    if (estimate.committed_testcases && Array.isArray(estimate.committed_testcases)) {
                        const newTestcases = estimate.committed_testcases
                            .filter((tc: any) => tc && tc.title && typeof tc.title === 'string')
                            .map((tc: any) => ({
                                title: tc.title.trim(),
                                requirement_id: tc.requirement_id || tc.requirementId || undefined,
                                test_type: tc.test_type || tc.testType || undefined,
                                priority: tc.priority || undefined
                            }))
                            .filter((tc: any) => {
                                // ✅ Loại bỏ duplicate
                                const titleLower = tc.title.toLowerCase().trim();
                                if (existingTitlesSet.has(titleLower)) {
                                    console.log(`⏩ [ESTIMATE_LOOP] Skipping duplicate: "${tc.title}"`);
                                    return false;
                                }
                                existingTitlesSet.add(titleLower);
                                return true;
                            });

                        allCommittedTestcases.push(...newTestcases);
                        console.log(`✅ [ESTIMATE_LOOP] Attempt ${attempt}: Got ${newTestcases.length} new testcases (total: ${allCommittedTestcases.length}/${remainingCount})`);

                        // Nếu đã đủ, dừng
                        if (allCommittedTestcases.length >= remainingCount) {
                            console.log(`✅ [ESTIMATE_LOOP] Reached target count: ${allCommittedTestcases.length}/${remainingCount}`);
                            break;
                        }
                    }
                }
            } catch (error: any) {
                console.warn(`⚠️ [ESTIMATE_LOOP] Attempt ${attempt} failed: ${error.message}`);
                if (attempt >= maxRetries) {
                    console.warn(`⚠️ [ESTIMATE_LOOP] Max retries reached. Using ${allCommittedTestcases.length} testcases instead of ${remainingCount}`);
                    break;
                }
            }
        }

        // Chỉ lấy đúng số lượng cần thiết
        return allCommittedTestcases.slice(0, remainingCount);
    }

    /**
     * ✅ MỚI: Estimate số lượng test cases cần generate
     */
    async estimateTestCasesCount(
        requirements: any[],
        testType: string,
        language: string = 'vi-VN',
        modelName?: string,
        userId?: string,
        projectId?: string
    ): Promise<{
        estimated_count: number;
        summary: string;
        estimated_batches: number;
        reasoning?: string;
        committed_testcases?: Array<{ // ✅ Danh sách testcases chi tiết từ LLM
            title: string;
            requirement_id?: string;
            test_type?: string;
            priority?: string;
        }>;
    }> {
        const requirementsJson = JSON.stringify(requirements, null, 2);
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = testcasePrompts[lang].estimateTestCasesCount(requirementsJson, testType);

        // ✅ Sử dụng LLMService để lấy recommended model (ưu tiên modelName được truyền vào, sau đó user selected model)
        let effectiveModelName = modelName;
        if (!effectiveModelName && userId) {
            // Nếu không có modelName, thử lấy từ user selection
            effectiveModelName = await this.llmService.getRecommendedModel(undefined, userId);
        } else if (!effectiveModelName) {
            // Fallback: lấy recommended model
            effectiveModelName = await this.llmService.getRecommendedModel();
        }

        try {
            console.log(`📊 [ESTIMATE] Estimating test cases count for ${requirements.length} requirements, testType: ${testType}, model: ${effectiveModelName}`);

            const response = await this.llmService.callLLM({
                prompt: prompt,
                modelName: effectiveModelName,
                userId: userId,
                projectId: projectId,
                endpoint: 'estimateTestCasesCount',
                isProductionFreeMode: true,
                forceModel: !!modelName // ✅ Nếu có modelName được chỉ định, force sử dụng nó
            });

            let text: string = response.text || "{}";
            text = this.cleanJsonString(text);

            // Parse JSON với khả năng sửa JSON bị truncate
            let parsed: any = null;
            try {
                parsed = JSON.parse(text);
            } catch (parseError: any) {
                console.warn(`⚠️ [ESTIMATE] JSON parse failed, attempting repair... Error: ${parseError.message}`);
                try {
                    // Thử sửa JSON bị truncate
                    const repairedJson = this.repairTruncatedJson(text);
                    parsed = JSON.parse(repairedJson);
                    console.log(`✅ [ESTIMATE] JSON repair successful`);
                } catch (repairError: any) {
                    // Nếu repair không thành công, thử extract JSON object từ response
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            const extractedJson = this.repairTruncatedJson(jsonMatch[0]);
                            parsed = JSON.parse(extractedJson);
                            console.log(`✅ [ESTIMATE] JSON extraction and repair successful`);
                        } catch (extractError: any) {
                            console.error(`❌ [ESTIMATE] Failed to parse JSON even after repair: ${extractError.message}`);
                            throw new Error(`Invalid JSON format: ${extractError.message}`);
                        }
                    } else {
                        console.error(`❌ [ESTIMATE] No JSON object found in response`);
                        throw new Error("No JSON object found in response");
                    }
                }
            }

            // Validate
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const estimate = parsed as any;

                if (typeof estimate.estimated_count !== 'number' || estimate.estimated_count < 1) {
                    console.error(`❌ [ESTIMATE] Invalid estimated_count: ${estimate.estimated_count}`);
                    throw new Error(`Invalid estimated_count: must be a positive number, got ${estimate.estimated_count}`);
                }

                let estimated_count = Math.max(1, Math.floor(estimate.estimated_count || 1));
                const estimated_batches = Math.ceil(estimated_count / this.TESTCASE_BATCH_SIZE);

                console.log(`✅ [ESTIMATE] Estimated ${estimated_count} test cases, ${estimated_batches} batches (batch size: ${this.TESTCASE_BATCH_SIZE})`);

                // ✅ Validate và format committed_testcases từ LLM (lần đầu)
                let committedTestcases: Array<{ title: string; requirement_id?: string; test_type?: string; priority?: string }> = [];
                if (estimate.committed_testcases && Array.isArray(estimate.committed_testcases)) {
                    committedTestcases = estimate.committed_testcases
                        .filter((tc: any) => tc && tc.title && typeof tc.title === 'string')
                        .map((tc: any) => ({
                            title: tc.title.trim(),
                            requirement_id: tc.requirement_id || tc.requirementId || undefined,
                            test_type: tc.test_type || tc.testType || undefined,
                            priority: tc.priority || undefined
                        }));
                }

                // ✅ QUAN TRỌNG: Nếu số lượng không đủ, loop để generate thêm
                if (committedTestcases.length < estimated_count) {
                    const remaining = estimated_count - committedTestcases.length;
                    console.log(`🔄 [ESTIMATE] Only got ${committedTestcases.length}/${estimated_count} testcases. Looping to generate ${remaining} more...`);

                    // Lấy danh sách titles đã có
                    const existingTitles = committedTestcases.map(tc => tc.title);

                    // Loop để generate phần còn lại
                    const additionalTestcases = await this.generateCommittedTestcasesWithLoop(
                        requirements,
                        testType,
                        language,
                        remaining,
                        existingTitles,
                        modelName,
                        userId,
                        projectId
                    );

                    // Merge với danh sách đã có
                    committedTestcases.push(...additionalTestcases);
                    console.log(`✅ [ESTIMATE] After loop: Got ${committedTestcases.length}/${estimated_count} testcases`);
                }

                // ✅ Nếu vẫn không đủ, điều chỉnh estimated_count
                if (committedTestcases.length !== estimated_count) {
                    console.warn(`⚠️ [ESTIMATE] committed_testcases count (${committedTestcases.length}) doesn't match estimated_count (${estimated_count}). Adjusting estimated_count to match.`);
                    estimated_count = committedTestcases.length;
                    const adjustedBatches = Math.ceil(estimated_count / this.TESTCASE_BATCH_SIZE);
                    console.log(`✅ [ESTIMATE] Adjusted to ${estimated_count} test cases, ${adjustedBatches} batches to match committed_testcases`);
                }

                // ✅ Chỉ trả về nếu có đủ số lượng
                const finalCommittedTestcases = committedTestcases.length > 0 && committedTestcases.length === estimated_count
                    ? committedTestcases
                    : undefined;

                return {
                    estimated_count, // ✅ Đã được điều chỉnh nếu cần để khớp với committed_testcases
                    estimated_batches: Math.ceil(estimated_count / this.TESTCASE_BATCH_SIZE), // ✅ Tính lại batches sau khi điều chỉnh
                    summary: estimate.summary || `Estimated ${estimated_count} test cases for ${requirements.length} requirements`,
                    reasoning: estimate.reasoning,
                    committed_testcases: finalCommittedTestcases // ✅ Chỉ trả về nếu đủ số lượng
                };
            } else {
                throw new Error("Invalid response format: expected JSON object");
            }
        } catch (error: any) {
            console.error(`❌ [ESTIMATE] Error estimating test cases:`, error);
            // Fallback estimate
            const fallbackCount = requirements.length * (testType === 'all' ? 25 : 5); // 5 test cases per requirement, or 25 if all types
            const fallbackBatches = Math.ceil(fallbackCount / this.TESTCASE_BATCH_SIZE);
            console.warn(`⚠️ [ESTIMATE] Using fallback estimate: ${fallbackCount} test cases, ${fallbackBatches} batches`);
            return {
                estimated_count: fallbackCount,
                estimated_batches: fallbackBatches,
                summary: `Fallback estimate: ${fallbackCount} test cases`,
                reasoning: "Fallback estimate due to estimation error"
            };
        }
    }

    /**
     * ✅ MỚI: Generate test cases theo batch với offset và batchSize
     */
    async generateTestCasesBatch(
        requirements: any[],
        databaseSchema: any,
        batchNumber: number,
        totalBatches: number,
        offset: number,
        batchSize: number,
        language: string = 'vi-VN',
        testType: string = 'integration',
        estimatedTotal?: number,
        modelName?: string,
        userId?: string,
        projectId?: string,
        existingTitles?: string[] // ✅ Thêm parameter để tránh duplicate
    ): Promise<any[]> {
        try {
            console.log(`📦 [BATCH ${batchNumber}/${totalBatches}] Generating test cases ${offset + 1} to ${offset + batchSize} (estimated total: ${estimatedTotal || 'unknown'})...`);

            // Tạo prompt cho batch này
            const requirementsJson = JSON.stringify(requirements, null, 2);
            const databaseSchemaJson = JSON.stringify(databaseSchema, null, 2);
            const lang = language === 'en-US' ? 'en-US' : 'vi-VN';

            // Sử dụng prompt hiện tại nhưng thêm thông tin batch
            const basePrompt = testcasePrompts[lang].testcaseDesign(requirementsJson, databaseSchemaJson, testType);

            // ✅ Thêm thông tin về existing testcases để tránh duplicate
            const existingTitlesSection = existingTitles && existingTitles.length > 0
                ? `\n**EXISTING TESTCASES (DO NOT DUPLICATE):**
The following testcase titles already exist. DO NOT generate testcases with these titles:
${existingTitles.map((title, idx) => `${idx + 1}. "${title}"`).join('\n')}

**CRITICAL**: Generate NEW testcases that are DIFFERENT from the above list. Check the title carefully before generating.`
                : '';

            const batchPrompt = `${basePrompt}

**BATCH INFORMATION:**
- Batch number: ${batchNumber}/${totalBatches}
- Start from test case number: ${offset + 1}
- Number of test cases to generate in this batch: ${batchSize}
${estimatedTotal ? `- **TOTAL ESTIMATED TEST CASES: ${estimatedTotal}** - DO NOT generate more than this!` : ''}
${existingTitlesSection}

**REQUIREMENTS:**
- Generate exactly ${batchSize} test cases (or fewer if content is exhausted)
${estimatedTotal ? `- **IMPORTANT**: Total estimated test cases is ${estimatedTotal}. Currently generated ${offset} test cases. Only generate maximum ${estimatedTotal - offset} test cases in this batch.` : ''}
- Start from test case number ${offset + 1}
- DO NOT repeat test cases already generated in previous batches
${existingTitles && existingTitles.length > 0 ? '- **CRITICAL**: DO NOT generate testcases with titles that already exist (see EXISTING TESTCASES list above)' : ''}
- Each test case must have complete information

**IMPORTANT:**
- Return ONLY JSON object with "testcases" array, no markdown, no code fence
- If content is exhausted → return empty array []
`;

            // ✅ Sử dụng LLMService để lấy recommended model (ưu tiên modelName được truyền vào, sau đó user selected model)
            let effectiveModelName = modelName;
            if (!effectiveModelName && userId) {
                // Nếu không có modelName, thử lấy từ user selection
                effectiveModelName = await this.llmService.getRecommendedModel(undefined, userId);
            } else if (!effectiveModelName) {
                // Fallback: lấy recommended model
                effectiveModelName = await this.llmService.getRecommendedModel();
            }

            console.log(`🔑 [BATCH ${batchNumber}/${totalBatches}] Calling LLM with model: ${effectiveModelName}${userId ? ` (user: ${userId})` : ''}`);

            const response = await this.llmService.callLLM({
                prompt: batchPrompt,
                modelName: effectiveModelName,
                userId: userId,
                projectId: projectId,
                endpoint: 'generateTestCasesBatch',
                isProductionFreeMode: true,
                forceModel: !!modelName // ✅ Nếu có modelName được chỉ định, force sử dụng nó
            });

            let responseText: string = response.text || "{}";
            responseText = this.cleanJsonString(responseText);

            // Parse JSON với khả năng sửa JSON bị truncate
            let parsed: any = null;
            try {
                parsed = JSON.parse(responseText);
            } catch (parseError: any) {
                console.warn(`⚠️ [BATCH ${batchNumber}/${totalBatches}] JSON parse failed, attempting repair... Error: ${parseError.message}`);
                try {
                    // Thử sửa JSON bị truncate
                    const repairedJson = this.repairTruncatedJson(responseText);
                    parsed = JSON.parse(repairedJson);
                    console.log(`✅ [BATCH ${batchNumber}/${totalBatches}] JSON repair successful`);
                } catch (repairError: any) {
                    // Nếu repair không thành công, thử extract JSON object từ response
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            const extractedJson = this.repairTruncatedJson(jsonMatch[0]);
                            parsed = JSON.parse(extractedJson);
                            console.log(`✅ [BATCH ${batchNumber}/${totalBatches}] JSON extraction and repair successful`);
                        } catch (extractError: any) {
                            console.error(`❌ [BATCH ${batchNumber}/${totalBatches}] Failed to parse JSON even after repair: ${extractError.message}`);
                            console.error(`❌ [BATCH ${batchNumber}/${totalBatches}] Response length: ${responseText.length}, First 500 chars: ${responseText.substring(0, 500)}`);
                            throw new Error(`Invalid JSON format: ${extractError.message}`);
                        }
                    } else {
                        console.error(`❌ [BATCH ${batchNumber}/${totalBatches}] No JSON object found in response`);
                        throw new Error("No JSON object found in response");
                    }
                }
            }

            let testCases = parsed.testcases || [];
            if (!Array.isArray(testCases)) {
                testCases = [];
            }

            // ✅ FIX: Giới hạn số lượng test cases dựa trên estimate
            if (estimatedTotal && estimatedTotal > 0) {
                const maxAllowed = estimatedTotal - offset;
                if (testCases.length > maxAllowed) {
                    console.warn(`⚠️ [BATCH ${batchNumber}/${totalBatches}] LLM generated ${testCases.length} test cases, but estimate (${estimatedTotal}) allows only ${maxAllowed} (offset: ${offset}). Limiting to ${maxAllowed}.`);
                    testCases = testCases.slice(0, maxAllowed);
                }
            }

            // Normalize test cases
            const normalized = this.standardizeTestCases(testCases, requirements, databaseSchema);
            console.log(`✅ [BATCH ${batchNumber}/${totalBatches}] Generated ${normalized.length} test cases${estimatedTotal ? ` (estimated total: ${estimatedTotal}, remaining: ${estimatedTotal - offset - normalized.length})` : ''}`);

            return normalized;
        } catch (err: any) {
            console.error(`❌ [BATCH ${batchNumber}/${totalBatches}] LLM call failed:`, err?.message || err);
            throw err;
        }
    }

    /**
     * Generate enterprise test cases from requirements and database schema
     */
    async generateTestCases(requirements: any[], databaseSchema: any, language: string = 'vi-VN', testType: string = 'integration'): Promise<any[]> {
        try {
            console.log(`🧪 Generating ${testType} test cases for ${requirements.length} requirements`);

            // Nếu testType = "all" nhưng được gọi trực tiếp, xử lý đặc biệt
            if (testType === 'all' && requirements.length > 0) {
                // Tạo test cases đa dạng cho requirement đầu tiên
                return await this.generateMixedTestCases(requirements[0], databaseSchema, language);
            }

            if (requirements.length <= this.BATCH_SIZE) {
                return await this.processBatch(requirements, databaseSchema, language, testType);
            } else {
                return await this.processInBatches(requirements, databaseSchema, language, testType);
            }
        } catch (error) {
            console.error("❌ Error generating test cases:", error);
            return this.createFallbackTestCases(requirements, databaseSchema, testType);
        }
    }

    /**
     * Generate mixed test cases for a single requirement (khi testType = "all")
     */
    private async generateMixedTestCases(requirement: any, databaseSchema: any, language: string): Promise<any[]> {
        const mixedTestCases = [];
        const testTypes = ['integration', 'api', 'ui', 'performance', 'security'];

        // Số lượng test cases cho mỗi loại
        const counts = {
            'integration': 3,
            'api': 2,
            'ui': 1,
            'performance': 1,
            'security': 2
        };

        for (const testType of testTypes) {
            try {
                const prompt = this.createMixedPrompt(requirement, databaseSchema, testType, language);

                // ✅ MỚI: Token analysis trước khi gọi LLM
                const { getModelConfig, estimateTokens, determineStrategy, logTokenInfo } = await import("../../../shared/tokenManager");
                const keys = await this.apiKeyService.getAllActiveKeys("gemini");
                if (keys && keys.length > 0) {
                    const modelConfig = getModelConfig(keys[0].model_name || 'gemini-2.0-flash', 'gemini');
                    logTokenInfo(prompt, modelConfig, `[Testcase ${testType}]`);
                }

                const response = await this.callGeminiAPI(prompt);

                if (response) {
                    const parsedData = JSON.parse(response);
                    const testCases = this.extractTestCases(parsedData);

                    // Giới hạn số lượng theo config
                    const limitedCases = testCases.slice(0, counts[testType as keyof typeof counts]);
                    mixedTestCases.push(...limitedCases);
                }

                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error(`❌ Error generating ${testType} tests:`, error);
            }
        }

        return this.standardizeTestCases(mixedTestCases, [requirement], databaseSchema);
    }

    /**
     * Create prompt cho mixed test generation
     */
    private createMixedPrompt(requirement: any, databaseSchema: any, testType: string, language: string): string {
        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        // Ensure id is set correctly - use _id if id doesn't exist
        const requirementId = requirement.id || requirement._id ? String(requirement._id || requirement.id) : '';
        // Hỗ trợ cả schema mới và cũ
        const actorOrRole = (requirement as any).actor || requirement.role;
        const mainFlow = (requirement as any).main_flow || requirement.tasks;
        const simplifiedRequirement = {
            id: requirementId,
            name: requirement.name,
            actor: actorOrRole, // Hỗ trợ cả actor (mới) và role (cũ)
            goal: requirement.goal,
            main_flow: mainFlow, // Hỗ trợ cả main_flow (mới) và tasks (cũ)
            priority: requirement.priority
        };

        const requirementsJson = JSON.stringify([simplifiedRequirement], null, 2);
        const databaseJson = JSON.stringify(databaseSchema, null, 2);

        return testcasePrompts[lang].testcaseDesign(requirementsJson, databaseJson, testType);
    }

    /**
     * Process a single batch of requirements
     */
    private async processBatch(requirements: any[], databaseSchema: any, language: string, testType: string): Promise<any[]> {
        // Ensure each requirement has a valid id field (use _id if id doesn't exist)
        // Hỗ trợ cả schema mới và cũ
        const simplifiedRequirements = requirements.map(req => {
            const actorOrRole = (req as any).actor || req.role;
            const mainFlow = (req as any).main_flow || req.tasks;
            return {
                id: req.id || (req._id ? String(req._id) : ''),
                name: req.name,
                actor: actorOrRole, // Hỗ trợ cả actor (mới) và role (cũ)
                goal: req.goal,
                main_flow: mainFlow, // Hỗ trợ cả main_flow (mới) và tasks (cũ)
                inputs: req.inputs,
                outputs: req.outputs,
                priority: req.priority
            };
        });

        const enhancedDatabase = {
            tables: databaseSchema.tables?.map((table: any) => ({
                name: table.name,
                columns: table.columns?.map((col: any) => ({
                    name: col.name,
                    type: col.type,
                    nullable: col.nullable,
                    is_primary_key: col.is_primary_key,
                    is_foreign_key: col.is_foreign_key,
                    related_usecase_ids: col.related_usecase_ids || []
                }))
            }))
        };

        const requirementsJson = JSON.stringify(simplifiedRequirements, null, 2);
        const databaseJson = JSON.stringify(enhancedDatabase, null, 2);

        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = testcasePrompts[lang].testcaseDesign(requirementsJson, databaseJson, testType);

        console.log(`📝 Generating test cases for ${requirements.length} use cases`);

        // ✅ MỚI: Token analysis trước khi gọi LLM
        const { getModelConfig, estimateTokens, determineStrategy, logTokenInfo } = await import("../../../shared/tokenManager");
        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (keys && keys.length > 0) {
            const modelConfig = getModelConfig(keys[0].model_name || 'gemini-2.0-flash', 'gemini');
            logTokenInfo(prompt, modelConfig, `[Testcase ${testType}]`);
        }

        const response = await this.callGeminiAPI(prompt);

        if (!response) {
            throw new Error("Empty response from Gemini");
        }

        console.log(`📄 Raw response length: ${response.length}`);

        let parsedData;
        try {
            parsedData = JSON.parse(response);
        } catch (parseError) {
            console.error("❌ JSON parse error, attempting repair...");
            const repaired = this.repairJSON(response);
            parsedData = JSON.parse(repaired);
        }

        const testCases = this.extractTestCases(parsedData);
        console.log(`🔄 Processing ${testCases.length} raw test cases`);

        const standardized = this.standardizeTestCases(testCases, requirements, databaseSchema);
        console.log(`🎉 Final test cases: ${standardized.length}`);

        return standardized;
    }

    /**
     * Extract test cases from parsed response
     */
    private extractTestCases(parsedData: any): any[] {
        if (parsedData.testcases && Array.isArray(parsedData.testcases)) {
            return parsedData.testcases;
        } else if (Array.isArray(parsedData)) {
            return parsedData;
        } else {
            throw new Error("Invalid test case response format");
        }
    }

    /**
     * Standardize test cases to enterprise schema
     */
    private standardizeTestCases(testCases: any[], requirements: any[], databaseSchema: any): any[] {
        const usedTitles = new Set<string>();

        return testCases.map((testCase, index) => {
            const isUpdate = testCase.id !== undefined;

            let title = testCase.title || `Test Case ${index + 1}`;
            if (usedTitles.has(title) && !isUpdate) {
                title = `${title} ${index + 1}`;
            }
            usedTitles.add(title);

            return {
                ...(isUpdate && { id: testCase.id }),
                title,
                description: testCase.description || '',
                test_type: this.validateEnum(testCase.test_type, ['integration', 'api', 'ui', 'performance', 'security'], 'integration'),
                source_requirement_ids: this.validateRequirementIds(testCase.source_requirement_ids, requirements),
                priority: this.validateEnum(testCase.priority, ['low', 'medium', 'high', 'critical'], 'medium'),
                preconditions: this.ensureArray(testCase.preconditions, ['System is operational']),
                postconditions: [],
                database_tables: this.extractTables(testCase, requirements, databaseSchema),
                database_operations: this.extractOperations(testCase),
                steps: this.standardizeSteps(testCase.steps),
                expected_results: this.standardizeExpectedResults(testCase.expected_results),
                test_data: this.standardizeTestData(testCase.test_data),
                automation: {},
                status: 'not_executed',
                environment: {},
                execution_logs_format: {}
            };
        });
    }

    /**
     * Standardize test steps
     */
    private standardizeSteps(steps: any[] | undefined): any[] {
        if (!steps || !Array.isArray(steps)) {
            return [{
                step_number: 1,
                action: "Execute test procedure",
                input_data: {},
                expected_immediate_result: "Step completed"
            }];
        }

        return steps.map((step, index) => {
            if (typeof step === 'string') {
                return {
                    step_number: index + 1,
                    action: step,
                    input_data: {},
                    expected_immediate_result: "Step completed successfully"
                };
            }

            return {
                step_number: step.step_number || index + 1,
                action: step.action || `Step ${index + 1}`,
                input_data: step.input_data || {},
                expected_immediate_result: step.expected_immediate_result || "Step completed successfully"
            };
        });
    }

    /**
     * Standardize expected results
     */
    private standardizeExpectedResults(results: any): any {
        return {
            ui_level: this.ensureArray(results?.ui_level, ["Operation completed"]),
            api_level: {
                status_code: results?.api_level?.status_code || 200
            },
            database_level: this.ensureArray(results?.database_level, ["Database operations completed"]),
            business_level: results?.business_level || "Business requirement satisfied"
        };
    }

    /**
     * Standardize test data
     */
    private standardizeTestData(testData: any[] | undefined): any[] {
        if (!testData || !Array.isArray(testData)) {
            return [{
                name: "Default Test Data",
                input_payload: {},
                expected_output: { status: "success" }
            }];
        }

        return testData.map(data => ({
            name: data.name || "Test Data",
            input_payload: data.input_payload || {},
            expected_output: data.expected_output || { status: "success" }
        }));
    }

    /**
     * Extract database tables from test case and requirements
     */
    private extractTables(testCase: any, requirements: any[], databaseSchema: any): string[] {
        const tables = new Set<string>();

        // From explicit declaration
        if (testCase.database_tables) {
            testCase.database_tables.forEach((table: string) => tables.add(table));
        }

        // From requirement mapping
        const reqIds = testCase.source_requirement_ids || [];
        reqIds.forEach((reqId: string) => {
            databaseSchema.tables?.forEach((table: any) => {
                const hasRelation = table.columns?.some((col: any) =>
                    col.related_usecase_ids?.includes(reqId)
                );
                if (hasRelation) tables.add(table.name);
            });
        });

        return Array.from(tables);
    }

    /**
     * Extract database operations from test case
     */
    private extractOperations(testCase: any): string[] {
        const operations = new Set<string>();

        // From explicit declaration
        if (testCase.database_operations) {
            testCase.database_operations.forEach((op: string) => operations.add(op));
        }

        // From steps analysis
        if (testCase.steps) {
            testCase.steps.forEach((step: any) => {
                const action = typeof step === 'string' ? step : step.action;
                const lowerAction = action.toLowerCase();

                if (lowerAction.includes('insert') || lowerAction.includes('create')) operations.add('insert');
                if (lowerAction.includes('update') || lowerAction.includes('modify')) operations.add('update');
                if (lowerAction.includes('delete') || lowerAction.includes('remove')) operations.add('delete');
                if (lowerAction.includes('select') || lowerAction.includes('read')) operations.add('select');
            });
        }

        return Array.from(operations).length > 0 ? Array.from(operations) : ['select'];
    }

    /**
     * Validate enum values
     */
    private validateEnum(value: string, validValues: string[], defaultValue: string): string {
        return validValues.includes(value) ? value : defaultValue;
    }

    /**
     * Validate requirement IDs
     */
    private validateRequirementIds(ids: string[] | undefined, requirements: any[]): string[] {
        if (!ids || !Array.isArray(ids)) return [];

        // Create a map of all possible ID formats for each requirement
        const validIdsSet = new Set<string>();
        requirements.forEach(r => {
            if (r._id) {
                const objectIdStr = String(r._id);
                validIdsSet.add(objectIdStr);
                // Also add ObjectId.toString() format
                if (objectIdStr.length === 24) { // MongoDB ObjectId format
                    validIdsSet.add(objectIdStr);
                }
            }
            // Support requirement.id if it exists (for backward compatibility)
            if (r.id && String(r.id) !== String(r._id || '')) {
                validIdsSet.add(String(r.id));
            }
            // Support requirement_id field
            if (r.requirement_id) {
                validIdsSet.add(String(r.requirement_id));
            }
        });

        // Filter and map IDs - try to match with any valid format
        const validatedIds: string[] = [];
        ids.forEach(id => {
            const idStr = String(id).trim();
            if (!idStr) return;

            // Direct match
            if (validIdsSet.has(idStr)) {
                // Map to ObjectId string format for storage
                const matchedReq = requirements.find(r => {
                    const reqIdStr = String(r._id || '');
                    const reqIdAlt = String(r.id || '');
                    const reqIdReq = String(r.requirement_id || '');
                    return reqIdStr === idStr || reqIdAlt === idStr || reqIdReq === idStr;
                });
                if (matchedReq && matchedReq._id) {
                    validatedIds.push(String(matchedReq._id));
                }
            } else {
                // Try case-insensitive match
                const matchedReq = requirements.find(r => {
                    const reqIdStr = String(r._id || '').toLowerCase();
                    const reqIdAlt = String(r.id || '').toLowerCase();
                    const reqIdReq = String(r.requirement_id || '').toLowerCase();
                    const searchId = idStr.toLowerCase();
                    return reqIdStr === searchId || reqIdAlt === searchId || reqIdReq === searchId;
                });
                if (matchedReq && matchedReq._id) {
                    validatedIds.push(String(matchedReq._id));
                }
            }
        });

        return validatedIds;
    }

    /**
     * Ensure value is an array
     */
    private ensureArray(value: any, defaultValue: any[] = []): any[] {
        return Array.isArray(value) ? value : defaultValue;
    }

    /**
     * Process requirements in batches
     */
    private async processInBatches(requirements: any[], databaseSchema: any, language: string, testType: string): Promise<any[]> {
        console.log(`🔀 Splitting ${requirements.length} requirements into batches`);

        const batches: any[][] = [];
        for (let i = 0; i < requirements.length; i += this.BATCH_SIZE) {
            batches.push(requirements.slice(i, i + this.BATCH_SIZE));
        }

        console.log(`📦 Created ${batches.length} batches`);

        const allTestCases: any[] = [];

        for (let i = 0; i < batches.length; i++) {
            try {
                console.log(`🔄 Processing batch ${i + 1}/${batches.length}`);
                const testCases = await this.processBatch(batches[i], databaseSchema, language, testType);
                allTestCases.push(...testCases);

                // Add delay between batches
                if (i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`❌ Batch ${i + 1} failed:`, error);
            }
        }

        if (allTestCases.length === 0) {
            console.warn("⚠️ All batches failed, using fallback");
            return this.createFallbackTestCases(requirements, databaseSchema);
        }

        return allTestCases;
    }

    /**
     * Create fallback test cases when generation fails
     */
    private createFallbackTestCases(requirements: any[], databaseSchema?: any, testType: string = 'integration'): any[] {
        console.log("🔄 Creating fallback test cases");

        return requirements.flatMap(requirement => {
            const scenarios = [
                { suffix: "Thành công", priority: "high" },
                { suffix: "Thất bại validation", priority: "medium" },
                { suffix: "Giá trị biên", priority: "medium" },
                { suffix: "Lỗi hệ thống", priority: "low" }
            ];

            return scenarios.map((scenario, index) => ({
                title: `${requirement.name} - ${scenario.suffix}`,
                description: `Test ${scenario.suffix.toLowerCase()} cho ${requirement.goal}`,
                test_type: testType,
                source_requirement_ids: [requirement.id],
                priority: scenario.priority,
                preconditions: ["Hệ thống hoạt động", "Dữ liệu test sẵn sàng"],
                postconditions: [],
                database_tables: this.guessTables(requirement),
                database_operations: ['select'],
                steps: [
                    {
                        step_number: 1,
                        action: `Thực thi ${requirement.name}`,
                        input_data: {},
                        expected_immediate_result: "Hệ thống xử lý yêu cầu"
                    }
                ],
                expected_results: {
                    ui_level: ["Hiển thị kết quả phù hợp"],
                    api_level: { status_code: 200 },
                    database_level: ["Thao tác database thành công"]
                },
                test_data: [{
                    name: `Test data ${scenario.suffix}`,
                    input_payload: {},
                    expected_output: { status: "success" }
                }],
                automation: {},
                status: 'not_executed',
                environment: {},
                execution_logs_format: {}
            }));
        });
    }

    /**
     * Guess tables from requirement
     */
    private guessTables(requirement: any): string[] {
        const text = `${requirement.name} ${requirement.tasks?.join(' ') || ''}`.toLowerCase();
        const tables = [];

        if (text.includes('user')) tables.push('users');
        if (text.includes('order')) tables.push('orders');
        if (text.includes('product')) tables.push('products');
        if (text.includes('payment')) tables.push('payments');

        return tables.length > 0 ? tables : ['users'];
    }

    /**
     * Call LLM API (auto-detect provider, ưu tiên OpenRouter)
     */
    private async callGeminiAPI(prompt: string, userId?: string, projectId?: string): Promise<string> {
        // ✅ Sử dụng LLMService để lấy recommended model (không hardcode)
        const modelName = await this.llmService.getRecommendedModel();

        try {
            console.log(`🔑 Calling LLM for testcase generation with model: ${modelName}`);

            const response = await this.llmService.callLLM({
                prompt: prompt,
                modelName: modelName,
                userId: userId,
                projectId: projectId,
                endpoint: 'generateTestcase',
                isProductionFreeMode: true
            });

            const text = response.text || "";
            return this.cleanJSONResponse(text);
        } catch (error: any) {
            console.error(`❌ LLM call failed for testcase generation:`, error?.message || error);
            throw error;
        }
    }

    /**
     * Clean JSON response from Gemini
     */
    private cleanJSONResponse(text: string): string {
        if (!text) return "";

        let cleaned = text.trim();

        // Try direct parse first
        try {
            JSON.parse(cleaned);
            return cleaned;
        } catch {
            // Continue with cleaning
        }

        // Remove code blocks
        const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
        const codeMatch = codeBlockRegex.exec(cleaned);
        if (codeMatch) {
            cleaned = codeMatch[1].trim();
        }

        // Find JSON object
        const jsonStart = Math.max(cleaned.indexOf('{'), cleaned.indexOf('['));
        if (jsonStart > 0) {
            cleaned = cleaned.substring(jsonStart);
        }

        // Final parse attempt
        try {
            JSON.parse(cleaned);
            return cleaned;
        } catch {
            console.warn("❌ Could not extract valid JSON, returning raw text");
            return text.replace(/```(?:json)?\s*|```/g, '').trim();
        }
    }

    /**
     * Repair truncated JSON
     */
    private repairJSON(jsonStr: string): string {
        console.log(`🔧 Repairing JSON, length: ${jsonStr.length}`);

        let balance = 0;
        let inString = false;
        let escapeNext = false;
        let lastValidIndex = 0;

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
            }

            if (!inString) {
                if (char === '{' || char === '[') balance++;
                if (char === '}' || char === ']') balance--;

                if (balance === 0) {
                    lastValidIndex = i;
                }
            }
        }

        // Truncate to last valid position
        if (lastValidIndex > 0 && balance !== 0) {
            return jsonStr.substring(0, lastValidIndex + 1);
        }

        // Add missing closing brackets
        let repaired = jsonStr;
        while (balance > 0) {
            if (repaired.endsWith(',') || repaired.endsWith('{') || repaired.endsWith('[')) {
                repaired = repaired.slice(0, -1);
            }
            repaired += '}';
            balance--;
        }

        return repaired;
    }

    /**
     * Clean JSON string by removing markdown code fences
     */
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

    /**
     * Sửa chữa JSON bị cắt ngắn (truncated JSON)
     * Xử lý trường hợp JSON response bị cắt giữa chừng do token limit hoặc API response limit
     * Strategy: Tìm vị trí cuối cùng có JSON hợp lệ và cắt bỏ phần bị hỏng
     */
    private repairTruncatedJson(jsonStr: string): string {
        if (!jsonStr || typeof jsonStr !== 'string') return '{}';

        let braceBalance = 0;  // Balance của {}
        let bracketBalance = 0;  // Balance của []
        let inString = false;
        let escapeNext = false;
        let lastValidPosition = -1;
        let stringStartPosition = -1;

        // Tìm vị trí cuối cùng có JSON hợp lệ
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
                if (!inString) {
                    // Bắt đầu string
                    stringStartPosition = i;
                } else {
                    // Kết thúc string
                    stringStartPosition = -1;
                    lastValidPosition = i; // String đã được đóng đúng cách
                }
                inString = !inString;
                continue;
            }

            if (!inString) {
                // Chỉ đếm balance khi không trong string
                if (char === '{') {
                    braceBalance++;
                    lastValidPosition = i;
                } else if (char === '}') {
                    braceBalance--;
                    lastValidPosition = i;
                    // Kiểm tra nếu đây là closing của object/array hợp lệ
                    if (braceBalance === 0 && bracketBalance === 0 && i > 0) {
                        // Có thể đây là vị trí kết thúc hợp lệ
                    }
                } else if (char === '[') {
                    bracketBalance++;
                    lastValidPosition = i;
                } else if (char === ']') {
                    bracketBalance--;
                    lastValidPosition = i;
                } else if (char === ',' && braceBalance >= 0 && bracketBalance >= 0) {
                    // Dấu phẩy hợp lệ (không trong string và balance >= 0)
                    lastValidPosition = i;
                }
            }
        }

        // Nếu đang trong string (string bị cắt giữa chừng)
        if (inString && stringStartPosition >= 0) {
            // Tìm về trước để tìm vị trí cuối cùng có JSON hợp lệ
            // Tìm dấu phẩy hợp lệ cuối cùng hoặc dấu đóng của object/array
            let cutPosition = stringStartPosition;
            let tempBalance = 0;
            let tempBracketBalance = 0;

            // Đếm balance từ đầu đến vị trí string bắt đầu để biết context
            for (let i = 0; i < stringStartPosition; i++) {
                const char = jsonStr[i];
                if (char === '{') tempBalance++;
                else if (char === '}') tempBalance--;
                else if (char === '[') tempBracketBalance++;
                else if (char === ']') tempBracketBalance--;
            }

            // Tìm về trước từ vị trí string bắt đầu để tìm dấu phẩy hoặc dấu đóng hợp lệ
            for (let i = stringStartPosition - 1; i >= 0; i--) {
                const char = jsonStr[i];
                if (char === ',') {
                    // Tìm thấy dấu phẩy - cắt trước dấu phẩy (loại bỏ property bị hỏng)
                    cutPosition = i;
                    break;
                } else if (char === '}' && tempBalance > 0) {
                    // Đã về đến object cha, cắt tại đây
                    cutPosition = i + 1;
                    break;
                } else if (char === ']' && tempBracketBalance > 0) {
                    // Đã về đến array cha, cắt tại đây
                    cutPosition = i + 1;
                    break;
                } else if (char === '{' || char === '[') {
                    // Đã về đến đầu object/array, cắt sau dấu mở (loại bỏ toàn bộ property)
                    cutPosition = i + 1;
                    break;
                }
            }

            // Cắt JSON tại vị trí hợp lệ
            jsonStr = jsonStr.substring(0, cutPosition).trim();

            // Loại bỏ dấu phẩy cuối cùng nếu có
            jsonStr = jsonStr.replace(/,\s*$/, '').trim();

            // Reset và đếm lại balance
            braceBalance = 0;
            bracketBalance = 0;
            inString = false;
            escapeNext = false;

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
                    if (char === '{') braceBalance++;
                    else if (char === '}') braceBalance--;
                    else if (char === '[') bracketBalance++;
                    else if (char === ']') bracketBalance--;
                }
            }
        }

        let repaired = jsonStr.trim();

        // Đóng các brackets/braces còn mở
        // Đóng arrays trước (vì array có thể nằm trong object)
        while (bracketBalance > 0) {
            repaired += ']';
            bracketBalance--;
        }

        // Đóng objects
        while (braceBalance > 0) {
            repaired += '}';
            braceBalance--;
        }

        // Kiểm tra và đóng cấu trúc tổng thể nếu cần
        if (repaired.startsWith('[') && !repaired.endsWith(']')) {
            repaired += ']';
        } else if (repaired.startsWith('{') && !repaired.endsWith('}')) {
            repaired += '}';
        }

        return repaired;
    }
}