// TestcaseGeminiService.ts
import { ApiKeyService } from "../../orchestrator/domain/ApiKeyService";

// PROMPTS cho test case generation với Enterprise standard
const testcasePrompts = {
    'vi-VN': {
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

    // Configuration
    private readonly BATCH_SIZE = 3;
    private readonly MAX_RESPONSE_LENGTH = 15000;

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
        const simplifiedRequirement = {
            id: requirementId,
            name: requirement.name,
            role: requirement.role,
            goal: requirement.goal,
            tasks: requirement.tasks,
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
        const simplifiedRequirements = requirements.map(req => ({
            id: req.id || (req._id ? String(req._id) : ''),
            name: req.name,
            role: req.role,
            goal: req.goal,
            tasks: req.tasks,
            inputs: req.inputs,
            outputs: req.outputs,
            priority: req.priority
        }));

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
     * Call Gemini API
     */
    private async callGeminiAPI(prompt: string, userId?: string, projectId?: string): Promise<string> {
        const keys = await this.apiKeyService.getAllActiveKeys("gemini");
        if (!keys || keys.length === 0) {
            throw new Error("No active Gemini API keys found");
        }

        let lastError: any;

        for (const key of keys) {
            const startTime = Date.now();
            try {
                console.log(`🔑 Trying Gemini key: ${key.key_value.slice(0, 12)}...`);
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const client = new GoogleGenerativeAI(key.key_value);
                const modelName = key.model_name || 'gemini-2.0-flash-001';
                const model = client.getGenerativeModel({ model: modelName });

                const response = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                });

                const responseTime = Date.now() - startTime;
                const { logApiUsage, extractGeminiTokens } = await import("../../stats/domain/apiUsageLogger");
                const tokens = extractGeminiTokens(response);

                logApiUsage({
                    api_key_id: key._id.toString(),
                    provider: 'gemini',
                    model_name: modelName,
                    user_id: userId,
                    project_id: projectId,
                    request_type: 'text',
                    endpoint: 'generateTestcase',
                    ...tokens,
                    status: 'success',
                    status_code: 200,
                    response_time: responseTime,
                }).catch(err => console.error('Failed to log API usage:', err));

                const text = response?.response?.text() || "";
                return this.cleanJSONResponse(text);

            } catch (error: any) {
                const responseTime = Date.now() - startTime;
                lastError = error;
                console.error(`❌ Gemini key failed:`, error.message);

                const { logApiUsage } = await import("../../stats/domain/apiUsageLogger");
                const modelName = key.model_name || 'gemini-2.0-flash-001';
                logApiUsage({
                    api_key_id: key._id.toString(),
                    provider: 'gemini',
                    model_name: modelName,
                    user_id: userId,
                    project_id: projectId,
                    request_type: 'text',
                    endpoint: 'generateTestcase',
                    status: 'failed',
                    status_code: error.status || 500,
                    error_message: error.message || 'Unknown error',
                    response_time: responseTime,
                }).catch(logErr => console.error('Failed to log API usage:', logErr));

                // Disable invalid keys
                const message = error.message.toLowerCase();
                if (message.includes("invalid") || message.includes("unauthorized")) {
                    try {
                        await this.apiKeyService.disableKey(key._id);
                        console.warn(`⚠️ Disabled invalid key: ${key._id}`);
                    } catch {
                        // Ignore disable errors
                    }
                }
            }
        }

        throw lastError || new Error("All Gemini API keys failed");
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
}