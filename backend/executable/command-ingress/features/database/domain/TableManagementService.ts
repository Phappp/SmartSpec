import DatabaseModel from "../../../../../internal/model/database";
import { Table, TablePositionUpdate } from "./interfaces";
import { TableValidationService } from "./TableValidationService";
import { KeyManagementService } from "./KeyManagementService";

export class TableManagementService {
    private validationService: TableValidationService;
    private keyService: KeyManagementService;

    constructor() {
        this.validationService = new TableValidationService();
        this.keyService = new KeyManagementService();
    }

    /**
     * [C] Thêm một bảng mới với validation đầy đủ
     */
    public async addTableToDatabase(databaseId: string, tableData: Table) {
        // Validate table structure (includes composite key validation)
        this.validationService.validateTableStructure(tableData);

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
                await this.validationService.validateForeignKeyConstraint(
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
    public async updateTableInDatabase(databaseId: string, tableName: string, tableData: Table) {
        // Guard: tránh payload nhầm route
        if ((tableName || '').toLowerCase() === 'positions') {
            console.warn('[updateTableInDatabase] Received reserved name "positions". Skip update.');
            return await DatabaseModel.findById(databaseId);
        }

        // 1. Validate cơ bản trước
        await this.validationService.validateTableModification(databaseId, tableName, 'update');

        // 2. Lấy database và table hiện tại để giữ position
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");
        const existingTable = database.tables.find(t => t.name === tableName);
        if (!existingTable) throw new Error("Table not found");

        // 3. Giữ nguyên position từ table hiện tại nếu không có position mới
        const updatedTableData = {
            ...tableData,
            position: tableData.position || existingTable.position // Giữ position cũ nếu không có mới
        };

        // 4. Validate structure với data đã được merge position
        this.validationService.validateTableStructure(updatedTableData);

        // 5. Kiểm tra trùng tên bảng TRƯỚC
        if (updatedTableData.name !== tableName) {
            const duplicateTable = database.tables.find(t =>
                t.name.toLowerCase() === updatedTableData.name.toLowerCase() && t.name !== tableName
            );
            if (duplicateTable) {
                throw new Error(`Table '${updatedTableData.name}' already exists in database`);
            }
        }

        // 6. Validate foreign keys TRƯỚC
        for (const column of updatedTableData.columns) {
            if (column.is_foreign_key && column.references) {
                await this.validationService.validateForeignKeyConstraint(
                    databaseId,
                    updatedTableData.name, // dùng updatedTableData.name vì có thể đã đổi tên
                    column.name,
                    column.references,
                    column.type
                );
            }
        }

        // 7. Sync FK changes SAU KHI tất cả validation passed
        await this.keyService.syncForeignKeyTypesForPKChanges(
            databaseId,
            tableName,
            existingTable,
            updatedTableData
        );

        // 8. Thực hiện update với data đã giữ position
        const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const normalizedName = (tableName || '').trim();

        const result = await DatabaseModel.updateOne(
            {
                _id: databaseId,
                "tables.name": { $regex: `^${escape(normalizedName)}$`, $options: 'i' }
            },
            { $set: { "tables.$": updatedTableData } }
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
        await this.validationService.validateTableModification(databaseId, tableName, 'delete');

        return DatabaseModel.findByIdAndUpdate(
            databaseId,
            { $pull: { tables: { name: tableName } } },
            { new: true }
        );
    }

    /**
     * Cập nhật vị trí bảng
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
     * Cập nhật vị trí nhiều bảng cùng lúc
     */
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
}