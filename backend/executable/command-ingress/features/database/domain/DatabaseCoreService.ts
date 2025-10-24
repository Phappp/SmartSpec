import DatabaseModel from "../../../../../internal/model/database";
import { DatabaseGeminiService } from "../domain/GeminiService";
import { GenerateDatabasePayload, Table } from "./interfaces";
import { TableValidationService } from "./TableValidationService";

export class DatabaseCoreService {
    private geminiService: DatabaseGeminiService;
    private validationService: TableValidationService;

    constructor() {
        this.geminiService = new DatabaseGeminiService();
        this.validationService = new TableValidationService();
    }

    public async generateSchemaFromRequirements(payload: GenerateDatabasePayload) {
        const { versionId, projectId, requirements } = payload;

        if (!requirements || requirements.length === 0) {
            throw new Error("Không có requirements để sinh database.");
        }

        const databaseSchema = await this.geminiService.generateDatabaseSchema(requirements, 'vi-VN');

        // Validate generated schema
        databaseSchema.tables.forEach((table: Table) => {
            this.validationService.validateTableStructure(table);
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

    /**
     * Cập nhật Database
     */
    public async updateDatabase(databaseId: string, updateData: any) {
        // Validate foreign key relationships if tables are being updated
        if (updateData.tables) {
            updateData.tables.forEach((table: Table) => {
                this.validationService.validateTableStructure(table);
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
     * Xóa database
     */
    public async deleteDatabase(databaseId: string) {
        return DatabaseModel.findByIdAndDelete(databaseId);
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

                        // Xử lý primary key (không thêm AUTO_INCREMENT cho composite key)
                        if (col.is_primary_key) {
                            const isSinglePK = table.columns.filter(c => c.is_primary_key).length === 1;
                            columnDef += ' PRIMARY KEY';
                            if (isSinglePK) columnDef += ' AUTO_INCREMENT';
                        }

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

                // Xử lý composite primary key constraint
                const primaryKeyColumns = table.columns.filter(col => col.is_primary_key);
                let compositeKeyConstraint = '';

                if (primaryKeyColumns.length > 1) {
                    const pkColumnNames = primaryKeyColumns
                        .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0))
                        .map(col => col.name)
                        .join(', ');

                    compositeKeyConstraint = `,\n  PRIMARY KEY (${pkColumnNames})`;
                }

                const foreignKeys = (table.columns || [])
                    .filter((col) => col.is_foreign_key && col.references)
                    .map((col) => {
                        // Tìm primary key của bảng được reference
                        const referencedTable = database.tables.find(t => t.name === col.references);
                        const referencedPK = referencedTable?.columns.find(c => c.is_primary_key);
                        const pkColumnName = referencedPK?.name || 'id';

                        return `FOREIGN KEY (${col.name}) REFERENCES ${col.references}(${pkColumnName})`;
                    })
                    .join(',\n  ');

                const constraints = [compositeKeyConstraint, foreignKeys]
                    .filter(Boolean)
                    .join(',\n  ');

                return `CREATE TABLE ${table.name} (\n  ${columns}${constraints ? ',\n  ' + constraints : ''}\n);`;
            })
            .join('\n\n');

        return sqlStatements;
    }
}