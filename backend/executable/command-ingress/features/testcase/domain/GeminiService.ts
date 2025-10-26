// TestcaseGeminiService.ts
import { ApiKeyService } from "../../orchestrator/domain/ApiKeyService";

// PROMPTS cho test case generation với database integration
const testcasePrompts = {
    'vi-VN': {
        testcaseDesign: (requirementsJson: string, databaseSchemaJson: string) => `
BẠN LÀ MỘT CHUYÊN GIA KIỂM THỬ PHẦN MỀM ĐẲNG CẤP THẾ GIỚI, chuyên tạo ra các test case toàn diện và hiệu quả từ yêu cầu nghiệp vụ và thiết kế database.

Nhiệm vụ của bạn là phân tích danh sách use case và cấu trúc database sau đây để tạo ra các test case chất lượng cao.

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

Phản hồi của bạn BẮT BUỘC CHỈ LÀ một đối tượng JSON hợp lệ. KHÔNG bao gồm bất kỳ lời giải thích, bình luận, hay định dạng markdown nào.

Đối tượng JSON BẮT BUỘC phải tuân thủ nghiêm ngặt cấu trúc sau:

{
  "testcases": [
    {
      "title": "Tên test case rõ ràng và mô tả",
      "description": "Mô tả chi tiết về mục đích test",
      "test_type": "unit|integration|api|ui",
      "source_requirement_ids": ["UC1", "UC2"],
      "database_tables": ["users", "orders"],        // 🆕 BẮT BUỘC: Tables được test
      "database_operations": ["select", "insert"],   // 🆕 BẮT BUỘC: Operations được thực hiện
      "steps": [
        "Bước 1: Mô tả hành động (bao gồm database operations)",
        "Bước 2: Mô tả hành động",
        "Bước 3: Mô tả hành động"
      ],
      "expected_result": "Kết quả mong đợi sau khi thực hiện tất cả bước",
      "priority": "low|medium|high|critical",
      "test_data": [
        {
          "name": "Test data scenario 1",
          "inputs": {
            "users.email": "test@example.com",      // 🆕 Sử dụng table.column format
            "users.password": "password123"
          },
          "expected_outputs": {
            "result_field": "expected_value"
          }
        }
      ]
    }
  ]
}

**QUY TẮC TẠO TEST CASE:**

1. **PHÂN LOẠI TEST TYPE:**
   - Unit: Test function/method riêng lẻ
   - Integration: Test tương tác giữa các component
   - API: Test API endpoints
   - UI: Test giao diện người dùng

2. **DATABASE INTEGRATION:**
   - Xác định tables nào sẽ được test trong test case
   - Ghi rõ database operations (select, insert, update, delete)
   - Sử dụng format "table.column" trong test data
   - Dựa trên related_usecase_ids trong database schema để xác định tables liên quan

3. **ƯU TIÊN (PRIORITY):**
   - Critical: Chức năng core, ảnh hưởng toàn hệ thống
   - High: Chức năng quan trọng, ảnh hưởng nhiều user
   - Medium: Chức năng thông thường
   - Low: Chức năng ít quan trọng

4. **TEST DATA DESIGN:**
   - Valid data: Dữ liệu hợp lệ để test success cases
   - Invalid data: Dữ liệu không hợp lệ để test error handling
   - Boundary data: Dữ liệu ở biên để test validation
   - Sử dụng đúng data types từ database schema

5. **COVERAGE REQUIREMENTS:**
   - Mỗi use case phải có ít nhất 2-3 test cases
   - Bao gồm cả success và failure scenarios
   - Test các validation rules từ database schema
   - Test relationships giữa các bảng

Hãy tạo test cases chất lượng cao dựa trên use cases và database schema được cung cấp.
`,

        testcaseEnhancement: (existingTestcasesJson: string, newRequirementsJson: string) => `
BẠN LÀ CHUYÊN GIA KIỂM THỬ, nhiệm vụ là phân tích test cases hiện có và yêu cầu mới để bổ sung test cases còn thiếu.

TEST CASES HIỆN TẠI:
${existingTestcasesJson}

YÊU CẦU MỚI/UPDATE:
${newRequirementsJson}

Phản hồi BẮT BUỘC CHỈ LÀ JSON object với structure:
{
  "additional_testcases": [
    // Chỉ bao gồm test cases MỚI cần thêm
  ],
  "updated_testcases": [
    // Test cases cần cập nhật (nếu có)
  ]
}
`
    },
    'en-US': {
        testcaseDesign: (requirementsJson: string, databaseSchemaJson: string) => `
YOU ARE A WORLD-CLASS SOFTWARE TESTING EXPERT, specializing in creating comprehensive and effective test cases from business requirements and database design.

Your task is to analyze the following use cases and database structure to create high-quality test cases.

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

Your response MUST be ONLY a single valid JSON object. DO NOT include any explanations, comments, or markdown formatting.

The JSON object MUST strictly follow this structure:

{
  "testcases": [
    {
      "title": "Clear test case name and description",
      "description": "Detailed description of test purpose",
      "test_type": "unit|integration|api|ui",
      "source_requirement_ids": ["UC1", "UC2"],
      "database_tables": ["users", "orders"],        // 🆕 REQUIRED: Tables being tested
      "database_operations": ["select", "insert"],   // 🆕 REQUIRED: Database operations performed
      "steps": [
        "Step 1: Action description (include database operations)",
        "Step 2: Action description", 
        "Step 3: Action description"
      ],
      "expected_result": "Expected outcome after all steps",
      "priority": "low|medium|high|critical",
      "test_data": [
        {
          "name": "Test data scenario 1",
          "inputs": {
            "users.email": "test@example.com",      // 🆕 Use table.column format
            "users.password": "password123"
          },
          "expected_outputs": {
            "result_field": "expected_value"
          }
        }
      ]
    }
  ]
}

**TEST CASE CREATION RULES:**

1. **TEST TYPE CLASSIFICATION:**
   - Unit: Test individual functions/methods
   - Integration: Test interactions between components
   - API: Test API endpoints
   - UI: Test user interface

2. **DATABASE INTEGRATION:**
   - Identify which tables are tested in this test case
   - Specify database operations (select, insert, update, delete)
   - Use "table.column" format in test data
   - Use related_usecase_ids from database schema to identify relevant tables

3. **PRIORITY LEVELS:**
   - Critical: Core functionality, system-wide impact
   - High: Important functionality, affects many users
   - Medium: Regular functionality
   - Low: Less important functionality

4. **TEST DATA DESIGN:**
   - Valid data: Legitimate data for success cases
   - Invalid data: Invalid data for error handling
   - Boundary data: Edge case data for validation testing
   - Use correct data types from database schema

5. **COVERAGE REQUIREMENTS:**
   - Each use case should have at least 2-3 test cases
   - Include both success and failure scenarios
   - Test validation rules from database schema
   - Test relationships between tables

Create high-quality test cases based on the provided use cases and database schema.
`,
        testcaseEnhancement: (existingTestcasesJson: string, newRequirementsJson: string) => `
YOU ARE A TESTING EXPERT, your task is to analyze existing test cases and new requirements to supplement missing test cases.

EXISTING TEST CASES:
${existingTestcasesJson}

NEW/UPDATED REQUIREMENTS:
${newRequirementsJson}

Response MUST be ONLY JSON object with structure:
{
  "additional_testcases": [
    // Only include NEW test cases needed
  ],
  "updated_testcases": [
    // Test cases that need updates (if any)
  ]
}
`
    }
};

export class TestcaseGeminiService {
    private apiKeyService = new ApiKeyService();

    // config
    private readonly TC_GEN_BATCH_SIZE = 8;
    private readonly MAX_BATCHES = 50;

    /**
     * Generate test cases từ requirements và database schema
     */
    async generateTestCases(requirements: any[], databaseSchema: any, language: string): Promise<any[]> {
        try {
            console.log(`🧪 Generating test cases for ${requirements.length} requirements`);

            if (requirements.length <= this.TC_GEN_BATCH_SIZE) {
                return await this.generateTestCasesBatch(requirements, databaseSchema, language);
            } else {
                return await this.generateTestCasesWithChunking(requirements, databaseSchema, language);
            }
        } catch (error) {
            console.error("❌ Error in generateTestCases:", error);
            return this.createFallbackTestCases(requirements, databaseSchema);
        }
    }

    /**
     * Generate test cases cho một batch requirements
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

        // 🆕 Enhanced database schema với use case mapping
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
                    related_usecase_ids: col.related_usecase_ids || [] // 🎯 Quan trọng: mapping use cases
                }))
            })),
            relationships: databaseSchema.relationships
        };

        const requirementsJson = JSON.stringify(simplifiedRequirements, null, 2);
        const databaseJson = JSON.stringify(enhancedDatabase, null, 2);

        const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
        const prompt = testcasePrompts[lang].testcaseDesign(requirementsJson, databaseJson);

        console.log(`📝 Generating test case batch for ${requirements.length} use cases`);

        const generatedJsonString = await this.generateJsonContent(prompt);

        if (!generatedJsonString) {
            throw new Error("Empty response from Gemini");
        }

        console.log(`📄 Raw test case response length: ${generatedJsonString.length}`);

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

        console.log(`✅ Raw test cases processed: ${testCases.length} test cases`);

        // 🆕 Enhanced standardization với database integration
        testCases = this.standardizeTestCases(testCases, requirements, databaseSchema);

        console.log(`🎉 Final test cases: ${testCases.length} test cases`);

        return testCases;
    }

    /**
     * Enhance existing test cases với requirements mới
     */
    async enhanceTestCases(existingTestCases: any[], newRequirements: any[], language: string): Promise<{
        additional_testcases: any[];
        updated_testcases: any[];
    }> {
        try {
            const simplifiedExisting = existingTestCases.map(tc => ({
                title: tc.title,
                description: tc.description,
                test_type: tc.test_type,
                source_requirement_ids: tc.source_requirement_ids,
                database_tables: tc.database_tables,
                database_operations: tc.database_operations,
                priority: tc.priority
            }));

            const simplifiedNewReqs = newRequirements.map(r => ({
                id: r.id,
                name: r.name,
                role: r.role,
                goal: r.goal,
                tasks: r.tasks
            }));

            const existingJson = JSON.stringify(simplifiedExisting, null, 2);
            const newReqsJson = JSON.stringify(simplifiedNewReqs, null, 2);

            const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
            const prompt = testcasePrompts[lang].testcaseEnhancement(existingJson, newReqsJson);

            console.log(`🔄 Enhancing test cases with ${newRequirements.length} new requirements`);

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

            // Standardize new test cases
            if (parsedResponse.additional_testcases && Array.isArray(parsedResponse.additional_testcases)) {
                // Note: Database schema không có ở đây, sẽ được xử lý sau
                parsedResponse.additional_testcases = this.standardizeTestCases(
                    parsedResponse.additional_testcases,
                    newRequirements,
                    { tables: [], relationships: [] } // Empty schema cho enhancement
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
     * Chuẩn hóa test cases theo schema
     */
    private standardizeTestCases(testCases: any[], requirements: any[], databaseSchema: any): any[] {
        console.log("🔄 Standardizing test cases with database integration...");

        return testCases.map((testCase, index) => {
            const standardized: any = {
                title: testCase.title || `Test Case ${index + 1}`,
                description: testCase.description || '',
                test_type: this.validateTestType(testCase.test_type),
                source_requirement_ids: this.validateRequirementIds(testCase.source_requirement_ids, requirements),

                // 🆕 Database integration fields
                database_tables: this.extractDatabaseTables(testCase, requirements, databaseSchema),
                database_operations: this.extractDatabaseOperations(testCase),

                steps: this.validateSteps(testCase.steps),
                expected_result: testCase.expected_result || 'Operation completed successfully',
                priority: this.validatePriority(testCase.priority),
                test_data: this.validateTestData(testCase.test_data),
                status: 'not_executed',
                environment: {},
                automation: {
                    is_automated: false
                }
            };

            // 🆕 Enhanced test data với database schema validation
            standardized.test_data = this.enhanceTestDataWithSchema(
                standardized.test_data,
                standardized.database_tables,
                databaseSchema
            );

            return standardized;
        });
    }

    /**
     * 🆕 Enhance test data với database schema validation
     */
    private enhanceTestDataWithSchema(testData: any[], databaseTables: string[], databaseSchema: any): any[] {
        if (!testData || !Array.isArray(testData) || testData.length === 0) {
            // Tạo default test data based on database tables
            return this.generateDefaultTestData(databaseTables, databaseSchema);
        }

        return testData.map(data => {
            const enhancedData = {
                name: data.name || "Test Data",
                inputs: { ...data.inputs },
                expected_outputs: { ...data.expected_outputs },
                actual_outputs: { ...data.actual_outputs || {} }
            };

            // Validate và enhance inputs với database schema
            Object.keys(enhancedData.inputs).forEach(key => {
                if (key.includes('.')) {
                    const [tableName, columnName] = key.split('.');
                    const columnSchema = this.getColumnSchema(tableName, columnName, databaseSchema);

                    if (columnSchema) {
                        // Có thể thêm validation hoặc transformation ở đây
                        // Ví dụ: ensure data type compatibility
                        enhancedData.inputs[key] = this.validateDataForColumn(
                            enhancedData.inputs[key],
                            columnSchema
                        );
                    }
                }
            });

            return enhancedData;
        });
    }

    /**
     * 🆕 Validate data cho column type
     */
    private validateDataForColumn(value: any, column: any): any {
        // Có thể thêm logic validation phức tạp hơn ở đây
        // Hiện tại chỉ return value as-is
        return value;
    }

    /**
     * 🆕 Lấy column schema từ database
     */
    private getColumnSchema(tableName: string, columnName: string, databaseSchema: any): any {
        const table = databaseSchema.tables?.find((t: any) => t.name === tableName);
        return table?.columns?.find((col: any) => col.name === columnName);
    }


    /**
     * 🆕 Generate default test data từ database schema
     */
    private generateDefaultTestData(databaseTables: string[], databaseSchema: any): any[] {
        const testData = [];

        databaseTables.forEach(tableName => {
            const table = databaseSchema.tables?.find((t: any) => t.name === tableName);
            if (table) {
                const inputs = {};
                const expectedOutputs = {};

                // Chọn một vài columns quan trọng để tạo test data
                table.columns?.slice(0, 3).forEach((col: any) => {
                    if (!col.is_primary_key || !col.is_foreign_key) {
                        inputs[`${tableName}.${col.name}`] = this.generateTestValueForColumn(col);
                    }
                });

                testData.push({
                    name: `Default test data for ${tableName}`,
                    inputs,
                    expected_outputs: expectedOutputs,
                    actual_outputs: {}
                });
            }
        });

        return testData.length > 0 ? testData : [{
            name: "Default Test Data",
            inputs: {},
            expected_outputs: {},
            actual_outputs: {}
        }];
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
            testCase.steps.forEach((step: string) => {
                const lowerStep = step.toLowerCase();
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
                if (lowerStep.includes('create table') || lowerStep.includes('alter table')) {
                    operations.add('create');
                }
                if (lowerStep.includes('alter') || lowerStep.includes('modify column')) {
                    operations.add('alter');
                }
            });
        }

        // 3. Extract từ test data analysis
        if (testCase.test_data && Array.isArray(testCase.test_data)) {
            testCase.test_data.forEach((data: any) => {
                if (data.inputs) {
                    const inputKeys = Object.keys(data.inputs).join(' ').toLowerCase();
                    if (inputKeys.includes('insert') || inputKeys.includes('new')) {
                        operations.add('insert');
                    }
                    if (inputKeys.includes('update') || inputKeys.includes('modify')) {
                        operations.add('update');
                    }
                }
            });
        }

        return Array.from(operations);
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

        // 2. Extract từ test data inputs (table.column format)
        if (testCase.test_data && Array.isArray(testCase.test_data)) {
            testCase.test_data.forEach((data: any) => {
                if (data.inputs) {
                    Object.keys(data.inputs).forEach(key => {
                        if (key.includes('.')) {
                            const table = key.split('.')[0];
                            if (this.isValidTable(table, databaseSchema)) {
                                tables.add(table);
                            }
                        }
                    });
                }
            });
        }

        // 3. 🆕 Extract từ requirement mapping trong database schema
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

        // 4. Extract từ requirement inputs/outputs
        requirementIds.forEach((reqId: string) => {
            const requirement = requirements.find((r: any) => r.id === reqId);
            if (requirement) {
                // Analyze requirement tasks và inputs để detect tables
                if (requirement.tasks) {
                    requirement.tasks.forEach((task: string) => {
                        databaseSchema.tables?.forEach((table: any) => {
                            if (task.toLowerCase().includes(table.name.toLowerCase())) {
                                tables.add(table.name);
                            }
                        });
                    });
                }
            }
        });

        return Array.from(tables);
    }

    /**
     * 🆕 Validate table exists in database schema
     */
    private isValidTable(tableName: string, databaseSchema: any): boolean {
        return databaseSchema.tables?.some((table: any) => table.name === tableName) || false;
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
     * Validate steps
     */
    private validateSteps(steps: any[] | undefined): string[] {
        if (!steps || !Array.isArray(steps)) {
            return ['Step 1: Execute the test procedure'];
        }
        return steps.filter(step => typeof step === 'string' && step.trim().length > 0);
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
     * Validate test data
     */
    private validateTestData(testData: any[] | undefined): any[] {
        if (!testData || !Array.isArray(testData)) {
            return [{
                name: "Default Test Data",
                inputs: {},
                expected_outputs: {},
                actual_outputs: {}
            }];
        }

        return testData.map(data => ({
            name: data.name || "Test Data",
            inputs: data.inputs || {},
            expected_outputs: data.expected_outputs || {},
            actual_outputs: data.actual_outputs || {}
        }));
    }

    /**
     * Generate test cases với chunking cho số lượng requirements lớn
     */
    private async generateTestCasesWithChunking(requirements: any[], databaseSchema: any, language: string): Promise<any[]> {
        console.log(`🔀 Splitting ${requirements.length} requirements into chunks for test case generation`);

        const chunks: any[][] = [];
        for (let i = 0; i < requirements.length; i += this.TC_GEN_BATCH_SIZE) {
            chunks.push(requirements.slice(i, i + this.TC_GEN_BATCH_SIZE));
        }

        console.log(`📦 Created ${chunks.length} chunks for test case processing`);

        const allTestCases: any[] = [];

        // Xử lý từng batch tuần tự
        for (let i = 0; i < chunks.length; i++) {
            try {
                console.log(`🔄 Processing test case chunk ${i + 1}/${chunks.length}`);
                const testCases = await this.generateTestCasesBatch(chunks[i], databaseSchema, language);
                allTestCases.push(...testCases);
                console.log(`✅ Completed test case chunk ${i + 1}/${chunks.length}`);

                // Thêm delay nhỏ giữa các batch
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
            } catch (error) {
                console.error(`❌ Failed test case chunk ${i + 1}:`, error);
                // Tiếp tục với các chunk khác
            }
        }

        if (allTestCases.length === 0) {
            console.warn("⚠️ All test case generation chunks failed, using fallback");
            return this.createFallbackTestCases(requirements);
        }

        console.log(`🔄 Merged ${allTestCases.length} test cases from all chunks`);
        return allTestCases;
    }

    /**
     * Tạo fallback test cases cơ bản
     */
    private createFallbackTestCases(requirements: any[], databaseSchema?: any): any[] {
        console.log("🔄 Creating enhanced fallback test cases");

        return requirements.map(requirement => {
            // 🆕 Extract database tables từ requirement
            const databaseTables = this.extractTablesFromRequirement(requirement, databaseSchema);
            const databaseOperations = this.extractOperationsFromRequirement(requirement);

            return {
                title: `Test ${requirement.name}`,
                description: `Basic test for ${requirement.goal}`,
                test_type: 'integration',
                source_requirement_ids: [requirement.id],
                database_tables: databaseTables,
                database_operations: databaseOperations,
                steps: [
                    `Step 1: Prepare test environment for ${requirement.name}`,
                    `Step 2: Execute ${requirement.name} functionality`,
                    `Step 3: Verify results match expected behavior`
                ],
                expected_result: `${requirement.name} functionality works as expected`,
                priority: 'medium',
                test_data: this.generateFallbackTestData(databaseTables, databaseSchema),
                status: 'not_executed',
                environment: {},
                automation: {
                    is_automated: false
                }
            };
        });
    }

    /**
     * 🆕 Generate fallback test data
     */
    private generateFallbackTestData(databaseTables: string[], databaseSchema?: any): any[] {
        if (databaseTables.length === 0) {
            return [{
                name: "Basic Test Data",
                inputs: {},
                expected_outputs: {},
                actual_outputs: {}
            }];
        }

        return databaseTables.map(tableName => ({
            name: `Test data for ${tableName}`,
            inputs: this.generateTableInputs(tableName, databaseSchema),
            expected_outputs: {},
            actual_outputs: {}
        }));
    }

    /**
     * 🆕 Generate table inputs
     */
    private generateTableInputs(tableName: string, databaseSchema?: any): any {
        const inputs = {};
        const table = databaseSchema?.tables?.find((t: any) => t.name === tableName);

        if (table?.columns) {
            table.columns.slice(0, 2).forEach((col: any) => {
                if (!col.is_primary_key) {
                    inputs[`${tableName}.${col.name}`] = this.generateTestValueForColumn(col);
                }
            });
        } else {
            // Fallback generic inputs
            inputs[`${tableName}.id`] = 1;
            inputs[`${tableName}.name`] = `Test ${tableName}`;
        }

        return inputs;
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
                console.log(`🔑 Trying Gemini key for test case content: ${k.key_value.slice(0, 12)}...`);
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
                console.error(`❌ Gemini key ${k._id} failed during test case generation:`, err?.message || err);

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

        throw lastError || new Error("All Gemini API keys failed during test case generation.");
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
            console.warn("⚠️ Could not extract valid JSON from test case response:", {
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
        let balance = 0;
        let inString = false;
        let escapeNext = false;

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

        let repaired = jsonStr;
        while (balance > 0) {
            if (repaired.trim().endsWith(',')) {
                repaired = repaired.slice(0, -1);
            }
            repaired += '}';
            balance--;
        }

        if (repaired.startsWith('[') && !repaired.endsWith(']')) {
            repaired += ']';
        } else if (repaired.startsWith('{') && !repaired.endsWith('}')) {
            repaired += '}';
        }

        return repaired;
    }
}