import { Router } from 'express';
import { TestcaseController } from './controller';
import { requireAuthorizedUser } from '../../../middlewares/auth';

export default function initTestcaseRoute(): Router {
    const router = Router();
    const testcaseController = new TestcaseController();

    // === 🆕 ENTERPRISE TEST CASE GENERATION ROUTES ===

    // [C] Generate ENTERPRISE test cases từ selected requirement IDs
    router.post(
        "/projects/:projectId/versions/:versionId/generate-testcases",
        requireAuthorizedUser,
        testcaseController.generateTestCases
    );

    // [U] Enhance ENTERPRISE test cases với new requirement IDs  
    router.put(
        "/projects/:projectId/versions/:versionId/enhance-testcases",
        requireAuthorizedUser,
        testcaseController.enhanceTestCases
    );

    // === ALTERNATIVE GENERATION ROUTES ===

    // [C] Generate ENTERPRISE test cases từ database schema
    router.post(
        "/projects/:projectId/versions/:versionId/generate-from-database",
        requireAuthorizedUser,
        testcaseController.generateTestCasesFromDatabase
    );

    // [C] Lưu ENTERPRISE test cases vào database
    router.post(
        "/projects/:projectId/versions/:versionId/testcases",
        requireAuthorizedUser,
        testcaseController.saveTestCases
    );

    // Thêm route mới cho preview
    router.post(
        "/projects/:projectId/versions/:versionId/preview-enhancement",
        requireAuthorizedUser,
        testcaseController.enhanceTestCases // Sử dụng cùng controller method với action parameter
    );

    // Hoặc giữ nguyên route cũ với extended functionality
    router.put(
        "/projects/:projectId/versions/:versionId/enhance-testcases",
        requireAuthorizedUser,
        testcaseController.enhanceTestCases
    );

    // === ENTERPRISE TEST CASE MANAGEMENT ROUTES ===

    // [R] Lấy ENTERPRISE test cases theo project
    router.get(
        "/projects/:projectId/testcases",
        requireAuthorizedUser,
        testcaseController.getTestCasesByProject
    );

    // [R] Lấy ENTERPRISE test case theo ID
    router.get(
        "/testcases/:testCaseId",
        requireAuthorizedUser,
        testcaseController.getTestCaseById
    );

    // [U] Cập nhật ENTERPRISE test case
    router.put(
        "/testcases/:testCaseId",
        requireAuthorizedUser,
        testcaseController.updateTestCase
    );

    // [U] Thực thi ENTERPRISE test case
    router.put(
        "/testcases/:testCaseId/execute",
        requireAuthorizedUser,
        testcaseController.executeTestCase
    );

    // [D] Xóa ENTERPRISE test case
    router.delete(
        "/testcases/:testCaseId",
        requireAuthorizedUser,
        testcaseController.deleteTestCase
    );

    // === ENTERPRISE BULK OPERATIONS ROUTES ===

    // [U] Bulk execute ENTERPRISE test cases
    router.put(
        "/projects/:projectId/testcases/bulk-execute",
        requireAuthorizedUser,
        testcaseController.bulkExecuteTestCases
    );

    // === 🆕 ENTERPRISE REPORTING & ANALYTICS ROUTES ===

    // [R] Lấy ENTERPRISE test statistics
    router.get(
        "/projects/:projectId/test-statistics",
        requireAuthorizedUser,
        testcaseController.getTestStatistics
    );

    // [R] Lấy ENTERPRISE database coverage report
    router.get(
        "/projects/:projectId/database-coverage",
        requireAuthorizedUser,
        testcaseController.getDatabaseCoverageReport
    );

    // [R] 🆕 Lấy ENTERPRISE requirement coverage report
    router.get(
        "/projects/:projectId/requirement-coverage",
        requireAuthorizedUser,
        testcaseController.getRequirementCoverageReport
    );

    // [R] Lấy ENTERPRISE test cases theo database table
    router.get(
        "/projects/:projectId/tables/:tableName/testcases",
        requireAuthorizedUser,
        testcaseController.getTestCasesByDatabaseTable
    );

    // [R] 🆕 Tìm ENTERPRISE test cases trùng lặp
    router.get(
        "/projects/:projectId/duplicate-testcases",
        requireAuthorizedUser,
        testcaseController.findDuplicateTestCases
    );

    return router;
}