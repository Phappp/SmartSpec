// src/features/database/domain/service.ts

import DatabaseModel from "../../../../../internal/model/database";
import VersionModel from "../../../../../internal/model/version";
import { DatabaseGeminiService } from "../domain/GeminiService";

interface GenerateDatabasePayload {
  versionId: string;
  projectId: string;
  requirements: any[];
}

interface TablePositionUpdate {
  tableName: string;
  position: { x: number; y: number };
}

export class DatabaseService {
  private geminiService: DatabaseGeminiService;

  constructor() {
    this.geminiService = new DatabaseGeminiService();
  }

  /**
   * VALIDATION: Kiểm tra ràng buộc SQL khi xóa/update table
   */
  private async validateTableModification(
    databaseId: string,
    tableName: string,
    action: "delete" | "update"
  ) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");

    const table = database.tables.find((t) => t.name === tableName);
    if (!table) throw new Error("Table not found");

    // Kiểm tra nếu có bảng khác đang reference đến table này (FOREIGN KEY constraints)
    if (action === "delete") {
      const referencingTables = database.tables.filter((t) =>
        t.columns.some(
          (col) => col.is_foreign_key && col.references === tableName
        )
      );

      if (referencingTables.length > 0) {
        const referencingTableNames = referencingTables.map((t) => t.name);
        throw new Error(
          `Cannot delete table '${tableName}' because it is referenced by: ${referencingTableNames.join(
            ", "
          )}. ` + `Please remove the foreign key constraints first.`
        );
      }
    }

    if (action === "update") {
      // Kiểm tra nếu có FK đang reference đến bảng này
      const referencingTables = database.tables.filter((t) =>
        t.columns.some(
          (col) => col.is_foreign_key && col.references === tableName
        )
      );

      if (referencingTables.length > 0) {
        console.warn(
          `⚠️ Table '${tableName}' is referenced by ${referencingTables.length} tables. PK changes may require FK updates.`
        );
      }
    }

    // Kiểm tra PRIMARY KEY constraints - UPDATED FOR COMPOSITE KEY
    const primaryKeys = table.columns.filter((col) => col.is_primary_key);
    if (primaryKeys.length === 0) {
      throw new Error(
        `Table '${tableName}' must have at least one primary key`
      );
    }

    // Kiểm tra composite key constraints
    if (primaryKeys.length > 1) {
      const invalidPrimaryKeys = primaryKeys.filter((pk) => pk.nullable);
      if (invalidPrimaryKeys.length > 0) {
        throw new Error(
          `Composite primary key columns cannot be nullable: ` +
            `${invalidPrimaryKeys.map((pk) => pk.name).join(", ")}`
        );
      }

      // Kiểm tra primary_key_order
      const orders = primaryKeys
        .map((pk) => pk.primary_key_order)
        .filter((order) => order !== null && order !== undefined);
      const uniqueOrders = Array.from(new Set(orders));
      if (uniqueOrders.length !== primaryKeys.length) {
        throw new Error(
          `Composite primary key must have unique primary_key_order values`
        );
      }
    }

    return { database, table, primaryKeys };
  }
  /**
   * VALIDATION: Kiểm tra tính hợp lệ của FOREIGN KEY
   */
  public async validateForeignKeyConstraint(
    databaseId: string,
    tableName: string,
    columnName: string,
    referencedTable: string,
    columnType: string
  ) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");

    // 1. Kiểm tra referenced table có tồn tại
    const targetTable = database.tables.find((t) => t.name === referencedTable);
    if (!targetTable) {
      throw new Error(`Referenced table '${referencedTable}' does not exist`);
    }

    // 2. Kiểm tra referenced table có PRIMARY KEY (single hoặc composite)
    const targetPrimaryKeys = targetTable.columns.filter(
      (col) => col.is_primary_key
    );
    if (targetPrimaryKeys.length === 0) {
      throw new Error(
        `Referenced table '${referencedTable}' has no primary key`
      );
    }

    // 3. Kiểm tra kiểu dữ liệu phải khớp với PRIMARY KEY của bảng được reference
    const matchingPrimaryKey = targetPrimaryKeys.find(
      (pk) => columnType === pk.type
    );

    if (!matchingPrimaryKey) {
      throw new Error(
        `Foreign key type mismatch: Column '${columnName}' (${columnType}) must match ` +
          `one of the primary key types in '${referencedTable}' ` +
          `[${targetPrimaryKeys.map((pk) => pk.type).join(", ")}]`
      );
    }

    // 4. Kiểm tra length/precision nếu có
    if (columnType === "DECIMAL" || matchingPrimaryKey.type === "DECIMAL") {
      const column = database.tables
        .find((t) => t.name === tableName)
        ?.columns.find((c) => c.name === columnName);

      if (column?.length !== matchingPrimaryKey.length) {
        console.warn(
          `DECIMAL precision/scale mismatch between foreign key and referenced primary key`
        );
      }
    }

    // 5. Kiểm tra circular reference
    if (tableName === referencedTable) {
      throw new Error(
        `Circular reference detected: Table '${tableName}' cannot reference itself`
      );
    }

    // 6. Cảnh báo đặc biệt cho composite key references
    if (targetPrimaryKeys.length > 1) {
      console.warn(
        `⚠️ Referenced table '${referencedTable}' has composite primary key. ` +
          `Ensure foreign key relationships are properly defined for all key columns.`
      );
    }

    return { targetTable, targetPrimaryKeys, matchingPrimaryKey };
  }
  /**
   * VALIDATION: Kiểm tra tính duy nhất của tên bảng và cột
   */
  private validateTableStructure(tableData: any) {
    // Kiểm tra tên bảng hợp lệ
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableData.name)) {
      throw new Error(
        `Invalid table name: '${tableData.name}'. Must start with letter or underscore and contain only alphanumeric characters and underscores.`
      );
    }

    // Kiểm tra độ dài tên bảng
    if (tableData.name.length > 64) {
      throw new Error(
        `Table name '${tableData.name}' exceeds 64 character limit`
      );
    }

    // Kiểm tra trùng tên cột trong cùng bảng
    const columnNames = tableData.columns.map((col: any) =>
      col.name.toLowerCase()
    );
    const duplicateColumns = columnNames.filter(
      (name: string, index: number) => columnNames.indexOf(name) !== index
    );

    if (duplicateColumns.length > 0) {
      throw new Error(
        `Duplicate column names found: ${Array.from(
          new Set(duplicateColumns)
        ).join(", ")}`
      );
    }

    // Kiểm tra mỗi bảng phải có ít nhất một cột
    if (!tableData.columns || tableData.columns.length === 0) {
      throw new Error("Table must have at least one column");
    }

    // VALIDATION PRIMARY KEY - UPDATED FOR COMPOSITE KEY
    const primaryKeyColumns = tableData.columns.filter(
      (col: any) => col.is_primary_key
    );

    // Kiểm tra có ít nhất một primary key
    if (primaryKeyColumns.length === 0) {
      throw new Error("Table must have at least one primary key column");
    }

    // Kiểm tra single primary key
    if (primaryKeyColumns.length === 1) {
      const primaryKey = primaryKeyColumns[0];
      if (primaryKey.nullable) {
        throw new Error("Primary key cannot be nullable");
      }
      // Đảm bảo primary_key_order = null cho single key
      primaryKey.primary_key_order = null;
    }

    // Kiểm tra composite primary key
    if (primaryKeyColumns.length > 1) {
      this.validateCompositePrimaryKey(tableData);
    }

    // VALIDATION: Kiểm tra DEFAULT values hợp lệ
    tableData.columns.forEach((column: any) => {
      // Kiểm tra độ dài tên cột
      if (column.name.length > 64) {
        throw new Error(
          `Column name '${column.name}' exceeds 64 character limit`
        );
      }

      // Kiểm tra tên cột trùng với SQL keywords
      const sqlKeywords = [
        "select",
        "insert",
        "update",
        "delete",
        "where",
        "group",
        "order",
        "table",
      ];
      if (sqlKeywords.includes(column.name.toLowerCase())) {
        console.warn(
          `⚠️ Column name '${column.name}' is a SQL keyword - may cause issues in queries`
        );
      }

      // Kiểm tra DEFAULT values
      if (column.default) {
        // Kiểm tra DEFAULT không thể dùng với AUTO_INCREMENT
        if (
          column.is_primary_key &&
          column.default.toLowerCase().includes("auto_increment")
        ) {
          throw new Error(
            `Column '${column.name}' cannot have both DEFAULT and AUTO_INCREMENT`
          );
        }

        // Kiểm tra DEFAULT với kiểu dữ liệu
        if (
          column.type.includes("INT") &&
          !this.isValidNumericDefault(column.default)
        ) {
          throw new Error(
            `Invalid DEFAULT value '${column.default}' for numeric column '${column.name}'`
          );
        }

        if (
          (column.type === "BOOLEAN" || column.type === "TINYINT(1)") &&
          !["true", "false", "1", "0", "null"].includes(
            column.default.toLowerCase()
          )
        ) {
          throw new Error(
            `Invalid DEFAULT value '${column.default}' for boolean column '${column.name}'`
          );
        }
      }

      // Kiểm tra FOREIGN KEY constraints
      if (column.is_foreign_key) {
        if (!column.references) {
          throw new Error(
            `Foreign key column '${column.name}' must reference a table`
          );
        }
        if (column.nullable === false && !column.default) {
          console.warn(
            `Foreign key column '${column.name}' is NOT NULL but has no default value`
          );
        }
      }

      // Kiểm tra UNIQUE constraint
      if (column.unique && column.nullable) {
        console.warn(
          `UNIQUE constraint on nullable column '${column.name}' may behave differently across databases`
        );
      }

      // Kiểm tra kiểu dữ liệu và length
      if (column.length) {
        if (
          ["TEXT", "LONGTEXT", "BLOB", "LONGBLOB"].includes(column.type) &&
          column.length
        ) {
          throw new Error(
            `Data type '${column.type}' cannot have length specification`
          );
        }

        if (["INT", "BIGINT", "SMALLINT", "TINYINT"].includes(column.type)) {
          const length = parseInt(column.length);
          if (length && (length < 1 || length > 255)) {
            throw new Error(
              `Invalid length ${column.length} for integer type '${column.type}'`
            );
          }
        }

        if (column.type === "VARCHAR" || column.type === "CHAR") {
          const length = parseInt(column.length);
          if (!length || length < 1 || length > 65535) {
            throw new Error(
              `Invalid length ${column.length} for string type '${column.type}'`
            );
          }
        }

        // Kiểm tra DECIMAL precision/scale
        if (column.type === "DECIMAL" && column.length) {
          const parts = column.length.split(",");
          if (parts.length !== 2) {
            throw new Error(`DECIMAL requires format 'precision,scale'`);
          }
          const precision = parseInt(parts[0]);
          const scale = parseInt(parts[1]);
          if (
            precision < 1 ||
            precision > 65 ||
            scale < 0 ||
            scale > 30 ||
            scale > precision
          ) {
            throw new Error(`Invalid DECIMAL specification: ${column.length}`);
          }
        }
      }

      // Khuyến nghị naming convention
      if (
        column.is_primary_key &&
        !column.name.toLowerCase().endsWith("_id") &&
        column.name.toLowerCase() !== "id" &&
        primaryKeyColumns.length === 1
      ) {
        console.warn(
          `💡 Consider naming primary key as 'id' or ending with '_id': ${column.name}`
        );
      }

      if (column.is_foreign_key && !column.name.toLowerCase().endsWith("_id")) {
        console.warn(
          `💡 Foreign key columns should typically end with '_id': ${column.name}`
        );
      }
    });

    // VALIDATION: Cảnh báo performance
    const indexedColumns = tableData.columns.filter(
      (col: any) => col.is_primary_key || col.unique || col.is_foreign_key
    );

    if (indexedColumns.length > 10) {
      console.warn(
        `⚠️ Table '${tableData.name}' has ${indexedColumns.length} indexed columns - consider performance impact`
      );
    }

    // Cảnh báo về large text/BLOB columns
    const largeColumns = tableData.columns.filter((col: any) =>
      ["TEXT", "LONGTEXT", "BLOB", "LONGBLOB"].includes(col.type)
    );

    if (largeColumns.length > 3) {
      console.warn(
        `⚠️ Table '${tableData.name}' has ${largeColumns.length} large object columns - consider normalization`
      );
    }

    // VALIDATION: Logic nghiệp vụ cơ bản
    const hasTimestamps = tableData.columns.some((col: any) =>
      ["created_at", "updated_at"].includes(col.name.toLowerCase())
    );

    if (!hasTimestamps) {
      console.warn(
        `💡 Consider adding 'created_at' and 'updated_at' timestamp columns for audit trail`
      );
    }

    // Khuyến nghị soft delete
    const hasSoftDelete = tableData.columns.some(
      (col: any) => col.name.toLowerCase() === "deleted_at"
    );

    if (!hasSoftDelete) {
      console.warn(
        `💡 Consider adding 'deleted_at' column for soft delete functionality`
      );
    }
  }
  /**
   * VALIDATION: Kiểm tra composite primary key - NEW METHOD
   */
  private validateCompositePrimaryKey(tableData: any) {
    const primaryKeyColumns = tableData.columns.filter(
      (col: any) => col.is_primary_key
    );

    console.log(
      `🔑 Composite primary key detected with ${primaryKeyColumns.length} columns`
    );

    // 1. Kiểm tra tất cả primary key columns phải có primary_key_order
    const columnsWithoutOrder = primaryKeyColumns.filter(
      (col: any) =>
        col.primary_key_order === null || col.primary_key_order === undefined
    );

    if (columnsWithoutOrder.length > 0) {
      throw new Error(
        `Composite primary key columns must have primary_key_order: ` +
          `${columnsWithoutOrder.map((col: any) => col.name).join(", ")}`
      );
    }

    // 2. Kiểm tra primary_key_order là duy nhất và liên tục
    const orders = primaryKeyColumns
      .map((col: any) => col.primary_key_order)
      .sort((a: number, b: number) => a - b);

    const uniqueOrders = Array.from(new Set(orders));
    if (uniqueOrders.length !== orders.length) {
      throw new Error("Duplicate primary_key_order values in composite key");
    }

    // 3. Kiểm tra orders bắt đầu từ 1 và liên tục
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        throw new Error(
          `Composite key orders must start from 1 and be consecutive. ` +
            `Found: ${orders.join(", ")}`
        );
      }
    }

    // 4. Kiểm tra không có primary key nào là nullable
    const nullablePrimaryKeys = primaryKeyColumns.filter(
      (col: any) => col.nullable
    );
    if (nullablePrimaryKeys.length > 0) {
      throw new Error(
        `Primary key columns cannot be nullable: ` +
          `${nullablePrimaryKeys.map((col: any) => col.name).join(", ")}`
      );
    }

    // 5. Cảnh báo về performance
    console.warn(
      `⚠️ Composite primary key may impact performance. Consider using surrogate key.`
    );

    // 6. Kiểm tra tên cột không trùng
    const columnNames = primaryKeyColumns.map((col) => col.name.toLowerCase());
    const duplicateNames = columnNames.filter(
      (name, index) => columnNames.indexOf(name) !== index
    );
    if (duplicateNames.length > 0) {
      throw new Error(
        `Duplicate column names in composite key: ${duplicateNames.join(", ")}`
      );
    }
  }

  private isValidNumericDefault(value: string): boolean {
    if (value.toLowerCase() === "null") return true;
    return (
      !isNaN(Number(value)) ||
      ["current_timestamp", "now()"].includes(value.toLowerCase())
    );
  }
  /**
   * TỰ ĐỘNG ĐỒNG BỘ KIỂU DỮ LIỆU KHI PK THAY ĐỔI
   */
  private async syncForeignKeyTypesForPKChanges(
    databaseId: string,
    tableName: string,
    oldTable: any,
    newTable: any
  ) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) return;

    // Lấy tất cả primary keys (có thể là single hoặc composite)
    const oldPKs = oldTable.columns.filter((col: any) => col.is_primary_key);
    const newPKs = newTable.columns.filter((col: any) => col.is_primary_key);

    console.log(`🔄 Primary key structure changed. Updating related FKs...`);
    console.log(
      `   Old PKs: ${oldPKs.map((pk) => `${pk.name}(${pk.type})`).join(", ")}`
    );
    console.log(
      `   New PKs: ${newPKs.map((pk) => `${pk.name}(${pk.type})`).join(", ")}`
    );

    // Tìm tất cả các bảng có FK reference đến bảng này
    const tablesWithReferences = database.tables.filter((table) =>
      table.columns.some(
        (col) => col.is_foreign_key && col.references === tableName
      )
    );

    let updatedCount = 0;

    // Cập nhật từng FK
    for (const referencingTable of tablesWithReferences) {
      for (const column of referencingTable.columns) {
        if (column.is_foreign_key && column.references === tableName) {
          // Tìm primary key tương ứng dựa trên tên cột hoặc type matching
          let correspondingNewPK = newPKs.find(
            (pk) => pk.name.toLowerCase() === column.name.toLowerCase()
          );

          // Nếu không tìm thấy bằng tên, tìm bằng type matching với old PK
          if (!correspondingNewPK) {
            const oldPK = oldPKs.find((pk) => pk.type === column.type);
            if (oldPK) {
              const oldPKIndex = oldPKs.indexOf(oldPK);
              correspondingNewPK = newPKs[oldPKIndex];
            }
          }

          if (correspondingNewPK && correspondingNewPK.type !== column.type) {
            console.log(
              `↪️ Updating FK: ${referencingTable.name}.${column.name} from ${column.type} to ${correspondingNewPK.type}`
            );

            try {
              const updateResult = await DatabaseModel.updateOne(
                {
                  _id: databaseId,
                  "tables.name": referencingTable.name,
                  "tables.columns.name": column.name,
                },
                {
                  $set: {
                    "tables.$.columns.$[col].type": correspondingNewPK.type,
                    "tables.$.columns.$[col].length": correspondingNewPK.length,
                  },
                },
                {
                  arrayFilters: [{ "col.name": column.name }],
                }
              );

              if (updateResult.modifiedCount > 0) {
                updatedCount++;
              }
            } catch (error) {
              console.error(
                `❌ Failed to update FK ${referencingTable.name}.${column.name}:`,
                error
              );
            }
          }
        }
      }
    }

    console.log(
      `✅ Updated ${updatedCount} foreign keys across ${tablesWithReferences.length} tables`
    );
  }

  public async generateSchemaFromRequirements(
    payload: GenerateDatabasePayload
  ) {
    const { versionId, projectId, requirements } = payload;

    if (!requirements || requirements.length === 0) {
      throw new Error("Không có requirements để sinh database.");
    }

    const databaseSchema = await this.geminiService.generateDatabaseSchema(
      requirements,
      "vi-VN"
    );

    // Validate generated schema
    databaseSchema.tables.forEach((table: any) => {
      this.validateTableStructure(table);
    });

    const newDatabase = new DatabaseModel({
      project_id: projectId,
      version_id: versionId,
      name: databaseSchema.name,
      description: databaseSchema.description,
      tables: databaseSchema.tables,
      relationships: databaseSchema.relationships,
    });

    await newDatabase.save();
    return newDatabase;
  }

  public async getDatabasesByVersion(versionId: string) {
    return DatabaseModel.find({ version_id: versionId }).sort({
      createdAt: -1,
    });
  }

  public async getDatabaseById(databaseId: string) {
    return DatabaseModel.findById(databaseId);
  }
  /**
   * Cập nhật Database
   */
  public async updateDatabase(databaseId: string, updateData: any) {
    // Validate foreign key relationships if tables are being updated
    if (updateData.tables) {
      updateData.tables.forEach((table: any) => {
        this.validateTableStructure(table);
      });
    }

    const result = await DatabaseModel.updateOne(
      { _id: databaseId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw new Error("Database not found");
    }

    return await DatabaseModel.findById(databaseId);
  }
  /**
   * Xóa bảng
   */
  public async deleteDatabase(databaseId: string) {
    return DatabaseModel.findByIdAndDelete(databaseId);
  }
  /**
   * [C] Thêm một bảng mới với validation đầy đủ
   */
  public async addTableToDatabase(databaseId: string, tableData: any) {
    // Validate table structure (includes composite key validation)
    this.validateTableStructure(tableData);

    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");

    // Kiểm tra trùng tên bảng
    const existingTable = database.tables.find(
      (t) => t.name.toLowerCase() === tableData.name.toLowerCase()
    );
    if (existingTable) {
      throw new Error(`Table '${tableData.name}' already exists in database`);
    }

    // Validate foreign keys trong table mới
    for (const column of tableData.columns) {
      if (column.is_foreign_key && column.references) {
        await this.validateForeignKeyConstraint(
          databaseId,
          tableData.name,
          column.name,
          column.references,
          column.type
        );
      }
    }

    return DatabaseModel.findByIdAndUpdate(
      databaseId,
      { $push: { tables: tableData } },
      { new: true }
    );
  }
  /**
   * [U] Cập nhật một bảng với validation đầy đủ
   */
  public async updateTableInDatabase(
    databaseId: string,
    tableName: string,
    tableData: any
  ) {
    // Guard: tránh payload nhầm route
    if ((tableName || "").toLowerCase() === "positions") {
      console.warn(
        '[updateTableInDatabase] Received reserved name "positions". Skip update.'
      );
      return await DatabaseModel.findById(databaseId);
    }

    // 1. Validate cơ bản trước
    await this.validateTableModification(databaseId, tableName, "update");

    // 2. Lấy database và table hiện tại để giữ position
    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");
    const existingTable = database.tables.find((t) => t.name === tableName);
    if (!existingTable) throw new Error("Table not found");

    // 3. Giữ nguyên position từ table hiện tại nếu không có position mới
    const updatedTableData = {
      ...tableData,
      position: tableData.position || existingTable.position, // Giữ position cũ nếu không có mới
    };

    // 4. Validate structure với data đã được merge position
    this.validateTableStructure(updatedTableData);

    // 5. Kiểm tra trùng tên bảng TRƯỚC
    if (updatedTableData.name !== tableName) {
      const duplicateTable = database.tables.find(
        (t) =>
          t.name.toLowerCase() === updatedTableData.name.toLowerCase() &&
          t.name !== tableName
      );
      if (duplicateTable) {
        throw new Error(
          `Table '${updatedTableData.name}' already exists in database`
        );
      }
    }

    // 6. Validate foreign keys TRƯỚC
    for (const column of updatedTableData.columns) {
      if (column.is_foreign_key && column.references) {
        await this.validateForeignKeyConstraint(
          databaseId,
          updatedTableData.name, // dùng updatedTableData.name vì có thể đã đổi tên
          column.name,
          column.references,
          column.type
        );
      }
    }

    // 7. Sync FK changes SAU KHI tất cả validation passed
    await this.syncForeignKeyTypesForPKChanges(
      databaseId,
      tableName,
      existingTable,
      updatedTableData
    );

    // 8. Thực hiện update với data đã giữ position
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const normalizedName = (tableName || "").trim();

    const result = await DatabaseModel.updateOne(
      {
        _id: databaseId,
        "tables.name": { $regex: `^${escape(normalizedName)}$`, $options: "i" },
      },
      { $set: { "tables.$": updatedTableData } }
    );

    if (result.matchedCount === 0) {
      console.warn(
        `[updateTableInDatabase] Table not found by name="${tableName}". Skipping update.`
      );
      return await DatabaseModel.findById(databaseId);
    }

    return await DatabaseModel.findById(databaseId);
  }
  /**
   * [D] Xóa một bảng với validation constraints
   */
  public async deleteTableFromDatabase(databaseId: string, tableName: string) {
    // Validate modification constraints
    await this.validateTableModification(databaseId, tableName, "delete");

    return DatabaseModel.findByIdAndUpdate(
      databaseId,
      { $pull: { tables: { name: tableName } } },
      { new: true }
    );
  }
  /**
   * [R] - Lấy database schema với thông tin references đầy đủ
   */
  public async getDatabaseWithReferences(databaseId: string) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");

    // Enrich tables với thông tin references chi tiết
    const enrichedTables = database.tables.map((table) => {
      const tableObj = table.toObject();
      const primaryKeys = tableObj.columns
        .filter((col) => col.is_primary_key)
        .sort(
          (a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0)
        );

      return {
        ...tableObj,
        primaryKeys: primaryKeys,
        isCompositeKey: primaryKeys.length > 1,
        foreignKeys: tableObj.columns
          .filter((col) => col.is_foreign_key && col.references)
          .map((fkCol) => {
            const referencedTable = database.tables.find(
              (t) => t.name === fkCol.references
            );
            const relationship = database.relationships.find(
              (rel) =>
                rel.from_table === table.name &&
                rel.to_table === fkCol.references
            );

            return {
              columnName: fkCol.name,
              referencedTable: fkCol.references,
              referencedTableDetails: referencedTable || null,
              relationship: relationship || null,
              fullReference: {
                column: fkCol.name,
                references: fkCol.references,
                relationshipType: relationship?.type || "unknown",
                referencedColumns:
                  referencedTable?.columns?.filter(
                    (col) => col.is_primary_key
                  ) || [],
              },
            };
          }),
      };
    });

    return {
      ...database.toObject(),
      tables: enrichedTables,
    };
  }
  /**
   * [R] - Lấy thông tin relationships của một bảng cụ thể
   */
  public async getTableRelationships(databaseId: string, tableName: string) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");

    const table = database.tables.find((t) => t.name === tableName);
    if (!table) throw new Error("Table not found");

    // Lấy thông tin primary key (có thể là composite)
    const primaryKeys = table.columns
      .filter((col) => col.is_primary_key)
      .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0));

    // Lấy foreign keys của bảng này
    const foreignKeys = table.columns
      .filter((col) => col.is_foreign_key && col.references)
      .map((fkCol) => {
        const referencedTable = database.tables.find(
          (t) => t.name === fkCol.references
        );
        const relationship = database.relationships.find(
          (rel) =>
            rel.from_table === tableName && rel.to_table === fkCol.references
        );

        return {
          column: fkCol.name,
          references: fkCol.references,
          referencedTable: referencedTable
            ? {
                name: referencedTable.name,
                description: referencedTable.description,
                primaryKeys: referencedTable.columns
                  .filter((col) => col.is_primary_key)
                  .sort(
                    (a, b) =>
                      (a.primary_key_order || 0) - (b.primary_key_order || 0)
                  ),
                isCompositeKey:
                  referencedTable.columns.filter((col) => col.is_primary_key)
                    .length > 1,
              }
            : null,
          relationship: relationship,
          relationshipType: relationship?.type || "foreign_key",
        };
      });

    // Lấy các bảng khác reference đến bảng này
    const referencedBy = database.tables
      .filter((t) => t.name !== tableName)
      .flatMap((t) =>
        t.columns
          .filter((col) => col.is_foreign_key && col.references === tableName)
          .map((col) => ({
            fromTable: t.name,
            fromColumn: col.name,
            relationship: database.relationships.find(
              (rel) => rel.from_table === t.name && rel.to_table === tableName
            ),
          }))
      );

    return {
      table: tableName,
      primaryKeys: primaryKeys,
      isCompositeKey: primaryKeys.length > 1,
      foreignKeys,
      referencedBy,
      allRelationships: database.relationships.filter(
        (rel) => rel.from_table === tableName || rel.to_table === tableName
      ),
    };
  }
  /**
   * [R] - Lấy các bảng có references
   */
  public async getAvailableTablesForReferences(
    databaseId: string,
    excludeTable?: string
  ) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");

    return database.tables
      .filter((table) => !excludeTable || table.name !== excludeTable)
      .map((table) => ({
        name: table.name,
        description: table.description,
        primaryKeys: table.columns.filter((col) => col.is_primary_key),
        columnCount: table.columns.length,
      }));
  }
  /**
   * UTILITY: Lấy thông tin composite key của một bảng - NEW METHOD
   */
  public async getCompositeKeyInfo(databaseId: string, tableName: string) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");

    const table = database.tables.find((t) => t.name === tableName);
    if (!table) throw new Error("Table not found");

    const primaryKeyColumns = table.columns
      .filter((col) => col.is_primary_key)
      .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0));

    return {
      isComposite: primaryKeyColumns.length > 1,
      columns: primaryKeyColumns.map((col) => ({
        name: col.name,
        type: col.type,
        length: col.length,
        primary_key_order: col.primary_key_order,
        is_foreign_key: col.is_foreign_key,
        references: col.references,
      })),
      totalColumns: primaryKeyColumns.length,
    };
  }
  /**
   * UTILITY: Tạo composite key mới - NEW METHOD
   */
  public async createCompositeKey(
    databaseId: string,
    tableName: string,
    columnNames: string[]
  ) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");

    const table = database.tables.find((t) => t.name === tableName);
    if (!table) throw new Error("Table not found");

    if (columnNames.length < 2) {
      throw new Error("Composite key requires at least 2 columns");
    }

    // Kiểm tra các column tồn tại
    const columnsToUpdate = columnNames.map((columnName) => {
      const column = table.columns.find((col) => col.name === columnName);
      if (!column) {
        throw new Error(
          `Column '${columnName}' not found in table '${tableName}'`
        );
      }
      if (column.nullable) {
        throw new Error(
          `Column '${columnName}' cannot be nullable for primary key`
        );
      }
      return column;
    });

    // Tạo updated columns với primary key flags
    const updateOperations = table.columns.map((col) => {
      const isPrimaryKey = columnNames.includes(col.name);
      return {
        ...col.toObject(),
        is_primary_key: isPrimaryKey,
        primary_key_order: isPrimaryKey
          ? columnNames.indexOf(col.name) + 1
          : null,
      };
    });

    // Cập nhật database
    const result = await DatabaseModel.updateOne(
      { _id: databaseId, "tables.name": tableName },
      { $set: { "tables.$.columns": updateOperations } }
    );

    if (result.modifiedCount === 0) {
      throw new Error("Failed to create composite key");
    }

    return await this.getCompositeKeyInfo(databaseId, tableName);
  }
  /**
   * UTILITY: Chuyển từ composite key sang single key - NEW METHOD
   */
  public async convertToSingleKey(
    databaseId: string,
    tableName: string,
    primaryKeyColumnName: string
  ) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");

    const table = database.tables.find((t) => t.name === tableName);
    if (!table) throw new Error("Table not found");

    const targetColumn = table.columns.find(
      (col) => col.name === primaryKeyColumnName
    );
    if (!targetColumn) {
      throw new Error(
        `Column '${primaryKeyColumnName}' not found in table '${tableName}'`
      );
    }

    if (targetColumn.nullable) {
      throw new Error(
        `Primary key column '${primaryKeyColumnName}' cannot be nullable`
      );
    }

    // Tạo updated columns với single primary key
    const updateOperations = table.columns.map((col) => ({
      ...col.toObject(),
      is_primary_key: col.name === primaryKeyColumnName,
      primary_key_order: col.name === primaryKeyColumnName ? null : null,
    }));

    // Cập nhật database
    const result = await DatabaseModel.updateOne(
      { _id: databaseId, "tables.name": tableName },
      { $set: { "tables.$.columns": updateOperations } }
    );

    if (result.modifiedCount === 0) {
      throw new Error("Failed to convert to single key");
    }

    return await this.getCompositeKeyInfo(databaseId, tableName);
  }
  /**
   * Cập nhật vị trí bảng
   */
  public async updateTablePosition(
    databaseId: string,
    tableName: string,
    position: { x: number; y: number }
  ) {
    const result = await DatabaseModel.updateOne(
      { _id: databaseId, "tables.name": tableName },
      {
        $set: {
          "tables.$.position": position,
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("Table not found in database");
    }

    return await DatabaseModel.findById(databaseId);
  }
  /**
   * Cập nhật vị trí nhiều bảng cùng lúc
   */
  public async updateMultipleTablePositions(
    databaseId: string,
    positionUpdates: TablePositionUpdate[]
  ) {
    console.log("✅✅✅ RUNNING THE FIXED AND ROBUST BATCH UPDATE v2 ✅✅✅");

    const database = await DatabaseModel.findById(databaseId);
    if (!database) {
      throw new Error("Database not found");
    }

    console.log(
      "🔍 Database tables:",
      database.tables.map((t) => t.name)
    );
    console.log(
      "📝 Requested updates:",
      positionUpdates.map((u) => u.tableName)
    );

    for (const update of positionUpdates) {
      try {
        const tableExists = database.tables.some(
          (t) => t.name === update.tableName
        );

        if (!tableExists) {
          console.warn(
            `Table "${update.tableName}" not found in database, skipping`
          );
          continue;
        }

        const result = await DatabaseModel.updateOne(
          {
            _id: databaseId,
            "tables.name": update.tableName,
          },
          {
            $set: {
              "tables.$.position": update.position,
            },
          }
        );

        if (result.matchedCount > 0) {
          console.log(`✓ Updated position for: ${update.tableName}`);
        }
      } catch (tableError) {
        console.error(`Error updating table ${update.tableName}:`, tableError);
      }
    }

    return await DatabaseModel.findById(databaseId);
  }
  /**
   * [R] - Lấy thống kê database
   */
  public async getDatabaseStats(databaseId: string) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");

    const stats = {
      tables: database.tables.length,
      relationships: database.relationships.length,
      columns: database.tables.reduce(
        (sum, table) => sum + (table.columns?.length || 0),
        0
      ),
      primaryKeys: database.tables.reduce(
        (sum, table) =>
          sum +
          (table.columns?.filter((col) => col.is_primary_key).length || 0),
        0
      ),
      foreignKeys: database.tables.reduce(
        (sum, table) =>
          sum +
          (table.columns?.filter((col) => col.is_foreign_key).length || 0),
        0
      ),
      indexedColumns: database.tables.reduce(
        (sum, table) =>
          sum + (table.columns?.filter((col) => col.unique).length || 0),
        0
      ),
    };

    return stats;
  }
  /**
   * [U] - Export database schema thành SQL
   */
  public async exportDatabaseSQL(databaseId: string) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) throw new Error("Database not found");

    const sqlStatements = database.tables
      .map((table) => {
        const columns = (table.columns || [])
          .map((col) => {
            let columnDef = `${col.name} ${col.type}`;
            if (col.length) columnDef += `(${col.length})`;
            if (!col.nullable) columnDef += " NOT NULL";
            if (col.unique) columnDef += " UNIQUE";

            // Xử lý primary key (không thêm AUTO_INCREMENT cho composite key)
            if (col.is_primary_key) {
              const isSinglePK =
                table.columns.filter((c) => c.is_primary_key).length === 1;
              columnDef += " PRIMARY KEY";
              if (isSinglePK) columnDef += " AUTO_INCREMENT";
            }

            if (col.default) {
              if (["VARCHAR", "CHAR", "TEXT", "LONGTEXT"].includes(col.type)) {
                const formattedDefault =
                  col.default.startsWith("'") && col.default.endsWith("'")
                    ? col.default
                    : `'${col.default}'`;
                columnDef += ` DEFAULT ${formattedDefault}`;
              } else {
                columnDef += ` DEFAULT ${col.default}`;
              }
            }
            return columnDef;
          })
          .join(",\n  ");

        // Xử lý composite primary key constraint
        const primaryKeyColumns = table.columns.filter(
          (col) => col.is_primary_key
        );
        let compositeKeyConstraint = "";

        if (primaryKeyColumns.length > 1) {
          const pkColumnNames = primaryKeyColumns
            .sort(
              (a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0)
            )
            .map((col) => col.name)
            .join(", ");

          compositeKeyConstraint = `,\n  PRIMARY KEY (${pkColumnNames})`;
        }

        const foreignKeys = (table.columns || [])
          .filter((col) => col.is_foreign_key && col.references)
          .map((col) => {
            // Tìm primary key của bảng được reference
            const referencedTable = database.tables.find(
              (t) => t.name === col.references
            );
            const referencedPK = referencedTable?.columns.find(
              (c) => c.is_primary_key
            );
            const pkColumnName = referencedPK?.name || "id";

            return `FOREIGN KEY (${col.name}) REFERENCES ${col.references}(${pkColumnName})`;
          })
          .join(",\n  ");

        const constraints = [compositeKeyConstraint, foreignKeys]
          .filter(Boolean)
          .join(",\n  ");

        return `CREATE TABLE ${table.name} (\n  ${columns}${
          constraints ? ",\n  " + constraints : ""
        }\n);`;
      })
      .join("\n\n");

    return sqlStatements;
  }
}
