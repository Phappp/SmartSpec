import DatabaseModel from "../../../../../internal/model/database";
import { DatabaseGeminiService } from "../domain/GeminiService";
import { GenerateDatabasePayload, Table } from "./interfaces";
import { TableValidationService } from "./TableValidationService";
import { VersionService } from "../../version/domain/service";
import { LogService } from "../../log/domain/service";
import {PreviewChangeDto} from "../../version/adapter/preview.dto";
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import Version from "../../../../../internal/model/version";
import User from "../../../../../internal/model/user";

export class DatabaseCoreService {
    private geminiService: DatabaseGeminiService;
    private validationService: TableValidationService;
    private versionService: VersionService;
    private logService: LogService;
    constructor() {
        this.geminiService = new DatabaseGeminiService();
        this.validationService = new TableValidationService();
        this.versionService = new VersionService();
        this.logService = new LogService();

    }

    public async generateSchemaFromRequirements(userId:string, payload: GenerateDatabasePayload) {
        const {projectId, requirements } = payload;
        let  versionId = payload.versionId;

        if (!requirements || requirements.length === 0) {
            throw new Error("Không có requirements để sinh database.");
        }
        // 1️⃣ Lấy version
        let version = await Version.findById(versionId);
        if (!version) {
            return new ServiceResponse(ResponseStatus.Failed, "Version not found", null, 404);
        }

        // 2️⃣ Auto bump version nếu không phải temporary
        if (version.version_temporary === false) {
            const bumpRes = await this.versionService.bumpVersion(
                versionId,
                userId,
                "minor"
            );

            if (!bumpRes.data) {
            return new ServiceResponse(ResponseStatus.Failed, "Auto bump failed", null, 500);
            }

            version = bumpRes.data.newVersion;
            payload.versionId = version._id.toString(); // update versionId
            versionId = version._id.toString();
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
        const changePayload: PreviewChangeDto = {
            entity_type: "database",
            change_type: "added",
            entity_id: newDatabase._id.toString(),
            before_snapshot: null,
            after_snapshot: newDatabase.toObject()
        };

        await this.versionService.createOrUpdatePreview(
            version._id.toString(),
            userId,
            changePayload
        );

        // 7️⃣ GHI LOG
        const user = await User.findById(userId).lean();
        const username = user?.name || "Unknown User";

        await this.logService.createLog({
            project_id: projectId,
            user_id: userId,
            action: "generate_output",
            target_id: newDatabase._id.toString(),
            target_type: "databases",
            version_number: version.version_number,
            affects_requirement: true,
            level: "info",
            details: {
            message: `${username} generated database ${newDatabase.name} for version ${version.version_number}`
            }
        });
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
    public async updateDatabase(userId:string, databaseId: string, updateData: any) {
        // Validate foreign key relationships if tables are being updated
        // 1️⃣ Lấy database hiện tại
        const db = await DatabaseModel.findById(databaseId);
        if (!db) {
            throw new Error("Database not found");
        }

        let version = await Version.findById(db.version_id);
        if (!version) {
            throw new Error("Version not found");
        }
        // 2️⃣ Auto bump version nếu không phải temporary
        if (version.version_temporary === false) {
            const bumpRes = await this.versionService.bumpVersion(
                version._id.toString(),
                userId,
                "minor"
            );

            if (!bumpRes.data) {
            throw new Error("Auto bump failed");
            }

            version = bumpRes.data.newVersion;

            // Map databaseId sang version mới nếu cần
            const dbMap = bumpRes.data.idMaps.databaseMap;
            if (dbMap && dbMap.has(databaseId)) {
                databaseId = dbMap.get(databaseId).toString();
            } else {
             return new ServiceResponse(ResponseStatus.Failed,"Database no longer exists in new version after bump",null,404);
            }
        }
        if (updateData.tables) {
            updateData.tables.forEach((table: Table) => {
                this.validationService.validateTableStructure(table);
            });
        }
        const beforeUpdate = await DatabaseModel.findById(databaseId).lean();
        const result = await DatabaseModel.updateOne(
            { _id: databaseId },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            throw new Error("Database not found");
        }
        const updatedDb = await DatabaseModel.findById(databaseId).lean(); 
        // 6️⃣ GHI PREVIEW
        const changePayload: PreviewChangeDto = {
            entity_type: "database",
            change_type: "updated",
            entity_id: databaseId,
            before_snapshot: beforeUpdate,
            after_snapshot: updatedDb
        };

        await this.versionService.createOrUpdatePreview(
            version._id.toString(),
            userId,
            changePayload
        );

        // 7️⃣ GHI LOG
        const user = await User.findById(userId).lean();
        const username = user?.name || "Unknown User";

        await this.logService.createLog({
            project_id: db.project_id.toString(),
            user_id: userId,
            action: "update_output",
            target_id: databaseId,
            target_type: "databases",
            version_number: version.version_number,
            affects_requirement: true,
            level: "info",
            details: {
                before: beforeUpdate,
                after: updatedDb,
                message: `${username} updated database ${databaseId} on version ${version.version_number}`
            }
        });
        return await DatabaseModel.findById(databaseId);
    }

    /**
     * Xóa database
     */
    public async deleteDatabase(userId:string, databaseId: string) {
        // 1️⃣ Lấy database hiện tại
        const db = await DatabaseModel.findById(databaseId);
        if (!db) {
            throw new Error("Database not found");
        }

        let version = await Version.findById(db.version_id);
        if (!version) {
            throw new Error("Version not found");
        }

        // 2️⃣ Auto bump version nếu không phải temporary
        if (version.version_temporary === false) {
            const bumpRes = await this.versionService.bumpVersion(
                version._id.toString(),
                userId,
                "minor"
            );

            if (!bumpRes.data) {
                throw new Error("Auto bump failed");
            }

            version = bumpRes.data.newVersion;

            // Map databaseId sang version mới nếu cần
            const dbMap = bumpRes.data.idMaps.databaseMap;
            if (dbMap && dbMap.has(databaseId)) {
                databaseId = dbMap.get(databaseId).toString();
            } else {
             return new ServiceResponse(ResponseStatus.Failed,"Database no longer exists in new version after bump",null,404);
            }
        }

        // 3️⃣ Lấy snapshot trước delete
        const beforeDelete = await DatabaseModel.findById(databaseId).lean();

        // 4️⃣ Xóa database
        const deletedDb = await DatabaseModel.findByIdAndDelete(databaseId);

        // 5️⃣ GHI PREVIEW
        if (beforeDelete) {
            const changePayload: PreviewChangeDto = {
                entity_type: "database",
                change_type: "deleted",
                entity_id: databaseId,
                before_snapshot: beforeDelete,
                after_snapshot: null
            };

            await this.versionService.createOrUpdatePreview(version._id.toString(),userId,changePayload);
        }

        // 6️⃣ GHI LOG
        const user = await User.findById(userId).lean();
        const username = user?.name || "Unknown User";

        await this.logService.createLog({
            project_id: db.project_id.toString(),
            user_id: userId,
            action: "delete_output",
            target_id: databaseId,
            target_type: "databases",
            version_number: version.version_number,
            affects_requirement: true,
            level: "warning",
            details: {
                before: beforeDelete,
                message: `${username} deleted database ${databaseId} on version ${version.version_number}`
            }
        });

        return deletedDb;
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