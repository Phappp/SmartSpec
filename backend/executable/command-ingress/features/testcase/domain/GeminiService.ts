// TestcaseGeminiService.ts
import { ApiKeyService } from "../../orchestrator/domain/ApiKeyService";

// PROMPTS cho test case generation với Enterprise standard
const testcasePrompts = {
    'vi-VN': {
        testcaseDesign: (requirementsJson: string, databaseSchemaJson: string) => `
BẠN LÀ MỘT CHUYÊN GIA KIỂM THỬ PHẦN MỀM ĐẲNG CẤP THẾ GIỚI, chuyên tạo ra các test case toàn diện và hiệu quả từ yêu cầu nghiệp vụ và thiết kế database.

Nhiệm vụ của bạn là phân tích danh sách use case và cấu trúc database sau đây để tạo ra các test case chất lượng cao ĐẠT CHUẨN ENTERPRISE.

DANH SÁCH USE CASE:
${requirementsJson}

THIẾT KẾ DATABASE (VỚI USE CASE MAPPING):
${databaseSchemaJson}

## 🚨 QUY ĐỊNH NGHIÊM NGẶT VỀ ĐỊNH DẠNG JSON ĐẦU RA

**YÊU CẦU TUYỆT ĐỐI: CHỈ TRẢ VỀ DUY NHẤT MỘT JSON OBJECT - KHÔNG CÓ BẤT KỲ KÝ TỰ, KHOẢNG TRẮNG, XUỐNG DÒNG NÀO NGOÀI JSON**

### 🔥 CẤU TRÚC JSON BẮT BUỘC - VI PHẠM SẼ GÂY LỖI HỆ THỐNG:

\`\`\`json
{
  "testcases": [
    {
      "title": "string (BẮT BUỘC - format: [UC_ID] - [Tên use case] - [Kịch bản test])",
      "description": "string (BẮT BUỘC)",
      "test_type": "string (BẮT BUỘC - enum: unit|integration|api|ui)",
      "source_requirement_ids": ["array of strings"],
      "priority": "string (BẮT BUỘC - enum: low|medium|high|critical)",
      "preconditions": ["array of strings"],
      "postconditions": ["array of strings"],
      "database_tables": ["array of strings"],
      "database_operations": ["array of strings - enum: select|insert|update|delete|create|alter"],
      "steps": [
        {
          "step_number": "number (BẮT BUỘC)",
          "action": "string (BẮT BUỘC)",
          "input_data": {
            "field_name": "specific_value",
            "method": "POST|PUT|GET|DELETE",
            "endpoint": "/api/endpoint"
          },
          "expected_immediate_result": "string (BẮT BUỘC)"
        }
      ],
      "expected_results": {
        "ui_level": ["array of strings"],
        "api_level": {
          "status_code": "number",
          "response_schema": {}
        },
        "database_level": ["array of strings"],
        "business_level": "string"
      },
      "test_data": [
        {
          "name": "string (BẮT BUỘC)",
          "input_payload": {},
          "expected_output": {
            "status": "success|failure",
            "message": "string",
            "data": {},
            "status_code": "number"
          },
          "validation_rules": ["array of strings"]
        }
      ],
      "automation": {
        "is_automated": "boolean",
        "script_path": "string",
        "test_command": "string",
        "tags": ["array of strings"]
      },
      "execution_logs_format": {
        "timestamp": "string",
        "step_number": "number",
        "status": "passed|failed|skipped",
        "actual_result": "string",
        "screenshot_path": "string",
        "log_message": "string"
      }
    }
  ]
}
\`\`\`

## ⚠️ QUY TẮC VALIDATION NGHIÊM NGẶT:

### 1. **FIELD BẮT BUỘC (REQUIRED) - THIẾU SẼ GÂY LỖI:**
- title, description, test_type, priority
- steps (ít nhất 1 step)
- steps[].step_number, steps[].action, steps[].expected_immediate_result

### 2. **ENUM VALIDATION - SAI SẼ GÂY LỖI:**
- test_type: CHỈ "unit", "integration", "api", "ui"
- priority: CHỈ "low", "medium", "high", "critical" 
- database_operations: CHỈ "select", "insert", "update", "delete", "create", "alter"
- steps[].input_data.method: CHỈ "POST", "PUT", "GET", "DELETE"

### 3. **FORMAT VALIDATION - SAI SẼ GÂY LỖI:**
- title: PHẢI bắt đầu bằng "[UC_ID]" - ví dụ: "[UC1] - Đăng nhập - Thành công"
- source_requirement_ids: PHẢI là array của string, ví dụ: ["UC1", "UC2"]
- steps[].step_number: PHẢI là số nguyên dương, bắt đầu từ 1

### 4. **DATA TYPE VALIDATION - SAI SẼ GÂY LỖI:**
- steps[].input_data: PHẢI là object, không được là string
- expected_results.api_level.status_code: PHẢI là number
- test_data[].input_payload: PHẢI là object

## 🎯 QUY TẮC TẠO TEST CASE ENTERPRISE:

1. **TIÊU CHUẨN TITLE:**
   - Format: "[UC_ID] - [Tên use case] - [Kịch bản test]"
   - Ví dụ: "[UC1] - Đăng nhập - Thành công với thông tin hợp lệ"
   - **KHÔNG ĐƯỢC SỬ DỤNG "TC1-UC1" hoặc prefix số thứ tự**

2. **COVERAGE TỐI THIỂU:**
   - **Mỗi use case PHẢI có ít nhất 4 test cases:**
     1. Positive - Thành công
     2. Negative - Thất bại do input sai  
     3. Boundary - Giá trị biên
     4. Error case - Lỗi hệ thống/exception

3. **STEPS CHI TIẾT:**
   - Mỗi step PHẢI có input_data với giá trị CỤ THỂ
   - Ví dụ: 
     ✅ "Nhập username = 'testuser', password = 'Password123!'"
     ❌ "Nhập thông tin đăng nhập"

## 🚫 LỖI JSON KHÔNG ĐƯỢC PHÉP:
- Thừa dấu phẩy cuối cùng (trailing comma)
- Thiếu dấu ngoặc, dấu phẩy
- Comment trong JSON
- Bất kỳ text nào ngoài JSON object
- Format date/time không đúng chuẩn

**ĐẦU RA DUY NHẤT: MỘT JSON OBJECT HỢP LỆ - KHÔNG CÓ BẤT KỲ NỘI DUNG NÀO KHÁC**
`,

        testcaseEnhancement: (existingTestcasesJson: string, newRequirementsJson: string) => `
BẠN LÀ CHUYÊN GIA KIỂM THỬ ENTERPRISE, nhiệm vụ là phân tích test cases hiện có và yêu cầu mới để bổ sung test cases còn thiếu ĐẠT CHUẨN ENTERPRISE CAO.

TEST CASES HIỆN TẠI:
${existingTestcasesJson}

YÊU CẦU MỚI/UPDATE:
${newRequirementsJson}

## 🚨 QUY ĐỊNH NGHIÊM NGẶT VỀ ĐỊNH DẠNG JSON ĐẦU RA

**YÊU CẦU TUYỆT ĐỐI: CHỈ TRẢ VỀ DUY NHẤT MỘT JSON OBJECT - KHÔNG CÓ BẤT KỲ KÝ TỰ, KHOẢNG TRẮNG, XUỐNG DÒNG NÀO NGOÀI JSON**

### 🔥 CẤU TRÚC JSON BẮT BUỘC - VI PHẠM SẼ GÂY LỖI HỆ THỐNG:

\`\`\`json
{
  "additional_testcases": [
    {
      "title": "string (BẮT BUỘC - format: [UC_ID] - [Tên use case] - [Kịch bản test])",
      "description": "string (BẮT BUỘC)",
      "test_type": "string (BẮT BUỘC - enum: unit|integration|api|ui)",
      "source_requirement_ids": ["array of strings"],
      "priority": "string (BẮT BUỘC - enum: low|medium|high|critical)",
      "preconditions": ["array of strings"],
      "postconditions": ["array of strings"],
      "database_tables": ["array of strings"],
      "database_operations": ["array of strings - enum: select|insert|update|delete|create|alter"],
      "steps": [
        {
          "step_number": "number (BẮT BUỘC)",
          "action": "string (BẮT BUỘC)",
          "input_data": {
            "field_name": "specific_value",
            "method": "POST|PUT|GET|DELETE",
            "endpoint": "/api/endpoint"
          },
          "expected_immediate_result": "string (BẮT BUỘC)"
        }
      ],
      "expected_results": {
        "ui_level": ["array of strings"],
        "api_level": {
          "status_code": "number",
          "response_schema": {}
        },
        "database_level": ["array of strings"],
        "business_level": "string"
      },
      "test_data": [
        {
          "name": "string (BẮT BUỘC)",
          "input_payload": {},
          "expected_output": {
            "status": "success|failure",
            "message": "string",
            "data": {},
            "status_code": "number"
          },
          "validation_rules": ["array of strings"]
        }
      ],
      "automation": {
        "is_automated": "boolean",
        "script_path": "string",
        "test_command": "string",
        "tags": ["array of strings"]
      },
      "execution_logs_format": {
        "timestamp": "string",
        "step_number": "number",
        "status": "passed|failed|skipped",
        "actual_result": "string",
        "screenshot_path": "string",
        "log_message": "string"
      }
    }
  ],
  "updated_testcases": [
    // CẤU TRÚC GIỐNG additional_testcases - CHỈ THÊM KHI CẦN UPDATE
  ]
}
\`\`\`

## ⚠️ QUY TẮC VALIDATION NGHIÊM NGẶT:

### 1. **FIELD BẮT BUỘC (REQUIRED) - THIẾU SẼ GÂY LỖI:**
- additional_testcases[].title, description, test_type, priority
- additional_testcases[].steps (ít nhất 1 step)
- TẤT CẢ field trong steps đều bắt buộc

### 2. **ENUM VALIDATION - SAI SẼ GÂY LỖI:**
- test_type: CHỈ "unit", "integration", "api", "ui"
- priority: CHỈ "low", "medium", "high", "critical"
- database_operations: CHỈ các operation được phép

### 3. **FORMAT VALIDATION - SAI SẼ GÂY LỖI:**
- title: PHẢI bắt đầu bằng "[UC_ID]" 
- source_requirement_ids: PHẢI là array của string
- steps[].step_number: PHẢI là số nguyên dương

### 4. **UNIQUENESS VALIDATION:**
- **TẤT CẢ title trong additional_testcases PHẢI DUY NHẤT**
- **KHÔNG ĐƯỢC trùng title với test cases hiện tại**

## 🎯 PHÂN TÍCH & YÊU CẦU:

1. **PHÂN TÍCH HIỆN TẠI:**
   - Xác định requirements nào CHƯA được cover
   - Đảm bảo mỗi requirement có ít nhất 4 test cases
   - Chỉ thêm test cases mới cho requirements chưa cover

2. **TEST CASES MỚI:**
   - TUÂN THỦ NGHIÊM NGẶT JSON schema trên
   - Title format đồng bộ với hệ thống hiện tại
   - Đảm bảo KHÔNG trùng title

3. **TEST CASES CẬP NHẬT:**
   - Chỉ cập nhật khi thực sự cần thiết
   - Giữ nguyên structure, chỉ enhance content
   - Đảm bảo không phá vỡ existing automation

## 🚫 LỖI JSON KHÔNG ĐƯỢC PHÉP:
- Thừa dấu phẩy cuối cùng (trailing comma)
- Thiếu dấu ngoặc, dấu phẩy
- Comment trong JSON
- Bất kỳ text nào ngoài JSON object

**ĐẦU RA DUY NHẤT: MỘT JSON OBJECT HỢP LỆ - KHÔNG CÓ BẤT KỲ NỘI DUNG NÀO KHÁC**
`
    },
    'en-US': {
        testcaseDesign: (requirementsJson: string, databaseSchemaJson: string) => `
YOU ARE A WORLD-CLASS SOFTWARE TESTING EXPERT, specializing in creating comprehensive and effective ENTERPRISE-LEVEL test cases from business requirements and database design.

Your task is to analyze the following use cases and database structure to create high-quality ENTERPRISE STANDARD test cases.

LIST OF USE CASES:
${requirementsJson}

DATABASE DESIGN (WITH USE CASE MAPPING):
${databaseSchemaJson}

## 🚨 STRICT JSON OUTPUT FORMAT REQUIREMENTS

**ABSOLUTE REQUIREMENT: RETURN ONLY A SINGLE JSON OBJECT - NO EXTRA CHARACTERS, WHITESPACE, OR NEWLINES OUTSIDE THE JSON**

### 🔥 MANDATORY JSON STRUCTURE - VIOLATIONS WILL CAUSE SYSTEM ERRORS:

\`\`\`json
{
  "testcases": [
    {
      "title": "string (REQUIRED - format: [UC_ID] - [Use Case Name] - [Test Scenario])",
      "description": "string (REQUIRED)",
      "test_type": "string (REQUIRED - enum: unit|integration|api|ui)",
      "source_requirement_ids": ["array of strings"],
      "priority": "string (REQUIRED - enum: low|medium|high|critical)",
      "preconditions": ["array of strings"],
      "postconditions": ["array of strings"],
      "database_tables": ["array of strings"],
      "database_operations": ["array of strings - enum: select|insert|update|delete|create|alter"],
      "steps": [
        {
          "step_number": "number (REQUIRED)",
          "action": "string (REQUIRED)",
          "input_data": {
            "field_name": "specific_value",
            "method": "POST|PUT|GET|DELETE",
            "endpoint": "/api/endpoint"
          },
          "expected_immediate_result": "string (REQUIRED)"
        }
      ],
      "expected_results": {
        "ui_level": ["array of strings"],
        "api_level": {
          "status_code": "number",
          "response_schema": {}
        },
        "database_level": ["array of strings"],
        "business_level": "string"
      },
      "test_data": [
        {
          "name": "string (REQUIRED)",
          "input_payload": {},
          "expected_output": {
            "status": "success|failure",
            "message": "string",
            "data": {},
            "status_code": "number"
          },
          "validation_rules": ["array of strings"]
        }
      ],
      "automation": {
        "is_automated": "boolean",
        "script_path": "string",
        "test_command": "string",
        "tags": ["array of strings"]
      },
      "execution_logs_format": {
        "timestamp": "string",
        "step_number": "number",
        "status": "passed|failed|skipped",
        "actual_result": "string",
        "screenshot_path": "string",
        "log_message": "string"
      }
    }
  ]
}
\`\`\`

## ⚠️ STRICT VALIDATION RULES:

### 1. **REQUIRED FIELDS - MISSING WILL CAUSE ERRORS:**
- title, description, test_type, priority
- steps (minimum 1 step)
- steps[].step_number, steps[].action, steps[].expected_immediate_result

### 2. **ENUM VALIDATION - INVALID VALUES WILL CAUSE ERRORS:**
- test_type: ONLY "unit", "integration", "api", "ui"
- priority: ONLY "low", "medium", "high", "critical"
- database_operations: ONLY "select", "insert", "update", "delete", "create", "alter"
- steps[].input_data.method: ONLY "POST", "PUT", "GET", "DELETE"

### 3. **FORMAT VALIDATION - INVALID FORMAT WILL CAUSE ERRORS:**
- title: MUST start with "[UC_ID]" - example: "[UC1] - User Login - Success"
- source_requirement_ids: MUST be array of strings, example: ["UC1", "UC2"]
- steps[].step_number: MUST be positive integer, starting from 1

### 4. **DATA TYPE VALIDATION - WRONG TYPE WILL CAUSE ERRORS:**
- steps[].input_data: MUST be object, cannot be string
- expected_results.api_level.status_code: MUST be number
- test_data[].input_payload: MUST be object

## 🎯 ENTERPRISE TEST CASE CREATION RULES:

1. **TITLE STANDARDIZATION:**
   - Format: "[UC_ID] - [Use Case Name] - [Test Scenario]"
   - Example: "[UC1] - User Login - Success with valid credentials"
   - **DO NOT USE "TC1-UC1" or sequential prefixes**

2. **MINIMUM COVERAGE:**
   - **Each use case MUST have at least 4 test cases:**
     1. Positive - Success
     2. Negative - Failure due to invalid input
     3. Boundary - Edge values
     4. Error case - System exceptions

3. **DETAILED STEPS:**
   - Each step MUST have input_data with SPECIFIC values
   - Example:
     ✅ "Enter username = 'testuser', password = 'Password123!'"
     ❌ "Enter login information"

## 🚫 PROHIBITED JSON ERRORS:
- Trailing commas
- Missing brackets, commas
- Comments in JSON
- Any text outside JSON object
- Incorrect date/time format

**ONLY OUTPUT: A VALID JSON OBJECT - NO OTHER CONTENT ALLOWED**
`,
        testcaseEnhancement: (existingTestcasesJson: string, newRequirementsJson: string) => `
YOU ARE AN ENTERPRISE TESTING EXPERT, your mission is to analyze existing test cases and new requirements to supplement missing test cases meeting ENTERPRISE STANDARDS.

EXISTING TEST CASES:
${existingTestcasesJson}

NEW/UPDATED REQUIREMENTS:
${newRequirementsJson}

## 🚨 STRICT JSON OUTPUT FORMAT REQUIREMENTS

**ABSOLUTE REQUIREMENT: RETURN ONLY A SINGLE JSON OBJECT - NO EXTRA CHARACTERS, WHITESPACE, OR NEWLINES OUTSIDE THE JSON**

### 🔥 MANDATORY JSON STRUCTURE - VIOLATIONS WILL CAUSE SYSTEM ERRORS:

\`\`\`json
{
  "additional_testcases": [
    {
      "title": "string (REQUIRED - format: [UC_ID] - [Use Case Name] - [Test Scenario])",
      "description": "string (REQUIRED)",
      "test_type": "string (REQUIRED - enum: unit|integration|api|ui)",
      "source_requirement_ids": ["array of strings"],
      "priority": "string (REQUIRED - enum: low|medium|high|critical)",
      "preconditions": ["array of strings"],
      "postconditions": ["array of strings"],
      "database_tables": ["array of strings"],
      "database_operations": ["array of strings - enum: select|insert|update|delete|create|alter"],
      "steps": [
        {
          "step_number": "number (REQUIRED)",
          "action": "string (REQUIRED)",
          "input_data": {
            "field_name": "specific_value",
            "method": "POST|PUT|GET|DELETE",
            "endpoint": "/api/endpoint"
          },
          "expected_immediate_result": "string (REQUIRED)"
        }
      ],
      "expected_results": {
        "ui_level": ["array of strings"],
        "api_level": {
          "status_code": "number",
          "response_schema": {}
        },
        "database_level": ["array of strings"],
        "business_level": "string"
      },
      "test_data": [
        {
          "name": "string (REQUIRED)",
          "input_payload": {},
          "expected_output": {
            "status": "success|failure",
            "message": "string",
            "data": {},
            "status_code": "number"
          },
          "validation_rules": ["array of strings"]
        }
      ],
      "automation": {
        "is_automated": "boolean",
        "script_path": "string",
        "test_command": "string",
        "tags": ["array of strings"]
      },
      "execution_logs_format": {
        "timestamp": "string",
        "step_number": "number",
        "status": "passed|failed|skipped",
        "actual_result": "string",
        "screenshot_path": "string",
        "log_message": "string"
      }
    }
  ],
  "updated_testcases": [
    // STRUCTURE IDENTICAL TO additional_testcases - ONLY ADD WHEN UPDATES NEEDED
  ]
}
\`\`\`

## ⚠️ STRICT VALIDATION RULES:

### 1. **REQUIRED FIELDS - MISSING WILL CAUSE ERRORS:**
- additional_testcases[].title, description, test_type, priority
- additional_testcases[].steps (minimum 1 step)
- ALL fields in steps are required

### 2. **ENUM VALIDATION - INVALID VALUES WILL CAUSE ERRORS:**
- test_type: ONLY "unit", "integration", "api", "ui"
- priority: ONLY "low", "medium", "high", "critical"
- database_operations: ONLY allowed operations

### 3. **FORMAT VALIDATION - INVALID FORMAT WILL CAUSE ERRORS:**
- title: MUST start with "[UC_ID]"
- source_requirement_ids: MUST be array of strings
- steps[].step_number: MUST be positive integer

### 4. **UNIQUENESS VALIDATION:**
- **ALL titles in additional_testcases MUST BE UNIQUE**
- **MUST NOT duplicate titles with existing test cases**

## 🎯 ANALYSIS & REQUIREMENTS:

1. **CURRENT ANALYSIS:**
   - Identify requirements NOT covered
   - Ensure each requirement has at least 4 test cases
   - Only add new test cases for uncovered requirements

2. **NEW TEST CASES:**
   - STRICTLY FOLLOW the JSON schema above
   - Title format consistent with existing system
   - Ensure NO duplicate titles

3. **UPDATED TEST CASES:**
   - Update only when absolutely necessary
   - Maintain structure, only enhance content
   - Ensure no breaking changes to existing automation

## 🚫 PROHIBITED JSON ERRORS:
- Trailing commas
- Missing brackets, commas
- Comments in JSON
- Any text outside JSON object

**ONLY OUTPUT: A VALID JSON OBJECT - NO OTHER CONTENT ALLOWED**
`
    }
};

export class TestcaseGeminiService {
    private apiKeyService = new ApiKeyService();

    // config
    // Trong GeminiService.ts
    private readonly TC_GEN_BATCH_SIZE = 3; // Giảm từ 6 xuống 3
    private readonly MAX_RESPONSE_LENGTH = 15000; // Giới hạn response

    /**
     * Generate test cases từ requirements và database schema với Enterprise standard
     */
    async generateTestCases(requirements: any[], databaseSchema: any, language: string): Promise<any[]> {
        try {
            console.log(`🧪 Generating ENTERPRISE test cases for ${requirements.length} requirements`);

            if (requirements.length <= this.TC_GEN_BATCH_SIZE) {
                return await this.generateTestCasesBatch(requirements, databaseSchema, language);
            } else {
                return await this.generateTestCasesWithChunking(requirements, databaseSchema, language);
            }
        } catch (error) {
            console.error("❌ Error in generateTestCases:", error);
            return this.createEnterpriseFallbackTestCases(requirements, databaseSchema);
        }
    }

    /**
     * Generate test cases cho một batch requirements với Enterprise standard
     */
    private async generateTestCasesBatch(requirements: any[], databaseSchema: any, language: string): Promise<any[]> {
        // Chuẩn bị data với database mapping
        const simplifiedRequirements = requirements.map(r => ({
            id: r.id,
            name: r.name,
            role: r.role,
            goal: r.goal,
            tasks: r.tasks,
            inputs: r.inputs,
            outputs: r.outputs,
            priority: r.priority
        }));

        // Enhanced database schema với use case mapping
        const enhancedDatabase = {
            tables: databaseSchema.tables?.map((table: any) => ({
                name: table.name,
                description: table.description,
                columns: table.columns?.map((col: any) => ({
                    name: col.name,
                    type: col.type,
                    nullable: col.nullable,
                    unique: col.unique,
                    is_primary_key: col.is_primary_key,
                    is_foreign_key: col.is_foreign_key,
                    references: col.references,
                    related_usecase_ids: col.related_usecase_ids || []
                }))
            })),
            relationships: databaseSchema.relationships
        };

        const requirementsJson = JSON.stringify(simplifiedRequirements, null, 2);
        const databaseJson = JSON.stringify(enhancedDatabase, null, 2);

        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = testcasePrompts[lang].testcaseDesign(requirementsJson, databaseJson);

        console.log(`📝 Generating ENTERPRISE test case batch for ${requirements.length} use cases`);

        const generatedJsonString = await this.generateJsonContent(prompt);

        if (!generatedJsonString) {
            throw new Error("Empty response from Gemini");
        }

        console.log(`📄 Raw ENTERPRISE test case response length: ${generatedJsonString.length}`);

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(generatedJsonString);
        } catch (parseError) {
            console.error("❌ JSON parse error in test case batch, attempting repair...", parseError);
            const repairedJson = this.repairTruncatedJson(generatedJsonString);
            parsedResponse = JSON.parse(repairedJson);
        }

        // Xử lý response format
        let testCases: any[] = [];
        if (parsedResponse.testcases && Array.isArray(parsedResponse.testcases)) {
            testCases = parsedResponse.testcases;
        } else if (Array.isArray(parsedResponse)) {
            testCases = parsedResponse;
        } else {
            throw new Error("Invalid test case response format from Gemini");
        }

        console.log(`✅ Raw ENTERPRISE test cases processed: ${testCases.length} test cases`);

        // Enhanced standardization với Enterprise integration
        testCases = this.standardizeEnterpriseTestCases(testCases, requirements, databaseSchema);

        console.log(`🎉 Final ENTERPRISE test cases: ${testCases.length} test cases`);

        return testCases;
    }

    /**
     * Enhance existing test cases với requirements mới theo Enterprise standard
     */
    async enhanceTestCases(existingTestCases: any[], newRequirements: any[], language: string): Promise<{
        additional_testcases: any[];
        updated_testcases: any[];
    }> {
        try {
            // 1. Chuẩn bị data với đầy đủ enterprise fields
            const simplifiedExisting = existingTestCases.map(tc => ({
                // 🆕 THÊM TẤT CẢ ENTERPRISE FIELDS
                title: tc.title,
                description: tc.description,
                test_type: tc.test_type,
                source_requirement_ids: tc.source_requirement_ids,
                priority: tc.priority,
                preconditions: tc.preconditions,
                postconditions: tc.postconditions,
                database_tables: tc.database_tables,
                database_operations: tc.database_operations,
                steps: tc.steps,
                expected_results: tc.expected_results,
                test_data: tc.test_data,
                automation: tc.automation,
                execution_logs_format: tc.execution_logs_format
            }));

            const simplifiedNewReqs = newRequirements.map(r => ({
                id: r.id,
                name: r.name,
                role: r.role,
                goal: r.goal,
                tasks: r.tasks,
                inputs: r.inputs, // 🆕 THÊM inputs/outputs
                outputs: r.outputs,
                priority: r.priority
            }));

            const existingJson = JSON.stringify(simplifiedExisting, null, 2);
            const newReqsJson = JSON.stringify(simplifiedNewReqs, null, 2);

            const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
            const prompt = testcasePrompts[lang].testcaseEnhancement(existingJson, newReqsJson);

            console.log(`🔄 Enhancing ENTERPRISE test cases with ${newRequirements.length} new requirements`);

            const generatedJsonString = await this.generateJsonContent(prompt);

            if (!generatedJsonString) {
                throw new Error("Empty response from Gemini for enhancement");
            }

            let parsedResponse;
            try {
                parsedResponse = JSON.parse(generatedJsonString);
            } catch (parseError) {
                console.error("❌ JSON parse error in enhancement, attempting repair...", parseError);
                const repairedJson = this.repairTruncatedJson(generatedJsonString);
                parsedResponse = JSON.parse(repairedJson);
            }

            // 🆕 STANDARDIZE CẢ ADDITIONAL VÀ UPDATED TEST CASES
            if (parsedResponse.additional_testcases && Array.isArray(parsedResponse.additional_testcases)) {
                parsedResponse.additional_testcases = this.standardizeEnterpriseTestCases(
                    parsedResponse.additional_testcases,
                    newRequirements,
                    { tables: [], relationships: [] } // Database có thể rỗng
                );
            }

            if (parsedResponse.updated_testcases && Array.isArray(parsedResponse.updated_testcases)) {
                parsedResponse.updated_testcases = this.standardizeEnterpriseTestCases(
                    parsedResponse.updated_testcases,
                    newRequirements,
                    { tables: [], relationships: [] }
                );
            }

            return {
                additional_testcases: parsedResponse.additional_testcases || [],
                updated_testcases: parsedResponse.updated_testcases || []
            };

        } catch (error) {
            console.error("❌ Error in enhanceTestCases:", error);
            return {
                additional_testcases: [],
                updated_testcases: []
            };
        }
    }

    /**
     * Chuẩn hóa test cases theo Enterprise schema
     */
    private standardizeEnterpriseTestCases(testCases: any[], requirements: any[], databaseSchema: any): any[] {
        console.log("🔄 Standardizing ENTERPRISE test cases...");

        const usedTitles = new Set<string>();

        return testCases.map((testCase, index) => {
            // 🆕 XỬ LÝ CẢ TEST CASES CÓ ID (updated) và KHÔNG CÓ ID (additional)
            const isUpdatedCase = testCase.id !== undefined;

            let title = testCase.title || `Test Case ${index + 1}`;
            if (usedTitles.has(title) && !isUpdatedCase) {
                title = `${title} - ${index + 1}`;
            }
            usedTitles.add(title);

            const standardized: any = {
                // 🆕 GIỮ LẠI ID NẾU LÀ UPDATED CASE
                ...(isUpdatedCase && { id: testCase.id }),
                title: title,
                description: testCase.description || '',
                test_type: this.validateTestType(testCase.test_type),
                source_requirement_ids: this.validateRequirementIds(testCase.source_requirement_ids, requirements),
                priority: this.validatePriority(testCase.priority),
                preconditions: this.validatePreconditions(testCase.preconditions),
                postconditions: this.validatePostconditions(testCase.postconditions),
                database_tables: this.extractDatabaseTables(testCase, requirements, databaseSchema),
                database_operations: this.extractDatabaseOperations(testCase),
                steps: this.validateEnterpriseSteps(testCase.steps),
                expected_results: this.validateExpectedResults(testCase.expected_results),
                test_data: this.validateEnterpriseTestData(testCase.test_data),
                automation: this.validateAutomation(testCase.automation),
                status: testCase.status || 'not_executed',
                environment: testCase.environment || {},
                execution_logs_format: testCase.execution_logs_format || {
                    timestamp: "ISO format",
                    step_number: 1,
                    status: "passed|failed|skipped",
                    actual_result: "Actual result",
                    screenshot_path: "/screenshots/test.png",
                    log_message: "Log details"
                }
            };

            standardized.test_data = this.enhanceEnterpriseTestDataWithSchema(
                standardized.test_data,
                standardized.database_tables,
                databaseSchema
            );

            return standardized;
        });
    }

    /**
     * 🆕 Validate và chuẩn hóa Enterprise steps
     */
    private validateEnterpriseSteps(steps: any[] | undefined): any[] {
        if (!steps || !Array.isArray(steps)) {
            return [{
                step_number: 1,
                action: "Execute the test procedure",
                input_data: {},
                expected_immediate_result: "System processes the request"
            }];
        }

        return steps.map((step, index) => {
            if (typeof step === 'string') {
                // Convert string step to Enterprise format
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
     * 🆕 Validate expected results
     */
    private validateExpectedResults(expectedResults: any): any {
        if (!expectedResults) {
            return {
                ui_level: ["Operation completed successfully"],
                api_level: { status_code: 200, response_schema: { success: true } },
                database_level: ["Database operations completed"],
                business_level: "Business requirement satisfied"
            };
        }

        return {
            ui_level: expectedResults.ui_level || ["Operation completed successfully"],
            api_level: expectedResults.api_level || { status_code: 200, response_schema: { success: true } },
            database_level: expectedResults.database_level || ["Database operations completed"],
            business_level: expectedResults.business_level || "Business requirement satisfied"
        };
    }

    /**
     * 🆕 Validate automation
     */
    private validateAutomation(automation: any): any {
        if (!automation) {
            return {
                is_automated: false,
                script_path: "",
                test_command: "",
                tags: []
            };
        }

        return {
            is_automated: automation.is_automated || false,
            script_path: automation.script_path || "",
            test_command: automation.test_command || "",
            tags: automation.tags || []
        };
    }

    /**
     * 🆕 Validate preconditions
     */
    private validatePreconditions(preconditions: string[] | undefined): string[] {
        if (!preconditions || !Array.isArray(preconditions)) {
            return ["System is operational", "Test data is available"];
        }
        return preconditions.filter(p => typeof p === 'string' && p.trim().length > 0);
    }

    /**
     * 🆕 Validate postconditions
     */
    private validatePostconditions(postconditions: string[] | undefined): string[] {
        if (!postconditions || !Array.isArray(postconditions)) {
            return ["Test data cleaned up", "System returned to initial state"];
        }
        return postconditions.filter(p => typeof p === 'string' && p.trim().length > 0);
    }

    /**
     * 🆕 Enhance Enterprise test data với database schema validation
     */
    private enhanceEnterpriseTestDataWithSchema(testData: any[], databaseTables: string[], databaseSchema: any): any[] {
        if (!testData || !Array.isArray(testData) || testData.length === 0) {
            return this.generateEnterpriseDefaultTestData(databaseTables, databaseSchema);
        }

        return testData.map(data => ({
            name: data.name || "Test Data",
            input_payload: data.input_payload || data.inputs || {},
            expected_output: data.expected_output || data.expected_outputs || {},
            validation_rules: data.validation_rules || []
        }));
    }

    /**
     * 🆕 Generate Enterprise default test data
     */
    private generateEnterpriseDefaultTestData(databaseTables: string[], databaseSchema: any): any[] {
        const testData = [];

        if (databaseTables.length > 0) {
            databaseTables.forEach(tableName => {
                const table = databaseSchema.tables?.find((t: any) => t.name === tableName);
                if (table) {
                    const inputPayload = {};
                    const expectedOutput = {};

                    // Chọn một vài columns quan trọng
                    table.columns?.slice(0, 3).forEach((col: any) => {
                        if (!col.is_primary_key && !col.is_foreign_key) {
                            inputPayload[col.name] = this.generateTestValueForColumn(col);
                        }
                    });

                    testData.push({
                        name: `Default test data for ${tableName}`,
                        input_payload: inputPayload,
                        expected_output: expectedOutput,
                        validation_rules: ["Basic validation rules apply"]
                    });
                }
            });
        }

        return testData.length > 0 ? testData : [{
            name: "Default Enterprise Test Data",
            input_payload: {},
            expected_output: {},
            validation_rules: ["Basic validation rules apply"]
        }];
    }

    /**
     * 🆕 Validate Enterprise test data
     */
    private validateEnterpriseTestData(testData: any[] | undefined): any[] {
        if (!testData || !Array.isArray(testData)) {
            return [{
                name: "Default Enterprise Test Data",
                input_payload: {},
                expected_output: {},
                validation_rules: ["Basic validation rules apply"]
            }];
        }

        return testData.map(data => ({
            name: data.name || "Test Data",
            input_payload: data.input_payload || data.inputs || {},
            expected_output: data.expected_output || data.expected_outputs || {},
            validation_rules: data.validation_rules || []
        }));
    }

    /**
     * 🆕 Extract database operations từ test case
     */
    private extractDatabaseOperations(testCase: any): string[] {
        const operations: Set<string> = new Set();

        // 1. Extract từ test case explicit declaration
        if (testCase.database_operations && Array.isArray(testCase.database_operations)) {
            testCase.database_operations.forEach((op: string) => operations.add(op));
        }

        // 2. Extract từ steps analysis
        if (testCase.steps && Array.isArray(testCase.steps)) {
            testCase.steps.forEach((step: any) => {
                const stepText = typeof step === 'string' ? step : step.action;
                const lowerStep = stepText.toLowerCase();

                if (lowerStep.includes('insert') || lowerStep.includes('create') || lowerStep.includes('add')) {
                    operations.add('insert');
                }
                if (lowerStep.includes('update') || lowerStep.includes('modify') || lowerStep.includes('change')) {
                    operations.add('update');
                }
                if (lowerStep.includes('delete') || lowerStep.includes('remove') || lowerStep.includes('drop')) {
                    operations.add('delete');
                }
                if (lowerStep.includes('select') || lowerStep.includes('read') || lowerStep.includes('query') || lowerStep.includes('get')) {
                    operations.add('select');
                }
            });
        }

        return Array.from(operations).length > 0 ? Array.from(operations) : ['select'];
    }

    /**
     * 🆕 Extract database tables từ test case và requirements
     */
    private extractDatabaseTables(testCase: any, requirements: any[], databaseSchema: any): string[] {
        const tables: Set<string> = new Set();

        // 1. Extract từ test case explicit declaration
        if (testCase.database_tables && Array.isArray(testCase.database_tables)) {
            testCase.database_tables.forEach((table: string) => tables.add(table));
        }

        // 2. Extract từ requirement mapping trong database schema
        const requirementIds = testCase.source_requirement_ids || [];
        requirementIds.forEach((reqId: string) => {
            databaseSchema.tables?.forEach((table: any) => {
                const hasRelatedUseCase = table.columns?.some((col: any) =>
                    col.related_usecase_ids && col.related_usecase_ids.includes(reqId)
                );
                if (hasRelatedUseCase) {
                    tables.add(table.name);
                }
            });
        });

        return Array.from(tables);
    }

    /**
     * Validate và chuẩn hóa test type
     */
    private validateTestType(testType: string): string {
        const validTypes = ['unit', 'integration', 'api', 'ui', 'performance', 'security'];
        if (validTypes.includes(testType)) return testType;

        const lowerType = (testType || '').toLowerCase();
        if (lowerType.includes('unit')) return 'unit';
        if (lowerType.includes('api')) return 'api';
        if (lowerType.includes('ui') || lowerType.includes('interface')) return 'ui';
        if (lowerType.includes('integrate')) return 'integration';

        return 'integration';
    }

    /**
     * Validate requirement IDs
     */
    private validateRequirementIds(requirementIds: string[] | undefined, requirements: any[]): string[] {
        if (!requirementIds || !Array.isArray(requirementIds)) return [];
        const validRequirementIds = new Set(requirements.map(r => r.id));
        return requirementIds.filter(id => validRequirementIds.has(id));
    }

    /**
     * Validate priority
     */
    private validatePriority(priority: string): string {
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        if (validPriorities.includes(priority)) return priority;
        return 'medium';
    }

    /**
     * 🆕 Generate test value cho column dựa trên type
     */
    private generateTestValueForColumn(column: any): any {
        const type = column.type?.toLowerCase() || 'string';

        switch (type) {
            case 'int':
            case 'integer':
            case 'number':
                return 123;
            case 'varchar':
            case 'text':
            case 'string':
                return `test_${column.name}`;
            case 'boolean':
            case 'bool':
                return true;
            case 'date':
            case 'datetime':
                return new Date().toISOString().split('T')[0];
            case 'timestamp':
                return new Date().toISOString();
            case 'email':
                return 'test@example.com';
            case 'uuid':
                return '123e4567-e89b-12d3-a456-426614174000';
            default:
                return `test_${column.name}`;
        }
    }

    /**
     * Generate test cases với chunking cho số lượng requirements lớn
     */
    private async generateTestCasesWithChunking(requirements: any[], databaseSchema: any, language: string): Promise<any[]> {
        console.log(`🔀 Splitting ${requirements.length} requirements into chunks for ENTERPRISE test case generation`);

        const chunks: any[][] = [];
        for (let i = 0; i < requirements.length; i += this.TC_GEN_BATCH_SIZE) {
            chunks.push(requirements.slice(i, i + this.TC_GEN_BATCH_SIZE));
        }

        console.log(`📦 Created ${chunks.length} chunks for ENTERPRISE test case processing`);

        const allTestCases: any[] = [];

        // Xử lý từng batch tuần tự
        for (let i = 0; i < chunks.length; i++) {
            try {
                console.log(`🔄 Processing ENTERPRISE test case chunk ${i + 1}/${chunks.length}`);
                const testCases = await this.generateTestCasesBatch(chunks[i], databaseSchema, language);
                allTestCases.push(...testCases);
                console.log(`✅ Completed ENTERPRISE test case chunk ${i + 1}/${chunks.length}`);

                // Thêm delay nhỏ giữa các batch
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`❌ Failed ENTERPRISE test case chunk ${i + 1}:`, error);
                // Tiếp tục với các chunk khác
            }
        }

        if (allTestCases.length === 0) {
            console.warn("⚠️ All ENTERPRISE test case generation chunks failed, using fallback");
            return this.createEnterpriseFallbackTestCases(requirements, databaseSchema);
        }

        console.log(`🔄 Merged ${allTestCases.length} ENTERPRISE test cases from all chunks`);
        return allTestCases;
    }

    /**
     * Tạo Enterprise fallback test cases
     */
    private createEnterpriseFallbackTestCases(requirements: any[], databaseSchema?: any): any[] {
        console.log("🔄 Creating ENTERPRISE fallback test cases");

        const usedTitles = new Set<string>();

        return requirements.flatMap(requirement => {
            const testCases = [];

            // Tạo 4 test cases cho mỗi requirement theo Enterprise standard
            const scenarios = [
                {
                    suffix: "Thành công với thông tin hợp lệ",
                    type: "positive",
                    priority: "high"
                },
                {
                    suffix: "Thất bại do input không hợp lệ",
                    type: "negative",
                    priority: "medium"
                },
                {
                    suffix: "Xử lý giá trị biên",
                    type: "boundary",
                    priority: "medium"
                },
                {
                    suffix: "Xử lý lỗi hệ thống",
                    type: "error",
                    priority: "low"
                }
            ];

            scenarios.forEach(scenario => {
                const title = `UC${requirement.id} - ${requirement.name} - ${scenario.suffix}`;
                const uniqueTitle = usedTitles.has(title) ? `${title} - ${scenario.type}` : title;
                usedTitles.add(uniqueTitle);

                const databaseTables = this.extractTablesFromRequirement(requirement, databaseSchema);
                const databaseOperations = this.extractOperationsFromRequirement(requirement);

                testCases.push({
                    title: uniqueTitle,
                    description: `Test ${scenario.type} cho ${requirement.goal}`,
                    test_type: 'integration',
                    source_requirement_ids: [requirement.id],
                    priority: scenario.priority,
                    preconditions: [
                        "Hệ thống đang hoạt động bình thường",
                        "Dữ liệu test đã được chuẩn bị"
                    ],
                    postconditions: [
                        "Dữ liệu test được dọn dẹp",
                        "Hệ thống trở về trạng thái ban đầu"
                    ],
                    database_tables: databaseTables,
                    database_operations: databaseOperations,
                    steps: [
                        {
                            step_number: 1,
                            action: `Chuẩn bị môi trường test cho ${requirement.name}`,
                            input_data: {
                                environment: "test",
                                setup: "basic"
                            },
                            expected_immediate_result: "Môi trường test sẵn sàng"
                        },
                        {
                            step_number: 2,
                            action: `Thực thi chức năng ${requirement.name}`,
                            input_data: {
                                function: requirement.name,
                                scenario: scenario.type
                            },
                            expected_immediate_result: "Hệ thống xử lý yêu cầu"
                        },
                        {
                            step_number: 3,
                            action: "Xác minh kết quả",
                            input_data: {
                                verification: "result_check"
                            },
                            expected_immediate_result: "Kết quả được xác minh"
                        }
                    ],
                    expected_results: {
                        ui_level: [
                            "Hiển thị kết quả phù hợp với kịch bản test"
                        ],
                        api_level: {
                            status_code: scenario.type === "positive" ? 200 : 400,
                            response_schema: {
                                success: scenario.type === "positive"
                            }
                        },
                        database_level: [
                            "Các thao tác database được thực hiện đúng"
                        ],
                        business_level: `Nghiệp vụ ${scenario.type === "positive" ? "thành công" : "xử lý đúng cách"}`
                    },
                    test_data: [
                        {
                            name: `Test data ${scenario.type}`,
                            input_payload: {
                                test_scenario: scenario.type,
                                requirement_id: requirement.id
                            },
                            expected_output: {
                                status: scenario.type === "positive" ? "success" : "failure"
                            },
                            validation_rules: [
                                "Kiểm tra tính đúng đắn của nghiệp vụ"
                            ]
                        }
                    ],
                    automation: {
                        is_automated: false,
                        script_path: "",
                        test_command: "",
                        tags: [scenario.type, "integration"]
                    },
                    status: 'not_executed',
                    environment: {},
                    execution_logs_format: {
                        timestamp: "ISO format",
                        step_number: 1,
                        status: "passed|failed|skipped",
                        actual_result: "Kết quả thực tế",
                        screenshot_path: "/screenshots/test.png",
                        log_message: "Chi tiết log"
                    }
                });
            });

            return testCases;
        });
    }

    /**
     * 🆕 Extract operations từ requirement
     */
    private extractOperationsFromRequirement(requirement: any): string[] {
        const operations: Set<string> = new Set();
        const requirementText = `${requirement.name} ${requirement.tasks?.join(' ') || ''}`.toLowerCase();

        if (requirementText.includes('create') || requirementText.includes('add') || requirementText.includes('insert')) {
            operations.add('insert');
        }
        if (requirementText.includes('update') || requirementText.includes('modify') || requirementText.includes('change')) {
            operations.add('update');
        }
        if (requirementText.includes('delete') || requirementText.includes('remove')) {
            operations.add('delete');
        }
        if (requirementText.includes('read') || requirementText.includes('get') || requirementText.includes('view')) {
            operations.add('select');
        }

        return operations.size > 0 ? Array.from(operations) : ['select'];
    }

    /**
     * 🆕 Extract tables từ requirement
     */
    private extractTablesFromRequirement(requirement: any, databaseSchema?: any): string[] {
        const tables: Set<string> = new Set();

        if (databaseSchema?.tables) {
            databaseSchema.tables.forEach((table: any) => {
                const hasRelatedUseCase = table.columns?.some((col: any) =>
                    col.related_usecase_ids && col.related_usecase_ids.includes(requirement.id)
                );
                if (hasRelatedUseCase) {
                    tables.add(table.name);
                }
            });
        }

        // Fallback: extract từ requirement name và tasks
        if (tables.size === 0) {
            const requirementText = `${requirement.name} ${requirement.tasks?.join(' ') || ''}`.toLowerCase();
            if (requirementText.includes('user')) tables.add('users');
            if (requirementText.includes('order')) tables.add('orders');
            if (requirementText.includes('product')) tables.add('products');
            if (requirementText.includes('payment')) tables.add('payments');
        }

        return Array.from(tables);
    }

    /**
     * Generate JSON content từ Gemini
     */
    private async generateJsonContent(prompt: string): Promise<string> {
        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) {
            throw new Error("No active Gemini API key found.");
        }

        let lastError: any;
        for (const k of keys) {
            try {
                console.log(`🔑 Trying Gemini key for ENTERPRISE test case content: ${k.key_value.slice(0, 12)}...`);
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(k.key_value);
                const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });

                const resp: any = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                const text: string = resp?.response?.text?.() || "";

                return this.cleanJsonString(text);

            } catch (err: any) {
                lastError = err;
                const msg = (err?.message || "").toLowerCase();
                console.error(`❌ Gemini key ${k._id} failed during ENTERPRISE test case generation:`, err?.message || err);

                // Vô hiệu hóa key không hợp lệ
                if (msg.includes("invalid") || msg.includes("unauthorized")) {
                    try {
                        await this.apiKeyService.disableKey(k._id);
                        console.warn(`⚠️ Disabled invalid Gemini key: ${k._id}`);
                    } catch { /* Ignore disable errors */ }
                }
                continue;
            }
        }

        throw lastError || new Error("All Gemini API keys failed during ENTERPRISE test case generation.");
    }

    /**
     * Clean JSON string từ response
     */
    private cleanJsonString(text: string): string {
        if (!text) return "";

        let cleanedText = text.trim();

        // Thử parse trực tiếp
        try {
            JSON.parse(cleanedText);
            return cleanedText;
        } catch {
            // Continue with cleaning
        }

        // Loại bỏ code blocks
        const codeBlockPatterns = [
            /```(?:json)?\s*([\s\S]*?)\s*```/g,
            /`{3,}\s*([\s\S]*?)\s*`{3,}/g,
            /`([^`]+)`/g
        ];

        for (const pattern of codeBlockPatterns) {
            const matches = cleanedText.match(pattern);
            if (matches) {
                for (const match of matches) {
                    let content = match.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').replace(/`/g, '').trim();
                    try {
                        JSON.parse(content);
                        cleanedText = content;
                        break;
                    } catch {
                        // Continue
                    }
                }
                if (cleanedText !== text) break;
            }
        }

        // Tìm JSON object/array
        const jsonPatterns = [
            /\{[\s\S]*\}/,
            /\[[\s\S]*\]/
        ];

        for (const pattern of jsonPatterns) {
            const match = cleanedText.match(pattern);
            if (match) {
                try {
                    JSON.parse(match[0]);
                    cleanedText = match[0];
                    break;
                } catch {
                    // Continue
                }
            }
        }

        // Loại bỏ text thừa
        const jsonStart = Math.max(
            cleanedText.indexOf('{'),
            cleanedText.indexOf('[')
        );

        if (jsonStart > 0) {
            cleanedText = cleanedText.substring(jsonStart);
        }

        // Final parse attempt
        try {
            JSON.parse(cleanedText);
            return cleanedText;
        } catch (error) {
            console.warn("⚠️ Could not extract valid JSON from ENTERPRISE test case response:", {
                originalLength: text?.length,
                cleanedLength: cleanedText?.length,
                preview: cleanedText.substring(0, 200)
            });

            return text.replace(/```(?:json)?\s*|```/g, '').trim();
        }
    }

    /**
     * Sửa chữa JSON bị cắt ngắn
     */
    private repairTruncatedJson(jsonStr: string): string {
        console.log(`🔧 Repairing truncated JSON, length: ${jsonStr.length}`);

        let balance = 0;
        let inString = false;
        let escapeNext = false;

        // Tìm vị trí JSON hợp lệ cuối cùng
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

                // Ghi nhận vị trí khi balance = 0 (JSON hợp lệ)
                if (balance === 0) {
                    lastValidIndex = i;
                }
            }
        }

        // Nếu có JSON hợp lệ, cắt đến đó
        if (lastValidIndex > 0 && balance !== 0) {
            const repaired = jsonStr.substring(0, lastValidIndex + 1);
            console.log(`✅ Repaired JSON by truncating to position ${lastValidIndex}`);
            return repaired;
        }

        // Fallback: đóng các bracket mở
        let repaired = jsonStr;
        while (balance > 0) {
            if (repaired.endsWith(',') || repaired.endsWith('{') || repaired.endsWith('[')) {
                repaired = repaired.slice(0, -1);
            }
            repaired += balance > 0 ? '}' : ']';
            balance--;
        }

        // Đảm bảo kết thúc đúng
        if (repaired.startsWith('[') && !repaired.endsWith(']')) {
            repaired += ']';
        } else if (repaired.startsWith('{') && !repaired.endsWith('}')) {
            repaired += '}';
        }

        console.log(`✅ Repaired JSON by adding ${balance} closing brackets`);
        return repaired;
    }
}