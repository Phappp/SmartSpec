import { Router } from 'express';
import { DatabaseController } from './controller';
import {requireAuthorizedUser} from '../../../middlewares/auth';

export default function initDatabaseRoute(): Router {
    const router = Router();
    const databaseController = new DatabaseController();

    // === ROUTES CHÍNH CHO DATABASE ===

    // [C] Tạo database từ version
    router.post(
        "/versions/:versionId/generate-database",
        requireAuthorizedUser,
        databaseController.generateDatabaseSchema
    );

    // [R] Lấy danh sách databases (có query filter versionId)
    router.get(
        "/",
        requireAuthorizedUser,
        databaseController.getDatabasesByVersion
    );

    // [R] Lấy database theo ID
    router.get(
        "/:databaseId",
        requireAuthorizedUser,
        databaseController.getDatabaseById
    );

    // [U] Cập nhật database
    router.put(
        "/:databaseId",
        requireAuthorizedUser,
        databaseController.updateDatabase
    );

    // [D] Xóa database
    router.delete(
        "/:databaseId",
        requireAuthorizedUser,
        databaseController.deleteDatabase
    );

    // [R] Lấy database với references đầy đủ
    router.get(
        "/:databaseId/with-references",
        requireAuthorizedUser,
        databaseController.getDatabaseWithReferences
    );

    // === ROUTES CHO TABLES ===

    // [C] Thêm bảng mới
    router.post(
        "/:databaseId/tables",
        requireAuthorizedUser,
        databaseController.addTable
    );

    // [U] Cập nhật vị trí nhiều bảng (nên đặt trước route có :tableName để tránh conflict)
    router.put(
        "/:databaseId/tables/positions",
        requireAuthorizedUser,
        databaseController.updateMultipleTablePositions
    );

    // [U] Cập nhật bảng theo tên
    router.put(
        "/:databaseId/tables/:tableName",
        requireAuthorizedUser,
        databaseController.updateTable
    );

    // [U] Cập nhật vị trí một bảng
    router.put(
        "/:databaseId/tables/:tableName/position",
        requireAuthorizedUser,
        databaseController.updateTablePosition
    );

    // [D] Xóa bảng
    router.delete(
        "/:databaseId/tables/:tableName",
        requireAuthorizedUser,
        databaseController.deleteTable
    );

    // [R] Lấy relationships của một bảng
    router.get(
        "/:databaseId/tables/:tableName/relationships",
        requireAuthorizedUser,
        databaseController.getTableRelationships
    );

    // === ROUTES CHO COMPOSITE KEY MANAGEMENT ===

    // [R] Lấy thông tin composite key của bảng
    router.get(
        "/:databaseId/tables/:tableName/composite-key",
        requireAuthorizedUser,
        databaseController.getCompositeKeyInfo
    );

    // [U] Tạo composite key mới
    router.post(
        "/:databaseId/tables/:tableName/composite-key",
        requireAuthorizedUser,
        databaseController.createCompositeKey
    );

    // [U] Chuyển từ composite key sang single key
    router.post(
        "/:databaseId/tables/:tableName/convert-to-single-key",
        requireAuthorizedUser,
        databaseController.convertToSingleKey
    );

    // === ROUTES CHO VALIDATION & UTILITIES ===

    // [U] Validate foreign key
    router.post(
        "/:databaseId/validate-foreign-key",
        requireAuthorizedUser,
        databaseController.validateForeignKey
    );

    // [U] Validate table structure
    router.post(
        "/:databaseId/validate-table",
        requireAuthorizedUser,
        databaseController.validateTableStructure
    );

    // [R] Lấy danh sách tables cho references
    router.get(
        "/:databaseId/available-tables",
        requireAuthorizedUser,
        databaseController.getAvailableTablesForReferences
    );

    // [R] Lấy thống kê database
    router.get(
        "/:databaseId/stats",
        requireAuthorizedUser,
        databaseController.getDatabaseStats
    );

    // [R] Export database schema thành SQL
    router.get(
        "/:databaseId/export-sql",
        requireAuthorizedUser,
        databaseController.exportDatabaseSQL
    );

    return router;
}