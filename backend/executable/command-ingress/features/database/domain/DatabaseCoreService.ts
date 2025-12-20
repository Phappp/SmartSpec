import DatabaseModel from "../../../../../internal/model/database";
import { DatabaseGeminiService } from "../domain/GeminiService";
import { GenerateDatabasePayload, Table } from "./interfaces";
import { TableValidationService } from "./TableValidationService";
import { VersionService } from "../../version/domain/service";
import { LogService } from "../../log/domain/service";
import { PreviewChangeDto } from "../../version/adapter/preview.dto";
import { ServiceResponse, ResponseStatus } from '../../../services/serviceResponse';
import Version from "../../../../../internal/model/version";
import User from "../../../../../internal/model/user";
import { databaseSocketService } from "./database.socket.service";

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

    public async generateSchemaFromRequirements(userId: string, payload: GenerateDatabasePayload) {
        const { projectId, requirements } = payload;
        let versionId = payload.versionId;

        try {
            if (!requirements || requirements.length === 0) {
                const errorMsg = "Không có requirements để sinh database.";
                // Emit failed event
                if (databaseSocketService && projectId && versionId && userId) {
                    databaseSocketService.emitProgress(projectId, versionId, userId, 100, 'failed', false, undefined, [errorMsg]);
                }
                throw new Error(errorMsg);
            }
            // 1️⃣ Lấy version
            let version = await Version.findById(versionId);
            if (!version) {
                const errorMsg = "Version not found";
                // Emit failed event
                if (databaseSocketService && projectId && versionId && userId) {
                    databaseSocketService.emitProgress(projectId, versionId, userId, 100, 'failed', false, undefined, [errorMsg]);
                }
                return new ServiceResponse(ResponseStatus.Failed, errorMsg, null, 404);
            }

            // 2️⃣ Auto bump version nếu không phải temporary
            if (version.version_temporary === false) {
                const bumpRes = await this.versionService.bumpVersion(
                    versionId,
                    userId,
                    "minor"
                );

                if (!bumpRes.data) {
                    const errorMsg = "Auto bump failed";
                    // Emit failed event
                    if (databaseSocketService && projectId && versionId && userId) {
                        databaseSocketService.emitProgress(projectId, versionId, userId, 100, 'failed', false, undefined, [errorMsg]);
                    }
                    return new ServiceResponse(ResponseStatus.Failed, errorMsg, null, 500);
                }

                version = bumpRes.data.newVersion;
                payload.versionId = version._id.toString(); // update versionId
                versionId = version._id.toString();
            }

            // Emit start event
            if (databaseSocketService && projectId && versionId && userId) {
                databaseSocketService.emitProgress(projectId, versionId, userId, 10, 'generating', true);
            }

            const databaseSchema = await this.geminiService.generateDatabaseSchema(requirements, 'vi-VN', userId, projectId);

            // ✅ FIX: Thêm một bước fix composite keys trước khi validate
            // Đảm bảo tất cả composite keys đều có primary_key_order
            if (databaseSchema?.tables) {
                for (const table of databaseSchema.tables) {
                    if (!table?.columns) continue;

                    const primaryKeys = table.columns.filter((col: any) =>
                        col.is_primary_key === true ||
                        col.is_primary_key === "true" ||
                        col.is_primary_key === 1
                    );

                    if (primaryKeys.length > 1) {
                        // Composite key - đảm bảo tất cả đều có primary_key_order
                        let order = 1;
                        for (const pk of primaryKeys) {
                            if (pk.primary_key_order == null || pk.primary_key_order === undefined) {
                                console.log(`🔧 [Pre-Validation Fix] Setting primary_key_order for ${table.name}.${pk.name} = ${order}`);
                                pk.primary_key_order = order;
                            }
                            pk.nullable = false; // Composite keys không thể null
                            order++;
                        }
                    }
                }
            }

            // Validate generated schema
            try {
                databaseSchema.tables.forEach((table: Table) => {
                    this.validationService.validateTableStructure(table);
                });
            } catch (validationError: any) {
                const errorMsg = validationError.message || 'Database schema validation failed';
                // Emit failed event
                if (databaseSocketService && projectId && versionId && userId) {
                    databaseSocketService.emitProgress(projectId, versionId, userId, 100, 'failed', false, undefined, [errorMsg]);
                }
                throw validationError;
            }

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

            // Emit completion event
            if (databaseSocketService && projectId && versionId && userId) {
                databaseSocketService.emitProgress(projectId, versionId, userId, 100, 'completed', false);
            }

            return newDatabase;
        } catch (error: any) {
            console.error('❌ Error generating database schema:', error);
            // Emit failed event với error message
            if (databaseSocketService && projectId && versionId && userId) {
                const errorMsg = error.message || 'Failed to generate database schema';
                databaseSocketService.emitProgress(projectId, versionId, userId, 100, 'failed', false, undefined, [errorMsg]);
            }
            throw error; // Re-throw để controller xử lý
        }
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
    public async updateDatabase(userId: string, databaseId: string, updateData: any) {
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
                throw new Error("Database no longer exists in new version after bump");
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
        const updatedDbLean = await DatabaseModel.findById(databaseId).lean();
        // 6️⃣ GHI PREVIEW
        const changePayload: PreviewChangeDto = {
            entity_type: "database",
            change_type: "updated",
            entity_id: databaseId,
            before_snapshot: beforeUpdate,
            after_snapshot: updatedDbLean
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
                after: updatedDbLean,
                message: `${username} updated database ${databaseId} on version ${version.version_number}`
            }
        });

        // Get full database document (not lean) để return
        const updatedDb = await DatabaseModel.findById(databaseId);
        if (!updatedDb) {
            throw new Error("Database not found after update");
        }

        // Return cả database và version info để frontend có thể cập nhật selectedVersionId
        return {
            database: updatedDb,
            version: version,
            newVersionId: version._id.toString()
        };
    }

    /**
     * Xóa database
     */
    public async deleteDatabase(userId: string, databaseId: string) {
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
                throw new Error("Database no longer exists in new version after bump");
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

            await this.versionService.createOrUpdatePreview(version._id.toString(), userId, changePayload);
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

        // Return cả deletedDb và version info để frontend có thể cập nhật selectedVersionId
        return {
            database: deletedDb,
            version: version,
            newVersionId: version._id.toString()
        };
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
    public async exportDatabaseSQL(databaseId: string, dialect: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle' | 'sqlite' = 'mysql') {
        const { SQLGenerationService } = await import('./SQLGenerationService');
        const sqlService = new SQLGenerationService();

        return sqlService.generateSQL(databaseId, {
            dialect,
            includeIndexes: true,
            includeComments: true,
            foreignKeyActions: {
                onDelete: 'RESTRICT',
                onUpdate: 'RESTRICT'
            }
        });
    }
}