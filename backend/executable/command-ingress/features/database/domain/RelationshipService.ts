import DatabaseModel from "../../../../../internal/model/database";

export class RelationshipService {
    /**
     * [R] - Lấy database schema với thông tin references đầy đủ
     */
    public async getDatabaseWithReferences(databaseId: string) {
        const database = await DatabaseModel.findById(databaseId);
        if (!database) throw new Error("Database not found");

        // Enrich tables với thông tin references chi tiết
        const enrichedTables = database.tables.map(table => {
            const tableObj = table.toObject();
            const primaryKeys = tableObj.columns.filter(col => col.is_primary_key)
                .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0));

            return {
                ...tableObj,
                primaryKeys: primaryKeys,
                isCompositeKey: primaryKeys.length > 1,
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

        // Lấy thông tin primary key (có thể là composite)
        const primaryKeys = table.columns
            .filter(col => col.is_primary_key)
            .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0));

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
                            .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0)),
                        isCompositeKey: referencedTable.columns.filter(col => col.is_primary_key).length > 1
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
            primaryKeys: primaryKeys,
            isCompositeKey: primaryKeys.length > 1,
            foreignKeys,
            referencedBy,
            allRelationships: database.relationships.filter(rel =>
                rel.from_table === tableName || rel.to_table === tableName
            )
        };
    }

    /**
     * [R] - Lấy các bảng có references
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
}