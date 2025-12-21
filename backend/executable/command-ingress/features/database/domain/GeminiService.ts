// DatabaseGeminiService.ts
import { ApiKeyService } from "../../orchestrator/domain/ApiKeyService";
import { LLMService } from "../../../shared/LLMService";

// PROMPTS cho database design
const databasePrompts = {
  "vi-VN": {
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
        { 
          "name": "id", 
          "type": "INT", 
          "is_primary_key": true, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": true, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": [] 
        },
        { 
          "name": "username", 
          "type": "VARCHAR(50)", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": true, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC1", "UC2"] 
        },
        { 
          "name": "email", 
          "type": "VARCHAR(100)", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": true, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC2", "UC15"] 
        },
        { 
          "name": "password_hash", 
          "type": "VARCHAR(255)", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": false, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC1", "UC2"] 
        }
      ]
    },
    {
      "name": "user_roles",
      "description": "Bảng trung gian quản lý phân quyền người dùng với khóa chính tổ hợp.",
      "columns": [
        { 
          "name": "user_id", 
          "type": "INT", 
          "is_primary_key": true, 
          "is_foreign_key": true, 
          "nullable": false, 
          "unique": false, 
          "references": "users",
          "primary_key_order": 1,
          "related_usecase_ids": ["UC7"] 
        },
        { 
          "name": "role_id", 
          "type": "INT", 
          "is_primary_key": true, 
          "is_foreign_key": true, 
          "nullable": false, 
          "unique": false, 
          "references": "roles",
          "primary_key_order": 2,
          "related_usecase_ids": ["UC7"] 
        },
        { 
          "name": "assigned_at", 
          "type": "DATETIME", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": false, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC7"] 
        }
      ]
    },
    {
      "name": "order_items",
      "description": "Bảng trung gian quản lý chi tiết đơn hàng với khóa chính tổ hợp.",
      "columns": [
        { 
          "name": "order_id", 
          "type": "INT", 
          "is_primary_key": true, 
          "is_foreign_key": true, 
          "nullable": false, 
          "unique": false, 
          "references": "orders",
          "primary_key_order": 1,
          "related_usecase_ids": ["UC8"] 
        },
        { 
          "name": "product_id", 
          "type": "INT", 
          "is_primary_key": true, 
          "is_foreign_key": true, 
          "nullable": false, 
          "unique": false, 
          "references": "products",
          "primary_key_order": 2,
          "related_usecase_ids": ["UC8"] 
        },
        { 
          "name": "quantity", 
          "type": "INT", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": false, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC8"] 
        },
        { 
          "name": "unit_price", 
          "type": "DECIMAL(10,2)", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": false, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC8"] 
        }
      ]
    }
  ],
  "relationships": [
    { 
      "from_table": "user_roles", 
      "to_table": "users", 
      "type": "many-to-one" 
    },
    { 
      "from_table": "user_roles", 
      "to_table": "roles", 
      "type": "many-to-one" 
    },
    { 
      "from_table": "order_items", 
      "to_table": "orders", 
      "type": "many-to-one" 
    },
    { 
      "from_table": "order_items", 
      "to_table": "products", 
      "type": "many-to-one" 
    }
  ]
}

**QUY TẮC VÀ LOGIC THIẾT KẾ CHUẨN SQL:**

1. **KHÓA CHÍNH (PRIMARY KEYS):**
   - Khóa chính đơn (Single PK): dùng cột 'id' kiểu 'INT AUTO_INCREMENT', không cần cột 'primary_key_order'.
   - Khóa chính tổng hợp (Composite PK): bắt buộc có cột 'primary_key_order' (1,2,3...), tất cả các cột trong khóa chính đều phải 'NOT NULL'.

2. **QUAN HỆ NHIỀU - NHIỀU (MANY-TO-MANY):**
   - Phải tạo bảng trung gian (junction table) để thể hiện mối quan hệ.
   - Tên bảng trung gian theo mẫu: 'table1_table2' (xếp theo thứ tự bảng chữ cái).
   - Tất cả khóa ngoại trong bảng trung gian đều phải 'NOT NULL'.
   - Bảng trung gian phải có khóa chính tổng hợp gồm hai khóa ngoại.

3. **KIỂU DỮ LIỆU (DATA TYPES):**
   - Chuỗi ngắn: dùng 'VARCHAR(255)'
   - Chuỗi dài: dùng 'TEXT'
   - Số nguyên: dùng 'INT'
   - Số thập phân (tiền tệ): dùng 'DECIMAL(10,2)'
   - Boolean: dùng 'TINYINT(1)'
   - Ngày giờ: dùng 'DATETIME' cho timestamp, 'DATE' cho ngày.

4. **RÀNG BUỘC (CONSTRAINTS):**
   - Khóa ngoại: mặc định phải 'NOT NULL'
   - Khóa chính: luôn 'NOT NULL'
   - Cột 'UNIQUE': cẩn thận khi cho phép 'NULL', vì 'NULL' không bị kiểm tra trùng lặp.

5. **CỘT HỆ THỐNG (SYSTEM COLUMNS):**
   - Tất cả bảng đều phải có 'created_at', 'updated_at'
   - Thêm 'deleted_at' cho các bảng hỗ trợ xóa mềm (soft delete), trừ bảng trung gian.

6. **QUY TẮC ĐẶT TÊN (NAMING):**
   - Dùng chữ thường và gạch dưới: 'snake_case'
   - Khóa ngoại đặt tên theo mẫu: 'referenced_table_id'
   - Khóa chính đơn là 'id', khóa chính tổng hợp chỉ dùng trong bảng trung gian.
   - Luôn sử dụng tên tiếng Anh cho tất cả các bảng, cột và mối quan hệ (tránh sử dụng các định danh bằng ngôn ngữ địa phương).
   - **QUAN TRỌNG: TRÁNH SQL RESERVED WORDS** - KHÔNG được dùng các từ khóa SQL như: order, select, insert, update, delete, table, index, view, user, group, key, value, type, status, level, date, time, year, month, day, hour, minute, second, count, sum, avg, max, min, join, inner, outer, left, right, where, from, as, on, and, or, not, null, is, in, like, between, exists, case, when, then, else, end, if, else, while, for, loop, begin, commit, rollback, transaction, constraint, primary, foreign, unique, check, default, auto_increment, database, schema, grant, revoke, privileges, values, set, into, return, declare, variable, cursor, fetch, open, close, procedure, function, trigger, index, view.
   - Nếu cần đặt tên liên quan đến reserved word, thêm hậu tố: ví dụ 'order' → 'order_item' hoặc 'order_data', 'user' → 'user_account' hoặc 'user_profile', 'group' → 'user_group' hoặc 'group_info', 'type' → 'item_type' hoặc 'type_name', 'status' → 'order_status' hoặc 'status_code', 'level' → 'user_level' hoặc 'level_name'.

7. **XÁC ĐỊNH USE CASE:**
   - Đối với mỗi cột riêng lẻ, bạn BẮT BUỘC phải xác định những use case nào yêu cầu sự tồn tại của nó
   - Điền vào mảng 'related_usecase_ids' ID của mọi use case có liên quan
   - Nếu một cột được yêu cầu bởi nhiều use case, bao gồm tất cả các ID đó
   - Nếu không thể xác định nguồn gốc, trả về một mảng rỗng []

**PHÁT HIỆN QUAN HỆ MANY-TO-MANY TỪ USE CASE:**
- Khi use case đề cập "nhiều A liên quan đến nhiều B" → tạo bảng trung gian A_B
- Khi use case đề cập "danh sách", "nhiều mục", "chi tiết" → có thể cần bảng trung gian
- Ví dụ: "Quản lý sản phẩm trong đơn hàng" → order_items
- Ví dụ: "Gán nhiều vai trò cho người dùng" → user_roles

Hãy suy luận các bảng cần thiết từ các use case được cung cấp và áp dụng nghiêm ngặt tất cả các quy tắc thiết kế trên.
`,
  },
  "en-US": {
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
      "description": "Stores user account information and authentication credentials.",
      "columns": [
        { 
          "name": "id", 
          "type": "INT", 
          "is_primary_key": true, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": true, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": [] 
        },
        { 
          "name": "username", 
          "type": "VARCHAR(50)", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": true, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC1", "UC2"] 
        },
        { 
          "name": "email", 
          "type": "VARCHAR(100)", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": true, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC2", "UC15"] 
        },
        { 
          "name": "password_hash", 
          "type": "VARCHAR(255)", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": false, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC1", "UC2"] 
        }
      ]
    },
    {
      "name": "user_roles",
      "description": "Junction table for user role assignments with composite primary key.",
      "columns": [
        { 
          "name": "user_id", 
          "type": "INT", 
          "is_primary_key": true, 
          "is_foreign_key": true, 
          "nullable": false, 
          "unique": false, 
          "references": "users",
          "primary_key_order": 1,
          "related_usecase_ids": ["UC7"] 
        },
        { 
          "name": "role_id", 
          "type": "INT", 
          "is_primary_key": true, 
          "is_foreign_key": true, 
          "nullable": false, 
          "unique": false, 
          "references": "roles",
          "primary_key_order": 2,
          "related_usecase_ids": ["UC7"] 
        },
        { 
          "name": "assigned_at", 
          "type": "DATETIME", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": false, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC7"] 
        }
      ]
    },
    {
      "name": "order_items",
      "description": "Junction table for order details with composite primary key.",
      "columns": [
        { 
          "name": "order_id", 
          "type": "INT", 
          "is_primary_key": true, 
          "is_foreign_key": true, 
          "nullable": false, 
          "unique": false, 
          "references": "orders",
          "primary_key_order": 1,
          "related_usecase_ids": ["UC8"] 
        },
        { 
          "name": "product_id", 
          "type": "INT", 
          "is_primary_key": true, 
          "is_foreign_key": true, 
          "nullable": false, 
          "unique": false, 
          "references": "products",
          "primary_key_order": 2,
          "related_usecase_ids": ["UC8"] 
        },
        { 
          "name": "quantity", 
          "type": "INT", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": false, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC8"] 
        },
        { 
          "name": "unit_price", 
          "type": "DECIMAL(10,2)", 
          "is_primary_key": false, 
          "is_foreign_key": false, 
          "nullable": false, 
          "unique": false, 
          "references": null,
          "primary_key_order": null,
          "related_usecase_ids": ["UC8"] 
        }
      ]
    }
  ],
  "relationships": [
    { 
      "from_table": "user_roles", 
      "to_table": "users", 
      "type": "many-to-one" 
    },
    { 
      "from_table": "user_roles", 
      "to_table": "roles", 
      "type": "many-to-one" 
    },
    { 
      "from_table": "order_items", 
      "to_table": "orders", 
      "type": "many-to-one" 
    },
    { 
      "from_table": "order_items", 
      "to_table": "products", 
      "type": "many-to-one" 
    }
  ]
}

**DESIGN RULES AND LOGIC:**

1. **PRIMARY KEYS:**
   - Single PK: Use 'id' INT AUTO_INCREMENT, NO primary_key_order field
   - Composite PK: Must have primary_key_order (1,2,3...), all columns NOT NULL

2. **MANY-TO-MANY:**
   - MUST create junction tables with composite primary keys
   - Name pattern: table1_table2 (alphabetical order)
   - All foreign keys in junction tables MUST be NOT NULL

3. **DATA TYPES:**
   - Strings: VARCHAR(255) for short text, TEXT for long content
   - Numbers: INT for integers, DECIMAL(10,2) for money
   - Boolean: TINYINT(1)
   - Dates: DATETIME for timestamps, DATE for dates only

4. **CONSTRAINTS:**
   - Foreign keys: NOT NULL by default
   - Primary keys: ALWAYS NOT NULL
   - Unique constraints: Be careful with nullable columns

5. **SYSTEM COLUMNS:**
   - Add created_at, updated_at to all tables
   - Add deleted_at for soft delete (except junction tables)

6. **NAMING:**
   - lowercase snake_case only
   - Foreign keys: referenced_table_id
   - Primary keys: 'id' for single, composite for junction tables
   - Always use English names for all tables, columns, and relationships (avoid local-language identifiers).
   - **CRITICAL: AVOID SQL RESERVED WORDS** - DO NOT use SQL keywords such as: order, select, insert, update, delete, table, index, view, user, group, key, value, type, status, level, date, time, year, month, day, hour, minute, second, count, sum, avg, max, min, join, inner, outer, left, right, where, from, as, on, and, or, not, null, is, in, like, between, exists, case, when, then, else, end, if, else, while, for, loop, begin, commit, rollback, transaction, constraint, primary, foreign, unique, check, default, auto_increment, database, schema, grant, revoke, privileges, values, set, into, return, declare, variable, cursor, fetch, open, close, procedure, function, trigger, index, view.
   - If you need a name related to a reserved word, add a suffix: e.g., 'order' → 'order_item' or 'order_data', 'user' → 'user_account' or 'user_profile', 'group' → 'user_group' or 'group_info', 'type' → 'item_type' or 'type_name', 'status' → 'order_status' or 'status_code', 'level' → 'user_level' or 'level_name'.

7. **USE CASE TRACEABILITY:**
   - For each individual column, you MUST determine which use cases require its existence
   - Populate 'related_usecase_ids' array with the ID of every relevant use case
   - If a column is required by multiple use cases, include all their IDs
   - If the origin is unclear, return an empty array []

**DETECTING MANY-TO-MANY FROM USE CASES:**
- When use case mentions "many A related to many B" → create junction table A_B
- When use case mentions "list", "multiple items", "details" → may need junction table
- Example: "Manage products in orders" → order_items
- Example: "Assign multiple roles to users" → user_roles

Infer necessary tables from the provided use cases and strictly apply all design rules above.
`,
  },
};

export class DatabaseGeminiService {
  private apiKeyService = new ApiKeyService();
  private llmService = new LLMService();

  // config
  private readonly DB_GEN_BATCH_SIZE = 10;
  private readonly MAX_BATCHES = 100;

  /**
   * Generate database schema với chunking để tránh response quá dài
   */
  async generateDatabaseSchema(
    requirements: any[],
    language: string,
    userId?: string,
    projectId?: string
  ): Promise<any> {
    // ✅ Không catch error ở đây - để DatabaseCoreService xử lý và emit failed event
    if (requirements.length <= this.DB_GEN_BATCH_SIZE) {
      // Nếu ít requirements, xử lý một lần
      return await this.generateDatabaseSchemaBatch(requirements, language, userId, projectId);
    } else {
      // Nhiều requirements, chia thành các batch và merge
      return await this.generateDatabaseSchemaWithChunking(
        requirements,
        language,
        userId,
        projectId
      );
    }
  }

  /**
   * Generate schema cho một batch requirements
   */
  private async generateDatabaseSchemaBatch(
    requirements: any[],
    language: string,
    userId?: string,
    projectId?: string
  ): Promise<any> {
    const simplifiedRequirements = requirements.map((r) => ({
      id: r.id || r._id,
      name: r.name,
      actor: (r as any).actor || r.role, // Hỗ trợ cả actor (mới) và role (cũ)
      goal: r.goal,
      main_flow: (r as any).main_flow || r.tasks, // Hỗ trợ cả main_flow (mới) và tasks (cũ)
      inputs: r.inputs,
      outputs: r.outputs,
    }));

    const requirementsJson = JSON.stringify(simplifiedRequirements, null, 2);
    const lang = language === "en-US" ? "en-US" : "vi-VN";

    const prompt = databasePrompts[lang].databaseDesign(requirementsJson);

    console.log(
      `📊 Generating database schema batch for ${requirements.length} use cases`
    );

    // ✅ MỚI: Token analysis trước khi gọi LLM (sử dụng model user đã chọn)
    const { getModelConfig, logTokenInfo } = await import("../../../shared/tokenManager");
    const modelName = await this.llmService.getRecommendedModel(undefined, userId);
    // ✅ CẢI THIỆN: getModelConfig đã tự động xử lý OpenRouter models và model có phí
    // Set isProductionFreeMode = false để cho phép model có phí (user đã chọn)
    const modelConfig = getModelConfig(modelName, undefined, false);
    logTokenInfo(prompt, modelConfig, '[Database Schema]');

    const generatedJsonString = await this.generateJsonContent(prompt, userId, projectId);

    if (!generatedJsonString) {
      throw new Error("Empty response from Gemini");
    }

    console.log(`📄 Raw response length: ${generatedJsonString.length}`);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(generatedJsonString);
    } catch (parseError) {
      console.error(
        "❌ JSON parse error in batch, attempting repair...",
        parseError
      );
      const repairedJson = this.repairTruncatedJson(generatedJsonString);
      parsedResponse = JSON.parse(repairedJson);
    }

    // Xử lý response format
    let finalSchema: any;
    if (Array.isArray(parsedResponse)) {
      console.log(
        `🔍 Detected array format with ${parsedResponse.length} tables`
      );
      finalSchema = {
        name: "generated_database",
        description: "Database schema generated from use cases",
        tables: parsedResponse,
        relationships: this.inferRelationships(parsedResponse),
      };
    } else if (parsedResponse && typeof parsedResponse === "object") {
      console.log(`🔍 Detected object format`);
      finalSchema = parsedResponse;

      // Đảm bảo có đầy đủ các trường
      if (!finalSchema.tables || !Array.isArray(finalSchema.tables)) {
        finalSchema.tables = [];
      }
      if (
        !finalSchema.relationships ||
        !Array.isArray(finalSchema.relationships)
      ) {
        finalSchema.relationships = this.inferRelationships(finalSchema.tables);
      }
      if (!finalSchema.name) finalSchema.name = "generated_database";
      if (!finalSchema.description)
        finalSchema.description = "Database schema generated from use cases";
    } else {
      throw new Error("Invalid response format from Gemini");
    }

    console.log(
      `✅ Raw schema processed with ${finalSchema.tables.length} tables`
    );

    // 🔴 ÁP DỤNG TẤT CẢ FIXES CHUẨN SQL
    console.log("🔄 Applying SQL standardization fixes...");
    finalSchema = this.standardizeDatabaseSchema(finalSchema);

    // Xử lý type/length và composite key logic
    finalSchema = this._parseColumnTypesAndLengths(finalSchema);

    // Ultimate composite key fix
    console.log("🔒 Running ultimate composite key validation...");
    finalSchema = this.ultimateCompositeKeyFix(finalSchema);

    // Final validation
    this.validateAllCompositeKeys(finalSchema.tables);

    console.log(
      `🎉 Final schema: ${finalSchema.tables.length} tables, ${finalSchema.relationships.length} relationships`
    );

    return finalSchema;
  }

  /**
   * STANDARDIZE: Chuẩn hóa toàn bộ database schema theo SQL standards
   */
  private standardizeDatabaseSchema(databaseSchema: any): any {
    console.log("🔄 Standardizing database schema for SQL compliance...");

    // Thực hiện tuần tự các bước chuẩn hóa
    databaseSchema = this.standardizeDataTypes(databaseSchema);
    databaseSchema = this.normalizePrimaryKeys(databaseSchema);
    databaseSchema = this.enhanceConstraints(databaseSchema);
    databaseSchema = this.validateAndFixJunctionTables(databaseSchema);
    databaseSchema = this.addMissingSystemColumns(databaseSchema);
    databaseSchema = this.validateNamingConventions(databaseSchema);

    console.log("✅ Database schema standardization completed");
    return databaseSchema;
  }

  /**
   * FIX 1: Data Type Mapping chuẩn hóa
   */
  private standardizeDataTypes(databaseSchema: any): any {
    const typeMapping: { [key: string]: string } = {
      STRING: "VARCHAR(255)",
      TEXT: "TEXT",
      INTEGER: "INT",
      INT: "INT",
      BIGINT: "BIGINT",
      SMALLINT: "SMALLINT",
      TINYINT: "TINYINT",
      BOOLEAN: "TINYINT(1)",
      BOOL: "TINYINT(1)",
      FLOAT: "DECIMAL(10,2)",
      DOUBLE: "DECIMAL(15,4)",
      DECIMAL: "DECIMAL(10,2)",
      NUMERIC: "DECIMAL(10,2)",
      DATE: "DATE",
      DATETIME: "DATETIME",
      TIMESTAMP: "TIMESTAMP",
      TIME: "TIME",
      BLOB: "BLOB",
      LONGBLOB: "LONGBLOB",
      LONGTEXT: "LONGTEXT",
    };

    databaseSchema.tables.forEach((table: any) => {
      table.columns.forEach((column: any) => {
        const originalType = column.type?.toUpperCase();

        if (originalType && typeMapping[originalType]) {
          const newType = typeMapping[originalType];
          if (originalType !== newType) {
            console.log(
              `↪️ Standardizing type: ${table.name}.${column.name} ${originalType} → ${newType}`
            );
            column.type = newType;
          }
        }

        // Xử lý các type có length specification
        if (
          column.type &&
          column.type.includes("(") &&
          !column.type.includes(")")
        ) {
          console.warn(`⚠️ Fixing malformed type: ${column.type}`);
          column.type = column.type.replace("(", "").trim();
        }
      });
    });

    return databaseSchema;
  }

  /**
   * FIX 2: Chuẩn hóa Primary Key Logic
   */
  private normalizePrimaryKeys(databaseSchema: any): any {
    databaseSchema.tables.forEach((table: any) => {
      const primaryKeys = table.columns.filter(
        (col: any) => col.is_primary_key
      );

      if (primaryKeys.length === 0) {
        // Tự động thêm primary key nếu thiếu
        console.log(`🔑 Adding auto primary key to table: ${table.name}`);
        table.columns.unshift({
          name: "id",
          type: "INT",
          is_primary_key: true,
          is_foreign_key: false,
          nullable: false,
          unique: true,
          references: null,
          // KHÔNG CÓ primary_key_order cho single PK
          related_usecase_ids: [],
        });
      } else if (primaryKeys.length === 1) {
        // SINGLE PK: Xóa primary_key_order
        const singlePK = primaryKeys[0];
        if (singlePK.primary_key_order !== undefined) {
          console.log(
            `🔧 Removing primary_key_order from single PK: ${table.name}.${singlePK.name}`
          );
          delete singlePK.primary_key_order;
        }
        // Đảm bảo NOT NULL
        singlePK.nullable = false;
      } else {
        // COMPOSITE PK: Đảm bảo orders hợp lệ
        console.log(`🔑 Normalizing composite key for table: ${table.name}`);

        // Sắp xếp columns theo thứ tự xuất hiện
        const tableColumnNames = table.columns.map((col: any) => col.name);
        primaryKeys.sort(
          (a: any, b: any) =>
            tableColumnNames.indexOf(a.name) - tableColumnNames.indexOf(b.name)
        );

        // Gán orders tuần tự
        primaryKeys.forEach((pk: any, index: number) => {
          pk.primary_key_order = index + 1;
          pk.nullable = false; // Bắt buộc NOT NULL

          // Đảm bảo type consistency trong composite key
          if (pk.type === "VARCHAR" && !pk.length) {
            pk.length = "255"; // Default length
          }
        });

        // Validate orders
        const orders = primaryKeys
          .map((pk: any) => pk.primary_key_order)
          .sort();
        const expectedOrders = Array.from(
          { length: primaryKeys.length },
          (_, i) => i + 1
        );

        if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
          console.warn(`🔄 Reordering composite key for table ${table.name}`);
          primaryKeys.forEach((pk: any, index: number) => {
            pk.primary_key_order = index + 1;
          });
        }
      }
    });

    return databaseSchema;
  }

  /**
   * FIX 3: Enhanced Constraints
   */
  private enhanceConstraints(databaseSchema: any): any {
    databaseSchema.tables.forEach((table: any) => {
      table.columns.forEach((column: any) => {
        // PRIMARY KEY luôn NOT NULL
        if (column.is_primary_key) {
          column.nullable = false;
        }

        // FOREIGN KEY mặc định NOT NULL (trừ khi có lý do đặc biệt)
        if (column.is_foreign_key && column.nullable === undefined) {
          column.nullable = false;
        }

        // UNIQUE constraint warning cho nullable columns
        if (column.unique && column.nullable) {
          console.warn(
            `💡 UNIQUE constraint on nullable column: ${table.name}.${column.name}`
          );
        }

        // Đảm bảo DEFAULT values hợp lệ
        if (column.default) {
          column.default = this.validateDefaultValue(
            column.default,
            column.type
          );
        }

        // Auto-increment logic cho single PK
        if (
          column.is_primary_key &&
          !column.is_foreign_key &&
          ["INT", "BIGINT"].includes(column.type) &&
          !column.default
        ) {
          // Thêm hint cho auto-increment (sẽ được xử lý ở SQL generation)
          column.auto_increment = true;
        }
      });
    });

    return databaseSchema;
  }

  /**
   * FIX 4: Many-to-Many Junction Tables Validation
   */
  private validateAndFixJunctionTables(databaseSchema: any): any {
    databaseSchema.tables.forEach((table: any) => {
      // Phát hiện junction table (naming pattern: table1_table2)
      const isJunctionTable =
        table.name.includes("_") &&
        table.columns.some((col) => col.is_foreign_key);

      if (isJunctionTable) {
        console.log(`🔗 Validating junction table: ${table.name}`);

        const foreignKeys = table.columns.filter((col) => col.is_foreign_key);
        const primaryKeys = table.columns.filter((col) => col.is_primary_key);

        // Đảm bảo có ít nhất 2 foreign keys
        if (foreignKeys.length < 2) {
          console.warn(
            `⚠️ Junction table ${table.name} should have at least 2 foreign keys`
          );
        }

        // Đảm bảo foreign keys là NOT NULL
        foreignKeys.forEach((fk) => {
          if (fk.nullable !== false) {
            console.log(
              `🔧 Fixing nullable foreign key: ${table.name}.${fk.name}`
            );
            fk.nullable = false;
          }
        });

        // Đảm bảo có composite primary key
        if (primaryKeys.length < 2 && foreignKeys.length >= 2) {
          console.log(
            `🔧 Adding composite primary key to junction table: ${table.name}`
          );

          // Đánh dấu tất cả foreign keys là primary keys
          foreignKeys.forEach((fk, index) => {
            fk.is_primary_key = true;
            fk.primary_key_order = index + 1;
            fk.nullable = false;
          });
        }

        // Validate composite key structure
        if (primaryKeys.length >= 2) {
          const invalidPKs = primaryKeys.filter((pk) => pk.nullable);
          if (invalidPKs.length > 0) {
            console.warn(
              `⚠️ Fixing nullable composite key columns in ${table.name}`
            );
            invalidPKs.forEach((pk) => (pk.nullable = false));
          }
        }
      }
    });

    return databaseSchema;
  }

  /**
   * FIX 5: Thêm system columns missing
   */
  private addMissingSystemColumns(databaseSchema: any): any {
    const systemColumns = [
      {
        name: "created_at",
        type: "DATETIME",
        is_primary_key: false,
        is_foreign_key: false,
        nullable: false,
        unique: false,
        references: null,
        related_usecase_ids: [],
        default: "CURRENT_TIMESTAMP",
      },
      {
        name: "updated_at",
        type: "DATETIME",
        is_primary_key: false,
        is_foreign_key: false,
        nullable: true,
        unique: false,
        references: null,
        related_usecase_ids: [],
        default: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
      },
    ];

    databaseSchema.tables.forEach((table: any) => {
      // Bỏ qua junction tables cho deleted_at
      const isJunctionTable =
        table.name.includes("_") &&
        table.columns.some((col) => col.is_foreign_key);

      const existingColumns = new Set(
        table.columns.map((col) => col.name.toLowerCase())
      );

      // Thêm system columns nếu chưa có
      systemColumns.forEach((sysCol) => {
        if (!existingColumns.has(sysCol.name)) {
          table.columns.push({ ...sysCol });
          console.log(`⚙️ Added system column: ${table.name}.${sysCol.name}`);
        }
      });

      // Thêm deleted_at cho non-junction tables
      if (!isJunctionTable && !existingColumns.has("deleted_at")) {
        table.columns.push({
          name: "deleted_at",
          type: "DATETIME",
          is_primary_key: false,
          is_foreign_key: false,
          nullable: true,
          unique: false,
          references: null,
          related_usecase_ids: [],
        });
        console.log(`⚙️ Added soft delete column: ${table.name}.deleted_at`);
      }
    });

    return databaseSchema;
  }

  /**
   * FIX 6: Validate naming conventions and SQL reserved words
   */
  private validateNamingConventions(databaseSchema: any): any {
    // SQL reserved words (comprehensive list)
    const sqlReservedWords = new Set([
      'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter', 'table',
      'where', 'from', 'join', 'inner', 'left', 'right', 'outer', 'on',
      'group', 'order', 'by', 'having', 'distinct', 'union', 'all',
      'and', 'or', 'not', 'in', 'exists', 'like', 'between', 'is', 'null',
      'as', 'case', 'when', 'then', 'else', 'end', 'if', 'while', 'for',
      'begin', 'commit', 'rollback', 'transaction', 'index', 'view', 'procedure',
      'function', 'trigger', 'constraint', 'primary', 'foreign', 'key', 'unique',
      'check', 'default', 'auto_increment', 'identity', 'sequence', 'database',
      'schema', 'user', 'grant', 'revoke', 'privileges', 'values', 'set',
      'into', 'return', 'declare', 'variable', 'cursor', 'fetch', 'open', 'close'
    ]);

    databaseSchema.tables.forEach((table: any) => {
      // Table naming convention
      if (!/^[a-z][a-z0-9_]*$/.test(table.name)) {
        console.warn(
          `💡 Table name should be lowercase snake_case: ${table.name}`
        );
      }

      // Check SQL reserved words for table name - AUTO FIX
      if (sqlReservedWords.has(table.name.toLowerCase())) {
        const oldName = table.name;
        const reservedWord = table.name.toLowerCase();
        // Auto-fix: thay thế reserved word bằng tên mô tả hơn
        const suffixMap: { [key: string]: string } = {
          'order': 'orders',
          'user': 'users',
          'group': 'user_groups',
          'type': 'item_types',
          'status': 'status_codes',
          'level': 'levels',
          'key': 'keys',
          'value': 'values',
          'table': 'tables',
          'index': 'indexes',
          'view': 'views',
        };
        table.name = suffixMap[reservedWord] || `${table.name}_table`;
        console.warn(
          `⚠️ Table name '${oldName}' is a SQL reserved word. Auto-renamed to '${table.name}'.`
        );
      }

      table.columns.forEach((column: any) => {
        // Column naming convention
        if (!/^[a-z][a-z0-9_]*$/.test(column.name)) {
          console.warn(
            `💡 Column name should be lowercase snake_case: ${table.name}.${column.name}`
          );
        }

        // Check SQL reserved words for column name - AUTO FIX
        if (sqlReservedWords.has(column.name.toLowerCase())) {
          const oldName = column.name;
          // Auto-fix: thêm suffix để tránh reserved word
          if (column.is_foreign_key) {
            // Foreign key: thay thế reserved word bằng tên mô tả hơn
            // Ví dụ: 'order' → 'order_item_id', 'user' → 'user_account_id'
            const reservedWord = column.name.toLowerCase();
            const suffixMap: { [key: string]: string } = {
              'order': 'order_item',
              'user': 'user_account',
              'group': 'user_group',
              'type': 'item_type',
              'status': 'status_code',
              'level': 'level_name',
              'key': 'key_value',
              'value': 'value_data',
              'date': 'date_value',
              'time': 'time_value',
            };
            const replacement = suffixMap[reservedWord] || `${reservedWord}_item`;
            column.name = `${replacement}_id`;
          } else {
            // Regular column: thêm suffix _value
            column.name = `${column.name}_value`;
          }
          console.warn(
            `⚠️ Column name '${table.name}.${oldName}' is a SQL reserved word. Auto-renamed to '${column.name}'.`
          );
        }

        // Foreign key naming convention
        if (column.is_foreign_key && !column.name.endsWith("_id")) {
          console.warn(
            `💡 Foreign key should end with '_id': ${table.name}.${column.name}`
          );
        }

        // Primary key naming convention (single PK)
        const primaryKeys = table.columns.filter((col) => col.is_primary_key);
        if (primaryKeys.length === 1 && primaryKeys[0].name === column.name) {
          if (column.name !== "id" && !column.name.endsWith("_id")) {
            console.warn(
              `💡 Single primary key should be named 'id' or end with '_id': ${table.name}.${column.name}`
            );
          }
        }
      });
    });

    return databaseSchema;
  }

  /**
   * Utility: Validate default values
   */
  private validateDefaultValue(
    defaultValue: string,
    columnType: string
  ): string {
    if (!defaultValue) return defaultValue;

    const lowerValue = defaultValue.toLowerCase();

    // MySQL keywords
    if (
      ["current_timestamp", "now()", "null", "true", "false"].includes(
        lowerValue
      )
    ) {
      return lowerValue.toUpperCase();
    }

    // String types cần quotes
    if (["VARCHAR", "CHAR", "TEXT", "LONGTEXT"].includes(columnType)) {
      if (!defaultValue.startsWith("'") && !defaultValue.endsWith("'")) {
        return `'${defaultValue}'`;
      }
    }

    // Numeric types - validate format
    if (["INT", "BIGINT", "DECIMAL", "FLOAT", "DOUBLE"].includes(columnType)) {
      if (
        isNaN(Number(defaultValue)) &&
        !["null", "true", "false"].includes(lowerValue)
      ) {
        console.warn(
          `⚠️ Invalid numeric default: ${defaultValue} for type ${columnType}`
        );
        return "NULL";
      }
    }

    return defaultValue;
  }

  /**
   * ULTIMATE FIX - Đảm bảo 100% không còn lỗi composite key
   */
  private ultimateCompositeKeyFix(databaseSchema: any): any {
    if (!databaseSchema?.tables) return databaseSchema;

    console.log("🛠️ Applying ULTIMATE composite key fix...");

    for (const table of databaseSchema.tables) {
      if (!table?.columns) continue;

      // ✅ Cải thiện: Detect primary keys với nhiều cách (true, "true", 1, etc.)
      const primaryKeys = table.columns.filter((col: any) => {
        const isPK = col.is_primary_key === true ||
          col.is_primary_key === "true" ||
          col.is_primary_key === 1 ||
          (typeof col.is_primary_key === 'string' && col.is_primary_key.toLowerCase() === 'true');
        return isPK;
      });

      if (primaryKeys.length > 1) {
        console.log(
          `🔑 Table ${table.name}: Found ${primaryKeys.length} primary keys (COMPOSITE KEY)`
        );

        // 🔴 FIX TRIỆT ĐỂ: Đảm bảo mọi composite key đều có primary_key_order
        let order = 1;
        for (const pk of primaryKeys) {
          // ✅ FIX: Luôn set primary_key_order cho composite keys, bất kể giá trị hiện tại
          if (pk.primary_key_order == null || pk.primary_key_order === undefined) {
            console.log(
              `   🛠️ FIXING: ${pk.name} - setting primary_key_order = ${order}`
            );
            pk.primary_key_order = order;
          } else if (pk.primary_key_order !== order) {
            console.log(
              `   🛠️ FIXING: ${pk.name} - correcting primary_key_order ${pk.primary_key_order} → ${order}`
            );
            pk.primary_key_order = order;
          }
          order++;

          // Đảm bảo primary key không thể null
          pk.nullable = false;
          pk.is_primary_key = true; // ✅ Đảm bảo flag đúng
        }

        console.log(`✅ Table ${table.name}: Composite key FIXED - [${primaryKeys.map((pk: any) => `${pk.name}(${pk.primary_key_order})`).join(', ')}]`);
      } else if (primaryKeys.length === 1) {
        // Single primary key - đảm bảo primary_key_order là null
        const singlePK = primaryKeys[0];
        if (singlePK.primary_key_order != null && singlePK.primary_key_order !== undefined) {
          console.log(
            `🛠️ Table ${table.name}: Converting to single primary key, setting primary_key_order = null`
          );
          singlePK.primary_key_order = null;
        }
      }
    }

    console.log("✅ ULTIMATE composite key fix completed");
    return databaseSchema;
  }

  /**
   * VALIDATION FINAL - Kiểm tra lần cuối trước khi trả về
   */
  private validateAllCompositeKeys(tables: any[]): void {
    console.log("🔍 FINAL VALIDATION: Checking all composite keys...");

    let errorCount = 0;

    for (const table of tables) {
      if (!table?.columns) continue;

      const compositeKeys = table.columns.filter(
        (col) => col.is_primary_key && col.primary_key_order != null
      );

      if (compositeKeys.length > 1) {
        // Kiểm tra orders có hợp lệ không
        const orders = compositeKeys.map((pk) => pk.primary_key_order).sort();
        const expectedOrders = Array.from(
          { length: compositeKeys.length },
          (_, i) => i + 1
        );

        if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
          console.error(
            `❌ CRITICAL: Table ${table.name} still has invalid composite key order after all fixes!`
          );
          console.error(`   Current orders: [${orders.join(", ")}]`);
          console.error(`   Expected orders: [${expectedOrders.join(", ")}]`);
          errorCount++;

          // EMERGENCY FIX - Reset hoàn toàn
          console.log(
            `   🚨 EMERGENCY FIX: Resetting all orders for table ${table.name}`
          );
          compositeKeys.forEach((pk, index) => {
            pk.primary_key_order = index + 1;
          });
        } else {
          console.log(
            `   ✅ Table ${table.name}: Composite key VALID - [${compositeKeys
              .map((pk) => `${pk.name}(${pk.primary_key_order})`)
              .join(", ")}]`
          );
        }
      }
    }

    if (errorCount > 0) {
      console.error(
        `🚨 FINAL VALIDATION: Found ${errorCount} tables with composite key errors (EMERGENCY FIXED)`
      );
    } else {
      console.log("🎉 FINAL VALIDATION: All composite keys are VALID!");
    }
  }

  /**
   * Tự động suy luận relationships từ các bảng
   */
  private inferRelationships(tables: any[]): any[] {
    const relationships: any[] = [];
    const tableMap = new Map(tables.map((t) => [t.name, t]));

    for (const table of tables) {
      if (!table.columns || !Array.isArray(table.columns)) continue;

      for (const column of table.columns) {
        // Nếu là foreign key và có references
        if (column.is_foreign_key && column.references) {
          const referencedTable = tableMap.get(column.references);
          if (referencedTable) {
            relationships.push({
              from_table: table.name,
              to_table: column.references,
              type: "many-to-one",
            });
          }
        }
        // Tự động phát hiện foreign key bằng naming convention
        else if (column.name.endsWith("_id") && column.name !== "id") {
          const potentialTable = column.name.replace(/_id$/, "");
          if (tableMap.has(potentialTable)) {
            relationships.push({
              from_table: table.name,
              to_table: potentialTable,
              type: "many-to-one",
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
   * Generate schema với chunking - chia requirements thành nhiều batch
   */
  private async generateDatabaseSchemaWithChunking(
    requirements: any[],
    language: string,
    userId?: string,
    projectId?: string
  ): Promise<any> {
    console.log(
      `🔀 Splitting ${requirements.length} requirements into chunks for database generation`
    );

    const chunks: any[][] = [];
    for (let i = 0; i < requirements.length; i += this.DB_GEN_BATCH_SIZE) {
      chunks.push(requirements.slice(i, i + this.DB_GEN_BATCH_SIZE));
    }

    console.log(`📦 Created ${chunks.length} chunks for processing`);

    const allSchemas: any[] = [];

    const chunkErrors: string[] = [];

    // Xử lý từng batch tuần tự để tránh rate limit
    for (let i = 0; i < chunks.length; i++) {
      try {
        console.log(`🔄 Processing chunk ${i + 1}/${chunks.length}`);
        const schema = await this.generateDatabaseSchemaBatch(
          chunks[i],
          language,
          userId,
          projectId
        );
        allSchemas.push(schema);
        console.log(`✅ Completed chunk ${i + 1}/${chunks.length}`);

        // Thêm delay nhỏ giữa các batch để tránh rate limit
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        const errorMsg = error.message || `Failed to generate chunk ${i + 1}`;
        console.error(`❌ Failed chunk ${i + 1}:`, errorMsg);
        chunkErrors.push(`Chunk ${i + 1}/${chunks.length}: ${errorMsg}`);
        // Tiếp tục với các chunk khác thay vì dừng hoàn toàn
      }
    }

    // ✅ Nếu tất cả chunks đều fail, throw error với chi tiết
    if (allSchemas.length === 0) {
      const errorMsg = chunkErrors.length > 0
        ? `All database schema generation chunks failed. Errors: ${chunkErrors.join('; ')}`
        : "All database schema generation chunks failed";
      throw new Error(errorMsg);
    }

    // ✅ Nếu có một số chunks fail, log warning nhưng vẫn tiếp tục merge
    if (chunkErrors.length > 0) {
      console.warn(`⚠️ Some chunks failed (${chunkErrors.length}/${chunks.length}), but continuing with successful chunks. Errors:`, chunkErrors);
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
      relationships: [] as any[],
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
            const existingColumns = new Map(
              existingTable.columns.map((col: any) => [col.name, col])
            );

            for (const column of table.columns) {
              if (!existingColumns.has(column.name)) {
                existingTable.columns.push(column);
                existingColumns.set(column.name, column);
              } else {
                // Merge related_usecase_ids nếu column đã tồn tại
                const existingColumn = existingColumns.get(column.name) as any;
                if (
                  column.related_usecase_ids &&
                  Array.isArray(column.related_usecase_ids)
                ) {
                  const existingIds = new Set(
                    existingColumn.related_usecase_ids || []
                  );
                  column.related_usecase_ids.forEach((id: string) =>
                    existingIds.add(id)
                  );
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

    console.log(
      `✅ Merged result: ${mergedSchema.tables.length} tables, ${mergedSchema.relationships.length} relationships`
    );

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

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{" || char === "[") balance++;
        if (char === "}" || char === "]") balance--;
      }
    }

    // Đóng tất cả các mở ngoặc còn thiếu
    let repaired = jsonStr;
    while (balance > 0) {
      if (repaired.trim().endsWith(",")) {
        repaired = repaired.slice(0, -1); // Remove trailing comma
      }
      repaired += "}";
      balance--;
    }

    // Đảm bảo kết thúc đúng
    if (repaired.startsWith("[") && !repaired.endsWith("]")) {
      repaired += "]";
    } else if (repaired.startsWith("{") && !repaired.endsWith("}")) {
      repaired += "}";
    }

    return repaired;
  }

  /**
   * Duyệt qua schema từ Gemini và tách các loại dữ liệu có độ dài (vd: VARCHAR(255))
   * thành hai trường riêng biệt: `type` và `length`.
   * ĐỒNG THỜI đảm bảo mỗi bảng chỉ có một primary key duy nhất.
   */
  private _parseColumnTypesAndLengths(databaseSchema: any): any {
    const typeRegex = /(\w+)\s*\(([\d,\s]+)\)/;

    if (!databaseSchema?.tables || !Array.isArray(databaseSchema.tables)) {
      return databaseSchema;
    }

    console.log(
      `🔧 Processing ${databaseSchema.tables.length} tables for type parsing and key validation`
    );

    for (const table of databaseSchema.tables) {
      if (!table?.columns || !Array.isArray(table.columns)) {
        console.warn(`⚠️ Table ${table.name} has no columns array, skipping`);
        continue;
      }

      console.log(
        `📋 Processing table: ${table.name} with ${table.columns.length} columns`
      );

      // === XỬ LÝ TYPE VÀ LENGTH TRƯỚC ===
      for (const column of table.columns) {
        // 1. Xử lý type và length
        if (typeof column.type === "string") {
          const match = column.type.match(typeRegex);
          if (match) {
            column.type = match[1].toUpperCase();
            column.length = match[2].replace(/\s/g, "");
          } else {
            column.length = null;
          }
        }

        // 2. Đảm bảo các trường bắt buộc có giá trị mặc định
        if (column.nullable === undefined) column.nullable = true;
        if (column.unique === undefined) column.unique = false;
        if (column.is_primary_key === undefined) column.is_primary_key = false;
        if (column.is_foreign_key === undefined) column.is_foreign_key = false;
        if (
          !column.related_usecase_ids ||
          !Array.isArray(column.related_usecase_ids)
        ) {
          column.related_usecase_ids = [];
        }
      }

      // === XỬ LÝ PRIMARY KEYS - FIX TRIỆT ĐỂ LỖI COMPOSITE KEY ===
      const primaryKeys = table.columns.filter(
        (col) => col.is_primary_key === true
      );

      if (primaryKeys.length === 0) {
        // TRƯỜNG HỢP 1: Không có primary key
        console.warn(
          `⚠️ Table ${table.name} has no primary key. Adding auto-increment 'id' column.`
        );
        table.columns.unshift({
          name: "id",
          type: "INT",
          length: null,
          is_primary_key: true,
          is_foreign_key: false,
          nullable: false,
          unique: true,
          references: null,
          primary_key_order: null, // SINGLE KEY = null
          related_usecase_ids: [],
        });
      } else if (primaryKeys.length === 1) {
        // TRƯỜNG HỢP 2: Single primary key
        const singlePK = primaryKeys[0];
        // ĐẢM BẢO: Single key phải có primary_key_order = null
        singlePK.primary_key_order = null;
        singlePK.nullable = false; // Primary key không thể null
        console.log(
          `✅ Table ${table.name} has single primary key: ${singlePK.name}`
        );
      } else {
        // TRƯỜNG HỢP 3: Composite primary key - FIX LỖI CHÍNH
        console.log(
          `🔑 Table ${table.name} uses COMPOSITE KEY with ${primaryKeys.length} columns`
        );

        // 🔴 FIX TRIỆT ĐỂ: ĐẢM BẢO MỌI COMPOSITE KEY ĐỀU CÓ primary_key_order
        let needsOrderFix = false;

        // Kiểm tra và gán primary_key_order cho tất cả composite keys
        primaryKeys.forEach((pk, index) => {
          if (pk.primary_key_order == null) {
            console.warn(
              `   ↳ Missing primary_key_order for: ${pk.name}, assigning: ${index + 1
              }`
            );
            pk.primary_key_order = index + 1;
            needsOrderFix = true;
          }
          // Đảm bảo primary key không thể null
          pk.nullable = false;
        });

        if (needsOrderFix) {
          console.log(
            `✅ Fixed missing primary_key_order for table ${table.name}`
          );
        }

        // VALIDATE: Đảm bảo orders là duy nhất và liên tục từ 1->N
        const orders = primaryKeys
          .map((pk) => pk.primary_key_order)
          .sort((a, b) => a - b);
        const expectedOrders = Array.from(
          { length: primaryKeys.length },
          (_, i) => i + 1
        );

        if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
          console.warn(
            `🔄 Table ${table.name}: Reordering non-sequential primary_key_order`
          );

          // Sắp xếp primary keys và gán order mới
          primaryKeys.sort((a, b) => {
            // Sắp xếp theo thứ tự xuất hiện trong bảng hoặc theo name
            const indexA = table.columns.indexOf(a);
            const indexB = table.columns.indexOf(b);
            return indexA - indexB;
          });

          // Gán order tuần tự
          primaryKeys.forEach((pk, index) => {
            pk.primary_key_order = index + 1;
          });
        }

        console.log(
          `✅ Table ${table.name} composite key: ${primaryKeys
            .map((pk) => `${pk.name}(${pk.primary_key_order})`)
            .join(", ")}`
        );
      }

      // === VALIDATION FINAL - ĐẢM BẢO KHÔNG CÓ LỖI ===
      const finalPrimaryKeys = table.columns.filter(
        (col) => col.is_primary_key
      );
      const compositeKeys = finalPrimaryKeys.filter(
        (pk) => pk.primary_key_order != null
      );

      if (compositeKeys.length > 1) {
        // FINAL CHECK: Đảm bảo tất cả composite keys có order hợp lệ
        const invalidKeys = compositeKeys.filter(
          (pk) =>
            pk.primary_key_order == null ||
            pk.primary_key_order < 1 ||
            pk.primary_key_order > compositeKeys.length
        );

        if (invalidKeys.length > 0) {
          console.error(
            `❌ CRITICAL: Table ${table.name} has invalid composite keys after processing. Emergency fix!`
          );

          // EMERGENCY FIX: Reset hoàn toàn
          compositeKeys.forEach((pk, index) => {
            pk.primary_key_order = index + 1;
          });
        }

        console.log(
          `🎯 Final validation: Table ${table.name} composite keys OK`
        );
      }

      // === THÊM CÁC CỘT SYSTEM MẶC ĐỊNH ===
      this.addSystemColumns(table);
    }

    console.log(
      `✅ Completed processing all tables for type parsing and key validation`
    );
    return databaseSchema;
  }

  /**
   * Thêm các cột system mặc định cho mỗi bảng
   */
  private addSystemColumns(table: any): void {
    const systemColumns = [];
    const existingColumns = new Set(table.columns.map((col) => col.name));

    // 1. created_at và updated_at cho audit trail
    if (!existingColumns.has("created_at")) {
      systemColumns.push({
        name: "created_at",
        type: "DATETIME",
        length: null,
        is_primary_key: false,
        is_foreign_key: false,
        nullable: false,
        unique: false,
        references: null,
        primary_key_order: null,
        related_usecase_ids: [],
        default: "CURRENT_TIMESTAMP",
      });
    }

    if (!existingColumns.has("updated_at")) {
      systemColumns.push({
        name: "updated_at",
        type: "DATETIME",
        length: null,
        is_primary_key: false,
        is_foreign_key: false,
        nullable: true,
        unique: false,
        references: null,
        primary_key_order: null,
        related_usecase_ids: [],
        default: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
      });
    }

    // 2. deleted_at cho soft delete (chỉ thêm nếu phù hợp)
    const isJunctionTable =
      table.name.includes("_") &&
      table.columns.some((col) => col.is_foreign_key && col.references);

    if (!isJunctionTable && !existingColumns.has("deleted_at")) {
      systemColumns.push({
        name: "deleted_at",
        type: "DATETIME",
        length: null,
        is_primary_key: false,
        is_foreign_key: false,
        nullable: true,
        unique: false,
        references: null,
        primary_key_order: null,
        related_usecase_ids: [],
      });
    }

    // Thêm system columns vào bảng
    if (systemColumns.length > 0) {
      table.columns.push(...systemColumns);
      console.log(
        `⚙️ Added ${systemColumns.length} system columns to table ${table.name}`
      );
    }
  }

  /**
   * Hàm utility để validate và fix nhanh trước khi trả về
   */
  private ensureCompositeKeyOrderFinalCheck(databaseSchema: any): any {
    if (!databaseSchema?.tables) return databaseSchema;

    for (const table of databaseSchema.tables) {
      if (!table?.columns) continue;

      const compositeKeys = table.columns.filter(
        (col) => col.is_primary_key && col.primary_key_order != null
      );

      if (compositeKeys.length > 1) {
        // FINAL GUARANTEE: Đảm bảo order hợp lệ
        let order = 1;
        for (const pk of compositeKeys) {
          if (pk.primary_key_order !== order) {
            console.log(
              `🔧 FINAL FIX: Setting primary_key_order for ${table.name}.${pk.name} to ${order}`
            );
            pk.primary_key_order = order;
          }
          order++;
        }
      }
    }

    return databaseSchema;
  }

  /**
   * Một hàm chung để gửi prompt tới Gemini và trả về kết quả dạng chuỗi JSON đã được làm sạch.
   */
  private async generateJsonContent(prompt: string, userId?: string, projectId?: string): Promise<string> {
    // ✅ Sử dụng LLMService để lấy recommended model (ưu tiên model user đã chọn)
    const modelName = await this.llmService.getRecommendedModel(undefined, userId);

    try {
      console.log(`🔑 Calling LLM for database content with model: ${modelName}`);

      const response = await this.llmService.callLLM({
        prompt: prompt,
        modelName: modelName,
        userId: userId,
        projectId: projectId,
        endpoint: 'generateDatabase',
        isProductionFreeMode: true
      });

      const text: string = response.text || "";

      // Trả về ngay sau khi thành công
      return this.cleanJsonStringDatabase(text);
    } catch (err: any) {
      console.error(`❌ LLM call failed during database content generation:`, err?.message || err);
      throw err;
    }
  }

  /**
   * Clean JSON string specifically for database responses
   */
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
      /```(?:json)?\s*([\s\S]*?)\s*```/g, // ```json ... ```
      /`{3,}\s*([\s\S]*?)\s*`{3,}/g, // ``` ... ``` (không có json)
      /`([^`]+)`/g, // `inline code`
    ];

    for (const pattern of codeBlockPatterns) {
      const matches = cleanedText.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Lấy nội dung bên trong code block
          let content = match
            .replace(/```(?:json)?\s*/g, "")
            .replace(/```\s*$/g, "")
            .replace(/`/g, "")
            .trim();

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
      /\{[\s\S]*\}/, // Tìm object
      /\[[\s\S]*\]/, // Tìm array
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
      cleanedText.indexOf("{"),
      cleanedText.indexOf("[")
    );

    if (jsonStart > 0) {
      cleanedText = cleanedText.substring(jsonStart);
    }

    // Tìm vị trí kết thúc của } hoặc ] cân bằng
    let balance = 0;
    let endPosition = -1;

    for (let i = 0; i < cleanedText.length; i++) {
      const char = cleanedText[i];
      if (char === "{" || char === "[") balance++;
      if (char === "}" || char === "]") balance--;

      if (balance === 0 && i > 0) {
        endPosition = i;
        break;
      }
    }

    if (endPosition !== -1) {
      cleanedText = cleanedText.substring(0, endPosition + 1);
    }

    // Trường hợp 5: Loại bỏ các chú thích, giải thích thừa
    const lines = cleanedText.split("\n").filter((line) => {
      // Loại bỏ các dòng chỉ chứa từ khóa giải thích
      const cleanLine = line.trim();
      return (
        !cleanLine.match(/^(Đây là|Here is|Output:|Kết quả:|JSON:|===|---)/i) &&
        !cleanLine.match(/^[#*-]{3,}/) && // Headers, separators
        !cleanLine.match(/^(Ví dụ|Example):/i)
      );
    });

    cleanedText = lines.join("\n").trim();

    // Cuối cùng, thử parse lại để đảm bảo tính hợp lệ
    try {
      JSON.parse(cleanedText);
      return cleanedText;
    } catch (error) {
      console.warn("⚠️ Could not extract valid JSON from response:", {
        originalLength: text?.length,
        cleanedLength: cleanedText?.length,
        preview: cleanedText.substring(0, 200),
      });

      // Fallback: trả về text gốc đã được làm sạch cơ bản
      return text.replace(/```(?:json)?\s*|```/g, "").trim();
    }
  }
}
