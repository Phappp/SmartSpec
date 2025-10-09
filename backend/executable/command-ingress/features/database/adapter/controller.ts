// src/features/database/adapter/controller.ts

import { Request, Response, NextFunction } from "express";
import { DatabaseService } from "../domain/service";
import VersionModel from "../../../../../internal/model/version";

export class DatabaseController {
    private databaseService: DatabaseService;

    constructor() {
        this.databaseService = new DatabaseService();
    }

    /**
     * Endpoint để sinh schema database từ một version_id.
     */
    public generateDatabaseSchema = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { versionId } = req.params;

            if (!versionId) {
                res.status(400).json({ message: "versionId là bắt buộc." });
                return;
            }

            const version = await VersionModel.findById(versionId);
            if (!version) {
                res.status(404).json({ message: `Không tìm thấy version với id: ${versionId}` });
                return;
            }

            const payload = {
                versionId: version._id.toString(),
                projectId: version.project_id.toString(),
                requirements: version.requirement_model,
            };

            const newDatabase = await this.databaseService.generateSchemaFromRequirements(payload);

            res.status(201).json({
                message: "Tạo database schema thành công!",
                data: newDatabase
            });

        } catch (error) {
            next(error);
        }
    }

    // [R] - READ: Lấy danh sách DB theo versionId
    public getDatabasesByVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { versionId } = req.query;
            if (!versionId) {
                res.status(400).json({ message: "Query param 'versionId' là bắt buộc." });
                return;
            }
            const databases = await this.databaseService.getDatabasesByVersion(versionId as string);
            res.status(200).json({ data: databases });
        } catch (error) {
            next(error);
        }
    }

    // [R] - READ: Lấy DB theo ID
    public getDatabaseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId } = req.params;
            const database = await this.databaseService.getDatabaseById(databaseId);
            if (!database) {
                res.status(404).json({ message: "Không tìm thấy database schema." });
                return;
            }
            res.status(200).json({ data: database });
        } catch (error) {
            next(error);
        }
    }

    // [U] - UPDATE: Cập nhật DB theo ID
    public updateDatabase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId } = req.params;
            const updatedDatabase = await this.databaseService.updateDatabase(databaseId, req.body);
            if (!updatedDatabase) {
                res.status(404).json({ message: "Không tìm thấy database schema để cập nhật." });
                return;
            }
            res.status(200).json({ message: "Cập nhật thành công!", data: updatedDatabase });
        } catch (error: any) {
            // Xử lý lỗi validation từ service
            if (error.message.includes('foreign key') || error.message.includes('primary key') ||
                error.message.includes('duplicate') || error.message.includes('invalid')) {
                res.status(400).json({ message: error.message });
                return;
            }
            next(error);
        }
    }

    // [D] - DELETE: Xóa DB theo ID
    public deleteDatabase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId } = req.params;
            const deletedDatabase = await this.databaseService.deleteDatabase(databaseId);
            if (!deletedDatabase) {
                res.status(404).json({ message: "Không tìm thấy database schema để xóa." });
                return;
            }
            res.status(200).json({ message: "Xóa thành công!" });
        } catch (error) {
            next(error);
        }
    }

    // --- CÁC HÀM CRUD CHO TỪNG BẢNG (THÊM MỚI) ---

    // [C] - CREATE: Thêm một bảng mới vào DB schema
    public addTable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId } = req.params;
            const tableData = req.body;

            // Validation cơ bản trên controller level
            if (!tableData.name || !tableData.columns || !Array.isArray(tableData.columns)) {
                res.status(400).json({
                    message: "Table data phải có name và columns (array)"
                });
                return;
            }

            const updatedDatabase = await this.databaseService.addTableToDatabase(databaseId, tableData);

            res.status(201).json({
                message: "Thêm bảng thành công!",
                data: updatedDatabase
            });

        } catch (error: any) {
            // Xử lý các lỗi validation từ service
            if (error.message.includes('already exists') ||
                error.message.includes('invalid') ||
                error.message.includes('duplicate') ||
                error.message.includes('primary key') ||
                error.message.includes('foreign key')) {
                res.status(400).json({ message: error.message });
                return;
            }

            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
                return;
            }

            next(error);
        }
    }

    // [U] - UPDATE: Cập nhật một bảng
    public updateTable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId, tableName } = req.params;
            const tableData = req.body;

            // Validation cơ bản
            if (!tableData.name || !tableData.columns || !Array.isArray(tableData.columns)) {
                res.status(400).json({
                    message: "Table data phải có name và columns (array)"
                });
                return;
            }

            const updatedDatabase = await this.databaseService.updateTableInDatabase(
                databaseId,
                tableName,
                tableData
            );

            if (!updatedDatabase) {
                res.status(404).json({ message: `Không tìm thấy database hoặc bảng '${tableName}' để cập nhật.` });
                return;
            }

            res.status(200).json({
                message: "Cập nhật bảng thành công!",
                data: updatedDatabase
            });

        } catch (error: any) {
            // Xử lý các lỗi validation từ service
            if (error.message.includes('already exists') ||
                error.message.includes('invalid') ||
                error.message.includes('duplicate') ||
                error.message.includes('primary key') ||
                error.message.includes('foreign key') ||
                error.message.includes('referenced by') ||
                error.message.includes('circular reference')) {
                res.status(400).json({ message: error.message });
                return;
            }

            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
                return;
            }

            next(error);
        }
    }

    // [D] - DELETE: Xóa một bảng
    public deleteTable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId, tableName } = req.params;

            const updatedDatabase = await this.databaseService.deleteTableFromDatabase(databaseId, tableName);

            if (!updatedDatabase) {
                res.status(404).json({ message: `Không tìm thấy bảng '${tableName}' để xóa.` });
                return;
            }

            res.status(200).json({
                message: "Xóa bảng thành công!",
                data: updatedDatabase
            });

        } catch (error: any) {
            // Xử lý lỗi foreign key constraint
            if (error.message.includes('referenced by') ||
                error.message.includes('foreign key') ||
                error.message.includes('constraint')) {
                res.status(409).json({ // 409 Conflict - có ràng buộc không cho xóa
                    message: error.message,
                    code: 'FOREIGN_KEY_CONSTRAINT'
                });
                return;
            }

            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
                return;
            }

            next(error);
        }
    }

    // [R] - READ: Lấy database với references đầy đủ
    public getDatabaseWithReferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId } = req.params;
            const database = await this.databaseService.getDatabaseWithReferences(databaseId);
            if (!database) {
                res.status(404).json({ message: "Không tìm thấy database schema." });
                return;
            }
            res.status(200).json({ data: database });
        } catch (error) {
            next(error);
        }
    }

    // [R] - READ: Lấy relationships của một bảng
    public getTableRelationships = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId, tableName } = req.params;
            const relationships = await this.databaseService.getTableRelationships(databaseId, tableName);
            res.status(200).json({ data: relationships });
        } catch (error: any) {
            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
                return;
            }
            next(error);
        }
    }

    // [U] - VALIDATE: Validate foreign key reference
    public validateForeignKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId } = req.params;
            const { tableName, columnName, referencedTable, columnType } = req.body;

            if (!tableName || !columnName || !referencedTable || !columnType) {
                res.status(400).json({
                    message: "tableName, columnName, referencedTable và columnType là bắt buộc."
                });
                return;
            }

            // Gọi service validation mới với columnType
            const validation = await this.databaseService.validateForeignKeyConstraint(
                databaseId,
                tableName,
                columnName,
                referencedTable,
                columnType
            );

            res.status(200).json({
                valid: true,
                message: "Foreign key validation passed",
                data: validation
            });

        } catch (error: any) {
            // Trả về validation failed nhưng không phải lỗi server
            if (error.message.includes('does not exist') ||
                error.message.includes('no primary key') ||
                error.message.includes('type mismatch') ||
                error.message.includes('circular reference')) {
                res.status(200).json({
                    valid: false,
                    message: error.message,
                    data: null
                });
                return;
            }
            next(error);
        }
    }

    // [R] - READ: Lấy danh sách tables available cho references
    public getAvailableTablesForReferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId } = req.params;
            const { excludeTable } = req.query;

            const tables = await this.databaseService.getAvailableTablesForReferences(
                databaseId,
                excludeTable as string
            );
            res.status(200).json({ data: tables });
        } catch (error: any) {
            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
                return;
            }
            next(error);
        }
    }

    // [U] - UPDATE: Cập nhật vị trí một bảng
    public updateTablePosition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId, tableName } = req.params;
            const { position } = req.body;

            if (!position || typeof position.x === 'undefined' || typeof position.y === 'undefined') {
                res.status(400).json({ message: "Position với tọa độ x và y là bắt buộc." });
                return;
            }

            const updatedDatabase = await this.databaseService.updateTablePosition(databaseId, tableName, position);
            if (!updatedDatabase) {
                res.status(404).json({ message: `Không tìm thấy bảng '${tableName}' để cập nhật vị trí.` });
                return;
            }

            res.status(200).json({
                message: "Cập nhật vị trí bảng thành công!",
                data: updatedDatabase
            });
        } catch (error: any) {
            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
                return;
            }
            next(error);
        }
    }

    // [U] - UPDATE: Cập nhật vị trí nhiều bảng
    public updateMultipleTablePositions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId } = req.params;
            const positionUpdates = req.body;

            if (!positionUpdates || !Array.isArray(positionUpdates) || positionUpdates.length === 0) {
                res.status(400).json({
                    message: "Body của request phải là một mảng positionUpdates và không được rỗng."
                });
                return;
            }

            // Validation cơ bản
            for (const update of positionUpdates) {
                if (!update.tableName || !update.position ||
                    typeof update.position.x === 'undefined' ||
                    typeof update.position.y === 'undefined') {
                    res.status(400).json({
                        message: "Mỗi phần tử trong mảng phải có tableName và position với x, y."
                    });
                    return;
                }
            }

            const updatedDatabase = await this.databaseService.updateMultipleTablePositions(
                databaseId,
                positionUpdates
            );

            if (!updatedDatabase) {
                res.status(200).json({
                    message: "Positions updated with some warnings",
                    data: null,
                    warnings: ["Some tables may not have been updated because database was not found or an error occurred."]
                });
                return;
            }

            res.status(200).json({
                message: "Cập nhật vị trí nhiều bảng thành công!",
                data: updatedDatabase
            });

        } catch (error: any) {
            console.error('Error in updateMultipleTablePositions controller:', error);

            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
                return;
            }

            next(error);
        }
    }
}