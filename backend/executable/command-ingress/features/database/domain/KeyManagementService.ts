import DatabaseModel from "../../../../../internal/model/database";
import { Table } from "./interfaces";

export class KeyManagementService {
    /**
     * TỰ ĐỘNG ĐỒNG BỘ KIỂU DỮ LIỆU KHI PK THAY ĐỔI
     */
    public async syncForeignKeyTypesForPKChanges(
        databaseId: string,
        tableName: string,
        oldTable: Table,
        newTable: Table
    ) {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) return;

        // Lấy tất cả primary keys (có thể là single hoặc composite)
        const oldPKs = oldTable.columns.filter((col: any) => col.is_primary_key);
        const newPKs = newTable.columns.filter((col: any) => col.is_primary_key);

        console.log(`🔄 Primary key structure changed. Updating related FKs...`);
        console.log(`   Old PKs: ${oldPKs.map(pk => `${pk.name}(${pk.type})`).join(', ')}`);
        console.log(`   New PKs: ${newPKs.map(pk => `${pk.name}(${pk.type})`).join(', ')}`);

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
                    // Tìm primary key tương ứng dựa trên tên cột hoặc type matching
                    let correspondingNewPK = newPKs.find(pk =>
                        pk.name.toLowerCase() === column.name.toLowerCase()
                    );

                    // Nếu không tìm thấy bằng tên, tìm bằng type matching với old PK
                    if (!correspondingNewPK) {
                        const oldPK = oldPKs.find(pk => pk.type === column.type);
                        if (oldPK) {
                            const oldPKIndex = oldPKs.indexOf(oldPK);
                            correspondingNewPK = newPKs[oldPKIndex];
                        }
                    }

                    if (correspondingNewPK && correspondingNewPK.type !== column.type) {
                        console.log(`↪️ Updating FK: ${referencingTable.name}.${column.name} from ${column.type} to ${correspondingNewPK.type}`);

                        try {
                            const updateResult = await DatabaseModel.updateOne(
                                {
                                    _id: databaseId,
                                    "tables.name": referencingTable.name,
                                    "tables.columns.name": column.name
                                },
                                {
                                    $set: {
                                        "tables.$.columns.$[col].type": correspondingNewPK.type,
                                        "tables.$.columns.$[col].length": correspondingNewPK.length
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
        }

        console.log(`✅ Updated ${updatedCount} foreign keys across ${tablesWithReferences.length} tables`);
    }

    /**
     * UTILITY: Lấy thông tin composite key của một bảng
     */
    public async getCompositeKeyInfo(databaseId: string, tableName: string) {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");

        const table = database.tables.find(t => t.name === tableName);
        if (!table) throw new Error("Table not found");

        const primaryKeyColumns = table.columns
            .filter(col => col.is_primary_key)
            .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0));

        return {
            isComposite: primaryKeyColumns.length > 1,
            columns: primaryKeyColumns.map(col => ({
                name: col.name,
                type: col.type,
                length: col.length,
                primary_key_order: col.primary_key_order,
                is_foreign_key: col.is_foreign_key,
                references: col.references
            })),
            totalColumns: primaryKeyColumns.length
        };
    }

    /**
     * UTILITY: Tạo composite key mới
     */
    public async createCompositeKey(
        databaseId: string,
        tableName: string,
        columnNames: string[]
    ) {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");

        const table = database.tables.find(t => t.name === tableName);
        if (!table) throw new Error("Table not found");

        if (columnNames.length < 2) {
            throw new Error("Composite key requires at least 2 columns");
        }

        // Kiểm tra các column tồn tại
        const columnsToUpdate = columnNames.map(columnName => {
            const column = table.columns.find(col => col.name === columnName);
            if (!column) {
                throw new Error(`Column '${columnName}' not found in table '${tableName}'`);
            }
            if (column.nullable) {
                throw new Error(`Column '${columnName}' cannot be nullable for primary key`);
            }
            return column;
        });

        // Tạo updated columns với primary key flags
        const updateOperations = table.columns.map((col) => {
            const isPrimaryKey = columnNames.includes(col.name);
            return {
                ...col.toObject(),
                is_primary_key: isPrimaryKey,
                primary_key_order: isPrimaryKey ? columnNames.indexOf(col.name) + 1 : null
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
     * UTILITY: Chuyển từ composite key sang single key
     */
    public async convertToSingleKey(
        databaseId: string,
        tableName: string,
        primaryKeyColumnName: string
    ) {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");

        const table = database.tables.find(t => t.name === tableName);
        if (!table) throw new Error("Table not found");

        const targetColumn = table.columns.find(col => col.name === primaryKeyColumnName);
        if (!targetColumn) {
            throw new Error(`Column '${primaryKeyColumnName}' not found in table '${tableName}'`);
        }

        if (targetColumn.nullable) {
            throw new Error(`Primary key column '${primaryKeyColumnName}' cannot be nullable`);
        }

        // Tạo updated columns với single primary key
        const updateOperations = table.columns.map((col) => ({
            ...col.toObject(),
            is_primary_key: col.name === primaryKeyColumnName,
            primary_key_order: col.name === primaryKeyColumnName ? null : null
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
}