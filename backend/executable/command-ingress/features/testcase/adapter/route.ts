import { Router } from 'express';
import { TestcaseController } from './controller';
import { requireAuthorizedUser } from '../../../middlewares/auth';

export default function initTestcaseRoute(): Router {
    const router = Router();
    const testcaseController = new TestcaseController();

    // === 🆕 SIMPLIFIED ROUTES ===

    // [C] Generate test cases từ selected requirement IDs
    router.post(
        "/projects/:projectId/versions/:versionId/generate-testcases",
        requireAuthorizedUser,
        testcaseController.generateTestCases
    );

    // [U] Enhance test cases với new requirement IDs  
    router.put(
        "/projects/:projectId/versions/:versionId/enhance-testcases",
        requireAuthorizedUser,
        testcaseController.enhanceTestCases
    );

    // === ALTERNATIVE ROUTES (giữ nguyên) ===

    // [C] Generate test cases từ database schema
    router.post(
        "/projects/:projectId/versions/:versionId/generate-from-database",
        requireAuthorizedUser,
        testcaseController.generateTestCasesFromDatabase
    );

    // [C] Lưu test cases vào database
    router.post(
        "/projects/:projectId/versions/:versionId/testcases",
        requireAuthorizedUser,
        testcaseController.saveTestCases
    );

    // === ROUTES CHO TEST CASE MANAGEMENT (giữ nguyên) ===

    // [R] Lấy test cases theo project
    router.get(
        "/projects/:projectId/testcases",
        requireAuthorizedUser,
        testcaseController.getTestCasesByProject
    );

    // [R] Lấy test case theo ID
    router.get(
        "/testcases/:testCaseId",
        requireAuthorizedUser,
        testcaseController.getTestCaseById
    );

    // [U] Cập nhật test case
    router.put(
        "/testcases/:testCaseId",
        requireAuthorizedUser,
        testcaseController.updateTestCase
    );

    // [U] Thực thi test case
    router.put(
        "/testcases/:testCaseId/execute",
        requireAuthorizedUser,
        testcaseController.executeTestCase
    );

    // [D] Xóa test case
    router.delete(
        "/testcases/:testCaseId",
        requireAuthorizedUser,
        testcaseController.deleteTestCase
    );

    // === ROUTES CHO BULK OPERATIONS (giữ nguyên) ===

    // [U] Bulk execute test cases
    router.put(
        "/projects/:projectId/testcases/bulk-execute",
        requireAuthorizedUser,
        testcaseController.bulkExecuteTestCases
    );

    // === ROUTES CHO REPORTING & ANALYTICS (giữ nguyên) ===

    // [R] Lấy test statistics
    router.get(
        "/projects/:projectId/test-statistics",
        requireAuthorizedUser,
        testcaseController.getTestStatistics
    );

    // [R] Lấy database coverage report
    router.get(
        "/projects/:projectId/database-coverage",
        requireAuthorizedUser,
        testcaseController.getDatabaseCoverageReport
    );

    // [R] Lấy test cases theo database table
    router.get(
        "/projects/:projectId/tables/:tableName/testcases",
        requireAuthorizedUser,
        testcaseController.getTestCasesByDatabaseTable
    );

    return router;
}