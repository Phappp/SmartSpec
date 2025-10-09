// src/features/database/domain/service.ts

import DatabaseModel from "../../../../../internal/model/database";
import VersionModel from "../../../../../internal/model/version";
import { GeminiService } from "../../../features/orchestrator/domain/GeminiService";

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
    private geminiService: GeminiService;

    constructor() {
        this.geminiService = new GeminiService();
    }

    /**
     * VALIDATION: Kiểm tra ràng buộc SQL khi xóa/update table
     */
    private async validateTableModification(databaseId: string, tableName: string, action: 'delete' | 'update') {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");

        const table = database.tables.find(t => t.name === tableName);
        if (!table) throw new Error("Table not found");

        // Kiểm tra nếu có bảng khác đang reference đến table này (FOREIGN KEY constraints)
        if (action === 'delete') {
            const referencingTables = database.tables.filter(t =>
                t.columns.some(col =>
                    col.is_foreign_key && col.references === tableName
                )
            );

            if (referencingTables.length > 0) {
                const referencingTableNames = referencingTables.map(t => t.name);
                throw new Error(
                    `Cannot delete table '${tableName}' because it is referenced by: ${referencingTableNames.join(', ')}. ` +
                    `Please remove the foreign key constraints first.`
                );
            }
        }

        if (action === 'update') {
            // Ngăn đổi tên cột PK nếu có FK đang reference
            const referencingTables = database.tables.filter(t =>
                t.columns.some(col =>
                    col.is_foreign_key && col.references === tableName
                )
            );

            if (referencingTables.length > 0) {
                console.warn(`⚠️ Table '${tableName}' is referenced by ${referencingTables.length} tables. PK changes will auto-sync.`);
            }
        }

        // Kiểm tra PRIMARY KEY constraints
        const primaryKeys = table.columns.filter(col => col.is_primary_key);
        if (primaryKeys.length === 0 && action === 'update') {
            throw new Error(`Table '${tableName}' must have at least one primary key`);
        }

        if (primaryKeys.length > 1) {
            throw new Error(`Table '${tableName}' has multiple primary keys (composite key). This feature may require special handling.`);
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
        const targetTable = database.tables.find(t => t.name === referencedTable);
        if (!targetTable) {
            throw new Error(`Referenced table '${referencedTable}' does not exist`);
        }

        // 2. Kiểm tra referenced table có PRIMARY KEY
        const targetPrimaryKeys = targetTable.columns.filter(col => col.is_primary_key);
        if (targetPrimaryKeys.length === 0) {
            throw new Error(`Referenced table '${referencedTable}' has no primary key`);
        }

        // 3. Kiểm tra kiểu dữ liệu phải khớp với PRIMARY KEY của bảng được reference
        const targetPrimaryKey = targetPrimaryKeys[0];
        if (columnType !== targetPrimaryKey.type) {
            throw new Error(
                `Foreign key type mismatch: Column '${columnName}' (${columnType}) must match ` +
                `primary key type of '${referencedTable}' (${targetPrimaryKey.type})`
            );
        }

        // 4. Kiểm tra length/precision nếu có
        if (columnType === 'DECIMAL' || targetPrimaryKey.type === 'DECIMAL') {
            // Đảm bảo cả hai đều có length và khớp nhau
            const column = database.tables
                .find(t => t.name === tableName)
                ?.columns.find(c => c.name === columnName);

            if (column?.length !== targetPrimaryKey.length) {
                console.warn(`DECIMAL precision/scale mismatch between foreign key and referenced primary key`);
            }
        }

        // 5. Kiểm tra circular reference (bảng không thể reference chính nó)
        if (tableName === referencedTable) {
            throw new Error(`Circular reference detected: Table '${tableName}' cannot reference itself`);
        }

        return { targetTable, targetPrimaryKey };
    }

    /**
     * VALIDATION: Kiểm tra tính duy nhất của tên bảng và cột
     */
    private validateTableStructure(tableData: any) {
        // Kiểm tra tên bảng hợp lệ
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableData.name)) {
            throw new Error(`Invalid table name: '${tableData.name}'. Must start with letter or underscore and contain only alphanumeric characters and underscores.`);
        }

        // Kiểm tra độ dài tên bảng
        if (tableData.name.length > 64) {
            throw new Error(`Table name '${tableData.name}' exceeds 64 character limit`);
        }

        // Kiểm tra trùng tên cột trong cùng bảng
        const columnNames = tableData.columns.map((col: any) => col.name.toLowerCase());
        const duplicateColumns = columnNames.filter((name: string, index: number) =>
            columnNames.indexOf(name) !== index
        );

        if (duplicateColumns.length > 0) {
            throw new Error(`Duplicate column names found: ${Array.from(new Set(duplicateColumns)).join(', ')}`);
        }

        // Kiểm tra mỗi bảng phải có ít nhất một cột
        if (!tableData.columns || tableData.columns.length === 0) {
            throw new Error("Table must have at least one column");
        }

        // Kiểm tra chỉ có một PRIMARY KEY
        const primaryKeyCount = tableData.columns.filter((col: any) => col.is_primary_key).length;
        if (primaryKeyCount > 1) {
            throw new Error("Table can only have one primary key (composite keys not supported)");
        }

        // Kiểm tra PRIMARY KEY không thể nullable
        const primaryKey = tableData.columns.find((col: any) => col.is_primary_key);
        if (primaryKey && primaryKey.nullable) {
            throw new Error("Primary key cannot be nullable");
        }

        // VALIDATION: Kiểm tra DEFAULT values hợp lệ
        tableData.columns.forEach((column: any) => {
            // Kiểm tra độ dài tên cột
            if (column.name.length > 64) {
                throw new Error(`Column name '${column.name}' exceeds 64 character limit`);
            }

            // Kiểm tra tên cột trùng với SQL keywords
            const sqlKeywords = ['select', 'insert', 'update', 'delete', 'where', 'group', 'order', 'table'];
            if (sqlKeywords.includes(column.name.toLowerCase())) {
                console.warn(`⚠️ Column name '${column.name}' is a SQL keyword - may cause issues in queries`);
            }

            // Kiểm tra DEFAULT values
            if (column.default) {
                // Kiểm tra DEFAULT không thể dùng với AUTO_INCREMENT
                if (column.is_primary_key && column.default.toLowerCase().includes('auto_increment')) {
                    throw new Error(`Column '${column.name}' cannot have both DEFAULT and AUTO_INCREMENT`);
                }

                // Kiểm tra DEFAULT với kiểu dữ liệu
                if (column.type.includes('INT') && !this.isValidNumericDefault(column.default)) {
                    throw new Error(`Invalid DEFAULT value '${column.default}' for numeric column '${column.name}'`);
                }

                if ((column.type === 'BOOLEAN' || column.type === 'TINYINT(1)') &&
                    !['true', 'false', '1', '0', 'null'].includes(column.default.toLowerCase())) {
                    throw new Error(`Invalid DEFAULT value '${column.default}' for boolean column '${column.name}'`);
                }
            }

            // Kiểm tra FOREIGN KEY constraints
            if (column.is_foreign_key) {
                if (!column.references) {
                    throw new Error(`Foreign key column '${column.name}' must reference a table`);
                }
                if (column.nullable === false && !column.default) {
                    console.warn(`Foreign key column '${column.name}' is NOT NULL but has no default value`);
                }
            }

            // Kiểm tra UNIQUE constraint
            if (column.unique && column.nullable) {
                console.warn(`UNIQUE constraint on nullable column '${column.name}' may behave differently across databases`);
            }

            // Kiểm tra kiểu dữ liệu và length
            if (column.length) {
                if (['TEXT', 'LONGTEXT', 'BLOB', 'LONGBLOB'].includes(column.type) && column.length) {
                    throw new Error(`Data type '${column.type}' cannot have length specification`);
                }

                if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(column.type)) {
                    const length = parseInt(column.length);
                    if (length && (length < 1 || length > 255)) {
                        throw new Error(`Invalid length ${column.length} for integer type '${column.type}'`);
                    }
                }

                if (column.type === 'VARCHAR' || column.type === 'CHAR') {
                    const length = parseInt(column.length);
                    if (!length || length < 1 || length > 65535) {
                        throw new Error(`Invalid length ${column.length} for string type '${column.type}'`);
                    }
                }

                // Kiểm tra DECIMAL precision/scale
                if (column.type === 'DECIMAL' && column.length) {
                    const parts = column.length.split(',');
                    if (parts.length !== 2) {
                        throw new Error(`DECIMAL requires format 'precision,scale'`);
                    }
                    const precision = parseInt(parts[0]);
                    const scale = parseInt(parts[1]);
                    if (precision < 1 || precision > 65 || scale < 0 || scale > 30 || scale > precision) {
                        throw new Error(`Invalid DECIMAL specification: ${column.length}`);
                    }
                }
            }

            // Khuyến nghị naming convention
            if (column.is_primary_key && !column.name.toLowerCase().endsWith('_id') &&
                column.name.toLowerCase() !== 'id') {
                console.warn(`💡 Consider naming primary key as 'id' or ending with '_id': ${column.name}`);
            }

            if (column.is_foreign_key && !column.name.toLowerCase().endsWith('_id')) {
                console.warn(`💡 Foreign key columns should typically end with '_id': ${column.name}`);
            }
        });

        // VALIDATION: Cảnh báo performance
        const indexedColumns = tableData.columns.filter((col: any) =>
            col.is_primary_key || col.unique || col.is_foreign_key
        );

        if (indexedColumns.length > 10) {
            console.warn(`⚠️ Table '${tableData.name}' has ${indexedColumns.length} indexed columns - consider performance impact`);
        }

        // Cảnh báo về large text/BLOB columns
        const largeColumns = tableData.columns.filter((col: any) =>
            ['TEXT', 'LONGTEXT', 'BLOB', 'LONGBLOB'].includes(col.type)
        );

        if (largeColumns.length > 3) {
            console.warn(`⚠️ Table '${tableData.name}' has ${largeColumns.length} large object columns - consider normalization`);
        }

        // VALIDATION: Logic nghiệp vụ cơ bản
        const hasTimestamps = tableData.columns.some((col: any) =>
            ['created_at', 'updated_at'].includes(col.name.toLowerCase())
        );

        if (!hasTimestamps) {
            console.warn(`💡 Consider adding 'created_at' and 'updated_at' timestamp columns for audit trail`);
        }

        // Khuyến nghị soft delete
        const hasSoftDelete = tableData.columns.some((col: any) =>
            col.name.toLowerCase() === 'deleted_at'
        );

        if (!hasSoftDelete) {
            console.warn(`💡 Consider adding 'deleted_at' column for soft delete functionality`);
        }
    }

    private isValidNumericDefault(value: string): boolean {
        if (value.toLowerCase() === 'null') return true;
        return !isNaN(Number(value)) ||
            ['current_timestamp', 'now()'].includes(value.toLowerCase());
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

        // Tìm PK cũ và PK mới
        const oldPK = oldTable.columns.find((col: any) => col.is_primary_key);
        const newPK = newTable.columns.find((col: any) => col.is_primary_key);

        // Nếu không có PK hoặc không thay đổi type → không làm gì
        if (!oldPK || !newPK || oldPK.type === newPK.type) {
            return;
        }

        console.log(`🔄 PK type changed from ${oldPK.type} to ${newPK.type}. Updating related FKs...`);

        // Tìm tất cả các bảng có FK reference đến bảng này
        const tablesWithReferences = database.tables.filter(table =>
            table.columns.some(col =>
                col.is_foreign_key && col.references === tableName
            )
        );

        let updatedCount = 0;

        // Cập nhật từng FK
        for (const referencingTable of tablesWithReferences) {
            for (const column of referencingTable.columns) {
                if (column.is_foreign_key && column.references === tableName) {
                    console.log(`↪️ Updating FK: ${referencingTable.name}.${column.name} from ${column.type} to ${newPK.type}`);

                    try {
                        // Cập nhật trong database
                        const updateResult = await DatabaseModel.updateOne(
                            {
                                _id: databaseId,
                                "tables.name": referencingTable.name,
                                "tables.columns.name": column.name
                            },
                            {
                                $set: {
                                    "tables.$.columns.$[col].type": newPK.type,
                                    "tables.$.columns.$[col].length": newPK.length
                                }
                            },
                            {
                                arrayFilters: [{ "col.name": column.name }]
                            }
                        );

                        if (updateResult.modifiedCount > 0) {
                            updatedCount++;
                        }
                    } catch (error) {
                        console.error(`❌ Failed to update FK ${referencingTable.name}.${column.name}:`, error);
                    }
                }
            }
        }

        console.log(`✅ Updated ${updatedCount} foreign keys across ${tablesWithReferences.length} tables`);
    }

    public async generateSchemaFromRequirements(payload: GenerateDatabasePayload) {
        const { versionId, projectId, requirements } = payload;

        if (!requirements || requirements.length === 0) {
            throw new Error("Không có requirements để sinh database.");
        }

        const databaseSchema = await this.geminiService.generateDatabaseSchema(requirements, 'vi-VN');

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
        return DatabaseModel.find({ version_id: versionId }).sort({ createdAt: -1 });
    }

    public async getDatabaseById(databaseId: string) {
        return DatabaseModel.findById(databaseId);
    }

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

    public async deleteDatabase(databaseId: string) {
        return DatabaseModel.findByIdAndDelete(databaseId);
    }

    /**
     * [C] Thêm một bảng mới với validation đầy đủ
     */
    public async addTableToDatabase(databaseId: string, tableData: any) {
        // Validate table structure
        this.validateTableStructure(tableData);

        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");

        // Kiểm tra trùng tên bảng
        const existingTable = database.tables.find(t =>
            t.name.toLowerCase() === tableData.name.toLowerCase()
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
    public async updateTableInDatabase(databaseId: string, tableName: string, tableData: any) {
        // Guard: tránh payload nhầm route
        if ((tableName || '').toLowerCase() === 'positions') {
            console.warn('[updateTableInDatabase] Received reserved name "positions". Skip update.');
            return await DatabaseModel.findById(databaseId);
        }

        // 1. Validate cơ bản trước
        await this.validateTableModification(databaseId, tableName, 'update');
        this.validateTableStructure(tableData);

        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");
        const existingTable = database.tables.find(t => t.name === tableName);
        if (!existingTable) throw new Error("Table not found");

        // 2. Kiểm tra trùng tên bảng TRƯỚC
        if (tableData.name !== tableName) {
            const duplicateTable = database.tables.find(t =>
                t.name.toLowerCase() === tableData.name.toLowerCase() && t.name !== tableName
            );
            if (duplicateTable) {
                throw new Error(`Table '${tableData.name}' already exists in database`);
            }
        }

        // 3. Validate foreign keys TRƯỚC
        for (const column of tableData.columns) {
            if (column.is_foreign_key && column.references) {
                await this.validateForeignKeyConstraint(
                    databaseId,
                    tableData.name, // dùng tableData.name vì có thể đã đổi tên
                    column.name,
                    column.references,
                    column.type
                );
            }
        }

        // 4. Sync FK changes SAU KHI tất cả validation passed
        await this.syncForeignKeyTypesForPKChanges(
            databaseId,
            tableName,
            existingTable,
            tableData
        );

        // 5. Thực hiện update
        const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const normalizedName = (tableName || '').trim();

        const result = await DatabaseModel.updateOne(
            {
                _id: databaseId,
                "tables.name": { $regex: `^${escape(normalizedName)}$`, $options: 'i' }
            },
            { $set: { "tables.$": tableData } }
        );

        if (result.matchedCount === 0) {
            console.warn(`[updateTableInDatabase] Table not found by name="${tableName}". Skipping update.`);
            return await DatabaseModel.findById(databaseId);
        }

        return await DatabaseModel.findById(databaseId);
    }

    /**
     * [D] Xóa một bảng với validation constraints
     */
    public async deleteTableFromDatabase(databaseId: string, tableName: string) {
        // Validate modification constraints
        await this.validateTableModification(databaseId, tableName, 'delete');

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
        const enrichedTables = database.tables.map(table => {
            const tableObj = table.toObject();
            return {
                ...tableObj,
                foreignKeys: tableObj.columns
                    .filter(col => col.is_foreign_key && col.references)
                    .map(fkCol => {
                        const referencedTable = database.tables.find(t => t.name === fkCol.references);
                        const relationship = database.relationships.find(rel =>
                            rel.from_table === table.name && rel.to_table === fkCol.references
                        );

                        return {
                            columnName: fkCol.name,
                            referencedTable: fkCol.references,
                            referencedTableDetails: referencedTable || null,
                            relationship: relationship || null,
                            fullReference: {
                                column: fkCol.name,
                                references: fkCol.references,
                                relationshipType: relationship?.type || 'unknown',
                                referencedColumns: referencedTable?.columns?.filter(col => col.is_primary_key) || []
                            }
                        };
                    })
            };
        });

        return {
            ...database.toObject(),
            tables: enrichedTables
        };
    }

    /**
     * [R] - Lấy thông tin relationships của một bảng cụ thể
     */
    public async getTableRelationships(databaseId: string, tableName: string) {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");

        const table = database.tables.find(t => t.name === tableName);
        if (!table) throw new Error("Table not found");

        // Lấy foreign keys của bảng này
        const foreignKeys = table.columns
            .filter(col => col.is_foreign_key && col.references)
            .map(fkCol => {
                const referencedTable = database.tables.find(t => t.name === fkCol.references);
                const relationship = database.relationships.find(rel =>
                    rel.from_table === tableName && rel.to_table === fkCol.references
                );

                return {
                    column: fkCol.name,
                    references: fkCol.references,
                    referencedTable: referencedTable ? {
                        name: referencedTable.name,
                        description: referencedTable.description,
                        primaryKeys: referencedTable.columns.filter(col => col.is_primary_key)
                    } : null,
                    relationship: relationship,
                    relationshipType: relationship?.type || 'foreign_key'
                };
            });

        // Lấy các bảng khác reference đến bảng này
        const referencedBy = database.tables
            .filter(t => t.name !== tableName)
            .flatMap(t =>
                t.columns
                    .filter(col => col.is_foreign_key && col.references === tableName)
                    .map(col => ({
                        fromTable: t.name,
                        fromColumn: col.name,
                        relationship: database.relationships.find(rel =>
                            rel.from_table === t.name && rel.to_table === tableName
                        )
                    }))
            );

        return {
            table: tableName,
            foreignKeys,
            referencedBy,
            allRelationships: database.relationships.filter(rel =>
                rel.from_table === tableName || rel.to_table === tableName
            )
        };
    }

    /**
     * [U] - Validate foreign key trước khi tạo/cập nhật
     */
    public async validateForeignKey(databaseId: string, tableName: string, columnName: string, referencedTable: string) {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");

        // Kiểm tra referenced table có tồn tại không
        const targetTable = database.tables.find(t => t.name === referencedTable);
        if (!targetTable) {
            return {
                valid: false,
                error: `Table '${referencedTable}' does not exist in database`
            };
        }

        // Kiểm tra referenced table có primary key không
        const primaryKeys = targetTable.columns.filter(col => col.is_primary_key);
        if (primaryKeys.length === 0) {
            return {
                valid: false,
                error: `Table '${referencedTable}' has no primary key column`
            };
        }

        // Kiểm tra relationship có tồn tại không
        const existingRelationship = database.relationships.find(rel =>
            rel.from_table === tableName && rel.to_table === referencedTable
        );

        return {
            valid: true,
            referencedTable: targetTable,
            primaryKeys,
            existingRelationship
        };
    }

    public async getAvailableTablesForReferences(databaseId: string, excludeTable?: string) {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");

        return database.tables
            .filter(table => !excludeTable || table.name !== excludeTable)
            .map(table => ({
                name: table.name,
                description: table.description,
                primaryKeys: table.columns.filter(col => col.is_primary_key),
                columnCount: table.columns.length
            }));
    }

    public async updateTablePosition(databaseId: string, tableName: string, position: { x: number; y: number }) {
        const result = await DatabaseModel.updateOne(
            { _id: databaseId, "tables.name": tableName },
            {
                $set: {
                    "tables.$.position": position
                }
            }
        );

        if (result.matchedCount === 0) {
            throw new Error("Table not found in database");
        }

        return await DatabaseModel.findById(databaseId);
    }

    public async updateMultipleTablePositions(databaseId: string, positionUpdates: TablePositionUpdate[]) {
        console.log("✅✅✅ RUNNING THE FIXED AND ROBUST BATCH UPDATE v2 ✅✅✅");

        const database = await DatabaseModel.findById(databaseId);
        if (!database) {
            throw new Error("Database not found");
        }

        console.log('🔍 Database tables:', database.tables.map(t => t.name));
        console.log('📝 Requested updates:', positionUpdates.map(u => u.tableName));

        for (const update of positionUpdates) {
            try {
                const tableExists = database.tables.some(t => t.name === update.tableName);

                if (!tableExists) {
                    console.warn(`Table "${update.tableName}" not found in database, skipping`);
                    continue;
                }

                const result = await DatabaseModel.updateOne(
                    {
                        _id: databaseId,
                        "tables.name": update.tableName
                    },
                    {
                        $set: {
                            "tables.$.position": update.position
                        }
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
            columns: database.tables.reduce((sum, table) => sum + (table.columns?.length || 0), 0),
            primaryKeys: database.tables.reduce((sum, table) => 
                sum + (table.columns?.filter(col => col.is_primary_key).length || 0), 0),
            foreignKeys: database.tables.reduce((sum, table) => 
                sum + (table.columns?.filter(col => col.is_foreign_key).length || 0), 0),
            indexedColumns: database.tables.reduce((sum, table) => 
                sum + (table.columns?.filter(col => col.unique).length || 0), 0),
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
                        if (!col.nullable) columnDef += ' NOT NULL';
                        if (col.unique) columnDef += ' UNIQUE';
                        if (col.is_primary_key) columnDef += ' PRIMARY KEY AUTO_INCREMENT';
                        if (col.default) {
                            if (['VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT'].includes(col.type)) {
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
                    .join(',\n  ');

                const foreignKeys = (table.columns || [])
                    .filter((col) => col.is_foreign_key && col.references)
                    .map((col) => {
                        return `FOREIGN KEY (${col.name}) REFERENCES ${col.references}(id)`;
                    })
                    .join(',\n  ');

                const constraints = foreignKeys ? `,\n  ${foreignKeys}` : '';

                return `CREATE TABLE ${table.name} (\n  ${columns}${constraints}\n);`;
            })
            .join('\n\n');

        return sqlStatements;
    }
}