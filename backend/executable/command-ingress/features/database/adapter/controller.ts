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
            // --- THAY ĐỔI TẠI ĐÂY ---
            // Lấy versionId từ URL params thay vì body
            const { versionId } = req.params;

            if (!versionId) {
                res.status(400).json({ message: "versionId là bắt buộc." });
                return;
            }

            const version = await VersionModel.findById(versionId);
            if (!version) {
                // throw new NotFoundError(`Không tìm thấy version với id: ${versionId}`);
                console.log(`Không tìm thấy version với id: ${versionId}`)
                // Cần return hoặc throw lỗi ở đây để dừng thực thi
                res.status(404).json({ message: `Không tìm thấy version với id: ${versionId}` });
                return;
            }

            // ... logic còn lại giữ nguyên ...
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
        } catch (error) {
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
            const tableData = req.body; // Dữ liệu của bảng mới nằm trong body
            const updatedDatabase = await this.databaseService.addTableToDatabase(databaseId, tableData);
            if (!updatedDatabase) {
                res.status(404).json({ message: "Không tìm thấy database schema để thêm bảng." });
                return;
            }
            res.status(201).json({ message: "Thêm bảng thành công!", data: updatedDatabase });
        } catch (error) {
            next(error);
        }
    }

    // [U] - UPDATE: Cập nhật một bảng
    public updateTable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId, tableName } = req.params;
            const tableData = req.body;
            const updatedDatabase = await this.databaseService.updateTableInDatabase(databaseId, tableName, tableData);
            if (!updatedDatabase) {
                res.status(404).json({ message: `Không tìm thấy bảng '${tableName}' để cập nhật.` });
                return;
            }
            res.status(200).json({ message: "Cập nhật bảng thành công!", data: updatedDatabase });
        } catch (error) {
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
            res.status(200).json({ message: "Xóa bảng thành công!", data: updatedDatabase });
        } catch (error) {
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
        } catch (error) {
            next(error);
        }
    }

    // [U] - VALIDATE: Validate foreign key reference
    public validateForeignKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId } = req.params;
            const { tableName, columnName, referencedTable } = req.body;

            if (!tableName || !columnName || !referencedTable) {
                res.status(400).json({ message: "tableName, columnName và referencedTable là bắt buộc." });
                return;
            }

            const validation = await this.databaseService.validateForeignKey(databaseId, tableName, columnName, referencedTable);
            res.status(200).json({ data: validation });
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
            next(error);
        }
    }

    // [U] - UPDATE: Cập nhật vị trí nhiều bảng
    // controller.ts

    // [U] - UPDATE: Cập nhật vị trí nhiều bảng - FIXED VERSION
    public updateMultipleTablePositions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { databaseId } = req.params;
            // SỬA LẠI DÒNG NÀY
            const positionUpdates = req.body;

            if (!positionUpdates || !Array.isArray(positionUpdates) || positionUpdates.length === 0) {
                res.status(400).json({ message: "Body của request phải là một mảng positionUpdates và không được rỗng." });
                return;
            }

            // Validation cơ bản (giữ nguyên)
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

            const updatedDatabase = await this.databaseService.updateMultipleTablePositions(databaseId, positionUpdates);

            // Logic trả về response giữ nguyên
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

        } catch (error) {
            console.error('Error in updateMultipleTablePositions controller:', error);
            next(error); // Chuyển lỗi cho middleware xử lý
        }
    }

}