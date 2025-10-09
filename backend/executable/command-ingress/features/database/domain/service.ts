// src/features/database/domain/service.ts

import DatabaseModel from "../../../../../internal/model/database"; // Model Mongoose từ file database.ts
import VersionModel from "../../../../../internal/model/version"; // Model Mongoose từ file version.ts
import { GeminiService } from "../../../features/orchestrator/domain/GeminiService"; // GeminiService đã có

// Định nghĩa cấu trúc dữ liệu đầu vào cho service
interface GenerateDatabasePayload {
    versionId: string;
    projectId: string;
    // Mảng các use case từ requirement_model
    requirements: any[];
}

// service.ts - Đơn giản hóa
export class DatabaseService {
    private geminiService: GeminiService;

    constructor() {
        this.geminiService = new GeminiService();
    }

    /**
     * Sinh schema CSDL từ các yêu cầu của một phiên bản.
     */
    public async generateSchemaFromRequirements(payload: GenerateDatabasePayload) {
        const { versionId, projectId, requirements } = payload;

        if (!requirements || requirements.length === 0) {
            throw new Error("Không có requirements để sinh database.");
        }

        // 1. Gọi GeminiService để tạo database schema
        const databaseSchema = await this.geminiService.generateDatabaseSchema(requirements, 'vi-VN');

        // 2. Tạo và lưu database mới
        const newDatabase = new DatabaseModel({
            project_id: projectId,
            version_id: versionId,
            name: databaseSchema.name,
            description: databaseSchema.description,
            tables: databaseSchema.tables,
            relationships: databaseSchema.relationships,
        });

        // 3. Lưu vào MongoDB
        await newDatabase.save();

        return newDatabase;
    }

    // [R] - READ: Lấy tất cả database schema của một version
    public async getDatabasesByVersion(versionId: string) {
        return DatabaseModel.find({ version_id: versionId }).sort({ createdAt: -1 });
    }

    // [R] - READ: Lấy một database schema bằng ID của nó
    public async getDatabaseById(databaseId: string) {
        return DatabaseModel.findById(databaseId);
    }

    // [U] - UPDATE: Cập nhật một database schema
    public async updateDatabase(databaseId: string, updateData: any) {
        // Sử dụng updateOne thay vì findByIdAndUpdate
        const result = await DatabaseModel.updateOne(
            { _id: databaseId },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            throw new Error("Database not found");
        }

        // Trả về document đã được cập nhật
        return await DatabaseModel.findById(databaseId);
    }

    // [D] - DELETE: Xóa một database schema
    public async deleteDatabase(databaseId: string) {
        return DatabaseModel.findByIdAndDelete(databaseId);
    }

    // --- CÁC HÀM CRUD CHO TỪNG BẢNG (THÊM MỚI) ---

    /**
     * [C] Thêm một bảng mới vào mảng 'tables' của một DB schema.
     */
    public async addTableToDatabase(databaseId: string, tableData: any) {
        // Sử dụng toán tử $push của MongoDB để thêm phần tử mới vào mảng
        return DatabaseModel.findByIdAndUpdate(
            databaseId,
            { $push: { tables: tableData } },
            { new: true } // Trả về document sau khi đã cập nhật
        );
    }

    /**
     * [U] Cập nhật một bảng cụ thể trong mảng 'tables'.
     */
    public async updateTableInDatabase(databaseId: string, tableName: string, tableData: any) {
        // Guard: tránh payload nhầm route khi tên là 'positions'
        if ((tableName || '').toLowerCase() === 'positions') {
            console.warn('[updateTableInDatabase] Received reserved name "positions". Skip update.');
            return await DatabaseModel.findById(databaseId);
        }

        // Sử dụng updateOne với positional operator
        // helper: escape regex special chars
        const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const normalizedName = (tableName || '').trim();

        const result = await DatabaseModel.updateOne(
            {
                _id: databaseId,
                "tables.name": { $regex: `^${escape(normalizedName)}$`, $options: 'i' } // case/space tolerant
            },
            { $set: { "tables.$": tableData } }
        );

        // Don’t hard-fail on no match (prevents UX break during drag)
        if (result.matchedCount === 0) {
            console.warn(`[updateTableInDatabase] Table not found by name="${tableName}". Skipping update.`);
            return await DatabaseModel.findById(databaseId);
        }

        return await DatabaseModel.findById(databaseId);
    }

    /**
     * [D] Xóa một bảng khỏi mảng 'tables' dựa vào tên bảng.
     */
    public async deleteTableFromDatabase(databaseId: string, tableName: string) {
        // Sử dụng toán tử $pull của MongoDB để xóa phần tử khỏi mảng
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

    /**
     * [R] - Lấy tất cả tables để làm dropdown references
     */
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
    /**
 * [U] - Cập nhật vị trí của một bảng trong diagram
 */
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

    /**
     * [U] - Cập nhật vị trí nhiều bảng cùng lúc (batch update)
     */

    /**
 * [U] - Cập nhật vị trí nhiều bảng cùng lúc (batch update) - FIXED VERSION
 */
    public async updateMultipleTablePositions(databaseId: string, positionUpdates: Array<{
        tableName: string;
        position: { x: number; y: number };
    }>) {
        console.log("✅✅✅ RUNNING THE FIXED AND ROBUST BATCH UPDATE v2 ✅✅✅");
        try {
            const database = await DatabaseModel.findById(databaseId);
            if (!database) {
                console.error('Database not found:', databaseId);
                // Trả về null hoặc một phản hồi phù hợp thay vì ném lỗi
                return null;
            }

            console.log('🔍 Database tables:', database.tables.map(t => t.name));
            console.log('📝 Requested updates:', positionUpdates.map(u => u.tableName));

            for (const update of positionUpdates) {
                try {
                    // Tìm table với name chính xác (case sensitive)
                    const tableExists = database.tables.some(t => t.name === update.tableName);

                    if (!tableExists) {
                        // Bỏ qua bảng không tìm thấy và ghi log, thay vì ném lỗi
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

            // Trả về database đã được cập nhật
            return await DatabaseModel.findById(databaseId);

        } catch (error) {
            console.error('❌ Critical error in updateMultipleTablePositions:', error);
            // Trả về null hoặc response lỗi để controller xử lý
            return null;
        }
    }
}