import { Router } from 'express';
import { DatabaseController } from './controller';
import requireAuthorizedUser from '../../../middlewares/auth';

// route.ts - Sửa logic
export default function initDatabaseRoute(): Router {
    const router = Router();
    const databaseController = new DatabaseController(); // Khởi tạo controller

    router.post(
        "/versions/:versionId/generate-database",
        requireAuthorizedUser,
        databaseController.generateDatabaseSchema
    );
    // [R] - READ: Lấy danh sách DB schemas (lọc theo versionId)
    // Ví dụ: GET /api/databases?versionId=60d...
    router.get(
        "/",
        requireAuthorizedUser,
        databaseController.getDatabasesByVersion
    );

    // [R] - READ: Lấy một DB schema theo ID
    router.get(
        "/:databaseId",
        requireAuthorizedUser,
        databaseController.getDatabaseById
    );

    // [U] - UPDATE: Cập nhật một DB schema
    router.put(
        "/:databaseId",
        requireAuthorizedUser,
        databaseController.updateDatabase
    );

    // [D] - DELETE: Xóa một DB schema
    router.delete(
        "/:databaseId",
        requireAuthorizedUser,
        databaseController.deleteDatabase
    );
    // === CÁC ROUTE CRUD CHO TỪNG BẢNG (THÊM MỚI) ===

    // [C] Thêm bảng: POST /api/databases/:databaseId/tables
    router.post(
        "/:databaseId/tables",
        requireAuthorizedUser,
        databaseController.addTable
    );

    // [U] Sửa bảng: PUT /api/databases/:databaseId/tables/:tableName
    router.put(
        "/:databaseId/tables/:tableName",
        requireAuthorizedUser,
        databaseController.updateTable
    );

    // [D] Xóa bảng: DELETE /api/databases/:databaseId/tables/:tableName
    router.delete(
        "/:databaseId/tables/:tableName",
        requireAuthorizedUser,
        databaseController.deleteTable
    );

    // [R] Lấy database với references đầy đủ
    router.get(
        "/:databaseId/with-references",
        requireAuthorizedUser,
        databaseController.getDatabaseWithReferences
    );

    // [R] Lấy relationships của một bảng
    router.get(
        "/:databaseId/tables/:tableName/relationships",
        requireAuthorizedUser,
        databaseController.getTableRelationships
    );

    // [U] Validate foreign key
    router.post(
        "/:databaseId/validate-foreign-key",
        requireAuthorizedUser,
        databaseController.validateForeignKey
    );

    // [R] Lấy danh sách tables cho references
    router.get(
        "/:databaseId/available-tables",
        requireAuthorizedUser,
        databaseController.getAvailableTablesForReferences
    );
    // [U] Cập nhật vị trí một bảng: PUT /api/databases/:databaseId/tables/:tableName/position
    router.put(
        "/:databaseId/tables/:tableName/position",
        requireAuthorizedUser,
        databaseController.updateTablePosition
    );

    // [U] Cập nhật vị trí nhiều bảng: PUT /api/databases/:databaseId/tables/positions
    router.put(
        "/:databaseId/tables/positions",
        requireAuthorizedUser,
        databaseController.updateMultipleTablePositions
    );

    return router;
}







