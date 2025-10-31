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

**QUAN TRỌNG:**
- Tạo test cases cho TẤT CẢ các use case quan trọng
- Bao gồm cả test cases positive và negative
- Tập trung vào các chức năng nghiệp vụ chính
- XÁC ĐỊNH RÕ database tables và operations được sử dụng
- Giữ response ngắn gọn, chỉ bao gồm thông tin cần thiết

**YÊU CẦU TUYỆT ĐỐI VỀ ĐẦU RA:**
PHẢI chỉ trả về **duy nhất một đối tượng JSON hợp lệ**, không có bất kỳ text, chú thích, markdown hoặc ký tự thừa nào trước hoặc sau JSON.

Đối tượng JSON BẮT BUỘC phải tuân thủ nghiêm ngặt cấu trúc sau:

{
  "testcases": [
    {
      "title": "Tên test case rõ ràng và mô tả",
      "description": "Mô tả chi tiết về mục đích test",
      "test_type": "unit|integration|api|ui",
      "source_requirement_ids": ["UC1", "UC2"],
      "priority": "low|medium|high|critical",
      
      // 🆕 ENTERPRISE FIELDS
      "preconditions": [
        "Điều kiện tiên quyết trước khi test",
        "Trạng thái hệ thống/dữ liệu ban đầu"
      ],
      "postconditions": [
        "Trạng thái hệ thống sau khi test",
        "Cleanup requirements"
      ],
      
      "database_tables": ["users", "orders"],
      "database_operations": ["select", "insert"],
      
      // 🆕 IMPROVED STEPS với input/output rõ ràng
      "steps": [
        {
          "step_number": 1,
          "action": "Mô tả hành động cụ thể",
          "input_data": {
            "field_name": "giá_trị_cụ_thể",
            "method": "POST/PUT/GET",
            "endpoint": "/api/endpoint (nếu là API)"
          },
          "expected_immediate_result": "Kết quả mong đợi ngay sau bước này"
        }
      ],
      
      // 🆕 MULTI-LEVEL EXPECTED RESULTS
      "expected_results": {
        "ui_level": [
          "Hiển thị thông báo thành công",
          "Chuyển trang đến dashboard"
        ],
        "api_level": {
          "status_code": 200,
          "response_schema": {
            "success": true,
            "data": {...}
          }
        },
        "database_level": [
          "Bảng users có bản ghi mới",
          "Bảng orders được cập nhật"
        ],
        "business_level": "Nghiệp vụ được xử lý đúng"
      },
      
      // 🆕 ENHANCED TEST DATA
      "test_data": [
        {
          "name": "Test data scenario 1",
          "input_payload": {
            "username": "testuser",
            "password": "Password123!"
          },
          "expected_output": {
            "status": "success|failure",
            "message": "Thông báo cụ thể",
            "data": {...},
            "status_code": 200
          },
          "validation_rules": [
            "Email phải đúng định dạng",
            "Password tối thiểu 8 ký tự"
          ]
        }
      ],
      
      // 🆕 AUTOMATION READY
      "automation": {
        "is_automated": false,
        "script_path": "/tests/features/login/test_login.py",
        "test_command": "pytest tests/features/login/test_login.py::test_login_success",
        "tags": ["smoke", "regression", "login"]
      },
      
      // 🆕 EXECUTION LOGS FORMAT
      "execution_logs_format": {
        "timestamp": "ISO format",
        "step_number": 1,
        "status": "passed|failed|skipped",
        "actual_result": "Kết quả thực tế",
        "screenshot_path": "/screenshots/test_001.png",
        "log_message": "Chi tiết log"
      }
    }
  ]
}

**QUY TẮC TẠO TEST CASE ENTERPRISE:**

1. **CHUẨN HÓA TITLE (QUAN TRỌNG):**
   - Format: "[UC_ID] - [Tên use case] - [Kịch bản test]"
   - Ví dụ: "UC1 - Đăng nhập - Thành công với thông tin hợp lệ"
   - KHÔNG sử dụng "TC1-UC1" hoặc các prefix số thứ tự
   - **MỖI TITLE PHẢI LÀ DUY NHẤT, KHÔNG TRÙNG LẶP**

2. **STEPS CẢI TIẾN - AI TEST GENERATOR FRIENDLY:**
   - Mỗi step PHẢI có: action + input_data cụ thể + expected_immediate_result
   - Input_data: giá trị cụ thể, không mô tả chung chung
   - Ví dụ: 
     ❌ "Nhập thông tin đăng nhập" 
     ✅ "Nhập username = 'testuser', password = 'Password123!'"

3. **MULTI-LEVEL EXPECTED RESULTS:**
   - UI Level: Hiển thị giao diện, thông báo
   - API Level: Status code, response schema
   - Database Level: Thay đổi dữ liệu
   - Business Level: Nghiệp vụ thực tế

4. **TEST DATA CHI TIẾT:**
   - Input_payload: Dữ liệu đầu vào cụ thể
   - Expected_output: Đầu ra mong đợi chi tiết
   - Validation_rules: Quy tắc validate áp dụng

5. **PRECONDITIONS & POSTCONDITIONS:**
   - Preconditions: Dữ liệu/trạng thái hệ thống ban đầu
   - Postconditions: Cleanup, rollback requirements

6. **AUTOMATION READY:**
   - Script_path: Đường dẫn file automation
   - Test_command: Câu lệnh chạy test
   - Tags: Phân loại test (smoke, regression, etc.)

7. **DATABASE INTEGRATION:**
   - Xác định tables liên quan dựa trên use case
   - Ghi rõ operations (select/insert/update/delete)
   - Sử dụng field names độc lập với DB schema

8. **COVERAGE TỐI THIỂU:**
   - **Mỗi use case PHẢI có ít nhất 4 test cases**: 
     1. Positive - Thành công
     2. Negative - Thất bại do input sai
     3. Boundary - Giá trị biên
     4. Error case - Lỗi hệ thống/exception

Hãy tạo test cases chất lượng cao ĐẠT CHUẨN ENTERPRISE dựa trên use cases và database schema được cung cấp.
`,

        testcaseEnhancement: (existingTestcasesJson: string, newRequirementsJson: string) => `
BẠN LÀ CHUYÊN GIA KIỂM THỬ ENTERPRISE, nhiệm vụ là phân tích test cases hiện có và yêu cầu mới để bổ sung test cases còn thiếu ĐẠT CHUẨN ENTERPRISE CAO.

TEST CASES HIỆN TẠI:
${existingTestcasesJson}

YÊU CẦU MỚI/UPDATE:
${newRequirementsJson}

**QUY TẮC CHUẨN HÓA ENTERPRISE (GIỐNG NHƯ TEST CASE DESIGN):**

1. **STANDARDIZED TITLE (CRITICAL):**
   - Format: "[UC_ID] - [Use Case Name] - [Test Scenario]"
   - Example: "UC1 - User Login - Success with valid credentials"
   - DO NOT use "TC1-UC1" or sequential prefixes
   - **EACH TITLE MUST BE UNIQUE** across the entire list

2. **IMPROVED STEPS - AI TEST GENERATOR FRIENDLY:**
   - Each step MUST have: action + specific input_data + expected_immediate_result
   - Input_data: specific values, not generic descriptions

3. **MULTI-LEVEL EXPECTED RESULTS:**
   - UI Level: Display, notifications, navigation
   - API Level: Status code, response schema
   - Database Level: Data changes
   - Business Level: Actual business process

4. **DETAILED TEST DATA:**
   - Input_payload: Specific input data
   - Expected_output: Detailed expected output
   - Validation_rules: Applied validation rules

5. **MINIMUM COVERAGE:**
   - **Each use case MUST have at least 4 test cases**:
     1. Positive - Success
     2. Negative - Failure due to invalid input
     3. Boundary - Edge values
     4. Error case - System exceptions

**PHÂN TÍCH & YÊU CẦU:**

1. **PHÂN TÍCH HIỆN TẠI:**
   - Xác định requirements nào CHƯA được cover bởi test cases hiện tại
   - Xác định test cases nào cần cập nhật cho requirements mới
   - Đảm bảo mỗi requirement có ít nhất 4 test cases

2. **TEST CASES MỚI:**
   - Chỉ tạo test cases cho requirements CHƯA được cover
   - Đảm bảo enterprise standard GIỐNG HỆT test case design
   - Title format phải đồng bộ với hệ thống hiện tại

3. **TEST CASES CẬP NHẬT:**
   - Chỉ cập nhật test cases hiện có nếu cần thiết
   - Giữ nguyên structure, chỉ enhance content
   - Đảm bảo không phá vỡ existing automation

**YÊU CẦU TUYỆT ĐỐI VỀ ĐẦU RA:**
PHẢI chỉ trả về **duy nhất một đối tượng JSON hợp lệ**, không có bất kỳ text, chú thích, markdown hoặc ký tự thừa nào trước hoặc sau JSON.

**CẤU TRÚC JSON BẮT BUỘC (ĐỒNG BỘ VỚI TEST CASE DESIGN):**

{
  "additional_testcases": [
    {
      "title": "[UC_ID] - [Use Case Name] - [Test Scenario]",
      "description": "Detailed description of test purpose",
      "test_type": "unit|integration|api|ui",
      "source_requirement_ids": ["UC1"],
      "priority": "low|medium|high|critical",
      "preconditions": ["Prerequisites before testing", "Initial system/data state"],
      "postconditions": ["System state after testing", "Cleanup requirements"],
      "database_tables": ["users", "orders"],
      "database_operations": ["select", "insert"],
      "steps": [
        {
          "step_number": 1,
          "action": "Specific action description",
          "input_data": {
            "field_name": "specific_value",
            "method": "POST/PUT/GET",
            "endpoint": "/api/endpoint (if API)"
          },
          "expected_immediate_result": "Expected outcome immediately after this step"
        }
      ],
      "expected_results": {
        "ui_level": ["Display success message", "Navigate to dashboard page"],
        "api_level": {
          "status_code": 200,
          "response_schema": {
            "success": true,
            "data": {...}
          }
        },
        "database_level": ["Users table has new record", "Orders table is updated"],
        "business_level": "Business process handled correctly"
      },
      "test_data": [
        {
          "name": "Test data scenario 1",
          "input_payload": {
            "username": "testuser",
            "password": "Password123!"
          },
          "expected_output": {
            "status": "success|failure",
            "message": "Specific message",
            "data": {...},
            "status_code": 200
          },
          "validation_rules": [
            "Email must be valid format",
            "Password minimum 8 characters"
          ]
        }
      ],
      "automation": {
        "is_automated": false,
        "script_path": "/tests/features/login/test_login.py",
        "test_command": "pytest tests/features/login/test_login.py::test_login_success",
        "tags": ["smoke", "regression", "login"]
      },
      "execution_logs_format": {
        "timestamp": "ISO format",
        "step_number": 1,
        "status": "passed|failed|skipped",
        "actual_result": "Actual result",
        "screenshot_path": "/screenshots/test_001.png",
        "log_message": "Log details"
      }
    }
  ],
  "updated_testcases": [
    // Chỉ bao gồm test cases cần cập nhật (nếu có)
    // Structure GIỐNG HỆT additional_testcases nhưng có thể có thêm "id" field
  ]
}

**QUAN TRỌNG:**
- Đảm bảo additional_testcases có ĐẦY ĐỦ enterprise fields như test case design
- Steps PHẢI có input_data cụ thể và expected_immediate_result
- Expected_results PHẢI có multi-level (UI, API, Database, Business)
- Test_data PHẢI có input_payload và expected_output chi tiết
- **MỖI TITLE PHẢI LÀ DUY NHẤT** trong toàn bộ danh sách
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

**IMPORTANT:**
- Create test cases for ALL important use cases
- Include both positive and negative test cases
- Focus on core business functionality
- IDENTIFY SPECIFIC database tables and operations used
- Keep response concise, include only essential information

**ABSOLUTE OUTPUT REQUIREMENT:**
MUST return ONLY a single valid JSON object, without any text, comments, markdown or extra characters before or after the JSON.

The JSON object MUST strictly follow this structure:

{
  "testcases": [
    {
      "title": "Clear test case name and description",
      "description": "Detailed description of test purpose",
      "test_type": "unit|integration|api|ui",
      "source_requirement_ids": ["UC1", "UC2"],
      "priority": "low|medium|high|critical",
      
      // 🆕 ENTERPRISE FIELDS
      "preconditions": [
        "Prerequisites before testing",
        "Initial system/data state"
      ],
      "postconditions": [
        "System state after testing",
        "Cleanup requirements"
      ],
      
      "database_tables": ["users", "orders"],
      "database_operations": ["select", "insert"],
      
      // 🆕 IMPROVED STEPS with clear input/output
      "steps": [
        {
          "step_number": 1,
          "action": "Specific action description",
          "input_data": {
            "field_name": "specific_value",
            "method": "POST/PUT/GET",
            "endpoint": "/api/endpoint (if API)"
          },
          "expected_immediate_result": "Expected outcome immediately after this step"
        }
      ],
      
      // 🆕 MULTI-LEVEL EXPECTED RESULTS
      "expected_results": {
        "ui_level": [
          "Display success message",
          "Navigate to dashboard page"
        ],
        "api_level": {
          "status_code": 200,
          "response_schema": {
            "success": true,
            "data": {...}
          }
        },
        "database_level": [
          "Users table has new record",
          "Orders table is updated"
        ],
        "business_level": "Business process handled correctly"
      },
      
      // 🆕 ENHANCED TEST DATA
      "test_data": [
        {
          "name": "Test data scenario 1",
          "input_payload": {
            "username": "testuser",
            "password": "Password123!"
          },
          "expected_output": {
            "status": "success|failure",
            "message": "Specific message",
            "data": {...},
            "status_code": 200
          },
          "validation_rules": [
            "Email must be valid format",
            "Password minimum 8 characters"
          ]
        }
      ],
      
      // 🆕 AUTOMATION READY
      "automation": {
        "is_automated": false,
        "script_path": "/tests/features/login/test_login.py",
        "test_command": "pytest tests/features/login/test_login.py::test_login_success",
        "tags": ["smoke", "regression", "login"]
      },
      
      // 🆕 EXECUTION LOGS FORMAT
      "execution_logs_format": {
        "timestamp": "ISO format",
        "step_number": 1,
        "status": "passed|failed|skipped",
        "actual_result": "Actual result",
        "screenshot_path": "/screenshots/test_001.png",
        "log_message": "Log details"
      }
    }
  ]
}

**ENTERPRISE TEST CASE CREATION RULES:**

1. **STANDARDIZED TITLE (CRITICAL):**
   - Format: "[UC_ID] - [Use Case Name] - [Test Scenario]"
   - Example: "UC1 - User Login - Success with valid credentials"
   - DO NOT use "TC1-UC1" or sequential prefixes
   - **EACH TITLE MUST BE UNIQUE, NO DUPLICATES**

2. **IMPROVED STEPS - AI TEST GENERATOR FRIENDLY:**
   - Each step MUST have: action + specific input_data + expected_immediate_result
   - Input_data: specific values, not generic descriptions
   - Example:
     ❌ "Enter login information"
     ✅ "Enter username = 'testuser', password = 'Password123!'"

3. **MULTI-LEVEL EXPECTED RESULTS:**
   - UI Level: Display, notifications, navigation
   - API Level: Status code, response schema
   - Database Level: Data changes
   - Business Level: Actual business process

4. **DETAILED TEST DATA:**
   - Input_payload: Specific input data
   - Expected_output: Detailed expected output
   - Validation_rules: Applied validation rules

5. **PRECONDITIONS & POSTCONDITIONS:**
   - Preconditions: Initial system/data state
   - Postconditions: Cleanup, rollback requirements

6. **AUTOMATION READY:**
   - Script_path: Automation file path
   - Test_command: Test execution command
   - Tags: Test classification (smoke, regression, etc.)

7. **DATABASE INTEGRATION:**
   - Identify related tables based on use case
   - Specify operations (select/insert/update/delete)
   - Use field names independent of DB schema

8. **MINIMUM COVERAGE:**
   - **Each use case MUST have at least 4 test cases**:
     1. Positive - Success
     2. Negative - Failure due to invalid input
     3. Boundary - Edge values
     4. Error case - System exceptions

Create high-quality ENTERPRISE STANDARD test cases based on the provided use cases and database schema.
`,
        testcaseEnhancement: (existingTestcasesJson: string, newRequirementsJson: string) => `
YOU ARE AN ENTERPRISE TESTING EXPERT, your mission is to analyze existing test cases and new requirements to supplement missing test cases meeting ENTERPRISE STANDARDS.

EXISTING TEST CASES:
${existingTestcasesJson}

NEW/UPDATED REQUIREMENTS:
${newRequirementsJson}

**ENTERPRISE STANDARDIZATION RULES (IDENTICAL TO TEST CASE DESIGN):**

1. **STANDARDIZED TITLE (CRITICAL):**
   - Format: "[UC_ID] - [Use Case Name] - [Test Scenario]"
   - Example: "UC1 - User Login - Success with valid credentials"
   - DO NOT use "TC1-UC1" or sequential prefixes
   - **EACH TITLE MUST BE UNIQUE** across the entire list

2. **IMPROVED STEPS - AI TEST GENERATOR FRIENDLY:**
   - Each step MUST have: action + specific input_data + expected_immediate_result
   - Input_data: specific values, not generic descriptions
   - Example:
     ❌ "Enter login information"
     ✅ "Enter username = 'testuser', password = 'Password123!'"

3. **MULTI-LEVEL EXPECTED RESULTS:**
   - UI Level: Display, notifications, navigation
   - API Level: Status code, response schema
   - Database Level: Data changes
   - Business Level: Actual business process

4. **DETAILED TEST DATA:**
   - Input_payload: Specific input data
   - Expected_output: Detailed expected output
   - Validation_rules: Applied validation rules

5. **MINIMUM COVERAGE:**
   - **Each use case MUST have at least 4 test cases**:
     1. Positive - Success
     2. Negative - Failure due to invalid input
     3. Boundary - Edge values
     4. Error case - System exceptions

**ANALYSIS & REQUIREMENTS:**

1. **CURRENT ANALYSIS:**
   - Identify requirements NOT covered by existing test cases
   - Identify test cases that need updates for new requirements
   - Ensure each requirement has at least 4 test cases

2. **NEW TEST CASES:**
   - Create test cases ONLY for UNCOVERED requirements
   - Ensure enterprise standard IDENTICAL to test case design
   - Title format must be consistent with existing system

3. **UPDATED TEST CASES:**
   - Update existing test cases only when necessary
   - Maintain structure, only enhance content
   - Ensure no breaking changes to existing automation

**ABSOLUTE OUTPUT REQUIREMENT:**
MUST return ONLY a single valid JSON object, without any text, comments, markdown or extra characters before or after the JSON.

**REQUIRED JSON STRUCTURE (SYNCHRONIZED WITH TEST CASE DESIGN):**

{
  "additional_testcases": [
    {
      "title": "[UC_ID] - [Use Case Name] - [Test Scenario]",
      "description": "Detailed description of test purpose",
      "test_type": "unit|integration|api|ui",
      "source_requirement_ids": ["UC1"],
      "priority": "low|medium|high|critical",
      "preconditions": ["Prerequisites before testing", "Initial system/data state"],
      "postconditions": ["System state after testing", "Cleanup requirements"],
      "database_tables": ["users", "orders"],
      "database_operations": ["select", "insert"],
      "steps": [
        {
          "step_number": 1,
          "action": "Specific action description",
          "input_data": {
            "field_name": "specific_value",
            "method": "POST/PUT/GET",
            "endpoint": "/api/endpoint (if API)"
          },
          "expected_immediate_result": "Expected outcome immediately after this step"
        }
      ],
      "expected_results": {
        "ui_level": ["Display success message", "Navigate to dashboard page"],
        "api_level": {
          "status_code": 200,
          "response_schema": {
            "success": true,
            "data": {...}
          }
        },
        "database_level": ["Users table has new record", "Orders table is updated"],
        "business_level": "Business process handled correctly"
      },
      "test_data": [
        {
          "name": "Test data scenario 1",
          "input_payload": {
            "username": "testuser",
            "password": "Password123!"
          },
          "expected_output": {
            "status": "success|failure",
            "message": "Specific message",
            "data": {...},
            "status_code": 200
          },
          "validation_rules": [
            "Email must be valid format",
            "Password minimum 8 characters"
          ]
        }
      ],
      "automation": {
        "is_automated": false,
        "script_path": "/tests/features/login/test_login.py",
        "test_command": "pytest tests/features/login/test_login.py::test_login_success",
        "tags": ["smoke", "regression", "login"]
      },
      "execution_logs_format": {
        "timestamp": "ISO format",
        "step_number": 1,
        "status": "passed|failed|skipped",
        "actual_result": "Actual result",
        "screenshot_path": "/screenshots/test_001.png",
        "log_message": "Log details"
      }
    }
  ],
  "updated_testcases": [
    // Only include test cases that need updates (if any)
    // Structure IDENTICAL to additional_testcases but may include "id" field
  ]
}

**IMPORTANT:**
- Ensure additional_testcases have ALL enterprise fields like test case design
- Steps MUST have specific input_data and expected_immediate_result
- Expected_results MUST have multi-level (UI, API, Database, Business)
- Test_data MUST have detailed input_payload and expected_output
- **EACH TITLE MUST BE UNIQUE** across the entire list

**COVERAGE STRATEGY:**
- Focus on requirements with NO existing test cases first
- For requirements with partial coverage, add missing test case types
- Update existing test cases only when business logic has changed
- Maintain backward compatibility for automation scripts

**QUALITY ASSURANCE:**
- Verify all new test cases follow enterprise standards
- Ensure database operations match the actual business workflow
- Validate test data scenarios cover realistic use cases
- Confirm automation tags are appropriate for each test type
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