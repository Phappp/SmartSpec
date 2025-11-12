import DatabaseModel from "../../../../../internal/model/database";
import { Table, TablePositionUpdate } from "./interfaces";
import { TableValidationService } from "./TableValidationService";
import { KeyManagementService } from "./KeyManagementService";
import { VersionService } from "../../version/domain/service";
import { LogService } from "../../log/domain/service";
import {PreviewChangeDto} from "../../version/adapter/preview.dto";
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import Version from "../../../../../internal/model/version";
import User from "../../../../../internal/model/user";

export class TableManagementService {
    private validationService: TableValidationService;
    private keyService: KeyManagementService;
    private versionService: VersionService;
    private logService: LogService;
    constructor() {
        this.validationService = new TableValidationService();
        this.keyService = new KeyManagementService();
        this.versionService = new VersionService();
        this.logService = new LogService();
    }

    /**
     * [C] Thêm một bảng mới với validation đầy đủ
     */
    public async addTableToDatabase(userId:string, databaseId: string, tableData: Table) {
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
        // 1️⃣ Bump version nếu cần
        let version = await Version.findById(database.version_id);
        if (!version) throw new Error("Version not found");

        if (!version.version_temporary) {
            const bumpRes = await this.versionService.bumpVersion(version._id.toString(), userId, "minor");
            if (!bumpRes.data) throw new Error("Auto bump failed");
            version = bumpRes.data.newVersion;
        }

        // 2️⃣ Ghi preview
        const changePayload: PreviewChangeDto = {
            entity_type: "table",
            change_type: "added",
            entity_id: databaseId,
            before_snapshot: null,
            after_snapshot: tableData
        };
        await this.versionService.createOrUpdatePreview(version._id.toString(), userId, changePayload);

        // 3️⃣ Thêm table
        const updatedDb = await DatabaseModel.findByIdAndUpdate(
            databaseId,
            { $push: { tables: tableData } },
            { new: true }
        );

        // 4️⃣ Ghi log
        const user = await User.findById(userId).lean();
        const username = user?.name || "Unknown User";

        await this.logService.createLog({
            project_id: database.project_id.toString(),
            user_id: userId,
            action: "create_table",
            target_id: tableData.name,
            target_type: "tables",
            version_number: version.version_number,
            affects_requirement: true,
            level: "info",
            details: {
                after: tableData,
                message: `${username} added table ${tableData.name}`
            }
        });

    return updatedDb;
    }

    /**
     * [U] Cập nhật một bảng với validation đầy đủ
     */
    public async updateTableInDatabase(userId:string, databaseId: string, tableName: string, tableData: Table) {
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
        // 1️⃣ Bump version nếu cần
        let version = await Version.findById(database.version_id);
        if (!version) throw new Error("Version not found");

        if (!version.version_temporary) {
            const bumpRes = await this.versionService.bumpVersion(version._id.toString(), userId, "minor");
            if (!bumpRes.data) throw new Error("Auto bump failed");
            version = bumpRes.data.newVersion;
        }

        // 2️⃣ Ghi preview
        const changePayload: PreviewChangeDto = {
            entity_type: "table",
            change_type: "updated",
            entity_id: databaseId,
            before_snapshot: existingTable,
            after_snapshot: updatedTableData
        };
        await this.versionService.createOrUpdatePreview(version._id.toString(), userId, changePayload);

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
        // 4️⃣ Ghi log
        const user = await User.findById(userId).lean();
        const username = user?.name || "Unknown User";
        await this.logService.createLog({
            project_id: database.project_id.toString(),
            user_id: userId,
            action: "update_table",
            target_id: databaseId,
            target_type: "tables",
            version_number: version.version_number,
            affects_requirement: true,
            level: "info",
            details: {
                before: existingTable,
                after: updatedTableData,
                message: `${username} updated table ${tableName}`
            }
        });

        return await DatabaseModel.findById(databaseId);
    }

    /**
     * [D] Xóa một bảng với validation constraints
     */
    public async deleteTableFromDatabase(userId: string, databaseId: string, tableName: string) {
        // Validate modification constraints
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");
        await this.validationService.validateTableModification(databaseId, tableName, 'delete');
        const existingTable = database.tables.find(t => t.name === tableName);
        if (!existingTable) throw new Error("Table not found");
        // 1️⃣ Bump version nếu cần
        let version = await Version.findById(database.version_id);
        if (!version) throw new Error("Version not found");
        const deleteTable = DatabaseModel.findByIdAndUpdate(
            databaseId,
            { $pull: { tables: { name: tableName } } },
            { new: true }
        );
        if (!version.version_temporary) {
            const bumpRes = await this.versionService.bumpVersion(version._id.toString(), userId, "minor");
            if (!bumpRes.data) throw new Error("Auto bump failed");
            version = bumpRes.data.newVersion;
        }

        // 2️⃣ Ghi preview
        const changePayload: PreviewChangeDto = {
            entity_type: "table",
            change_type: "deleted",
            entity_id: databaseId,
            before_snapshot: existingTable,
            after_snapshot: null
        };
        await this.versionService.createOrUpdatePreview(version._id.toString(), userId, changePayload);

        return deleteTable;
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