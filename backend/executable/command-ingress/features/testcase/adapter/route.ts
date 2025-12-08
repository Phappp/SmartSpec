import { Router } from 'express';
import { TestcaseController } from './controller';
import { requireAuthorizedUser } from '../../../middlewares/auth';

export default function initTestcaseRoute(): Router {
    const router = Router();
    const testcaseController = new TestcaseController();

    // ==================== TEST CASE GENERATION ====================

    // Generate test cases from selected requirements
    router.post(
        "/projects/:projectId/versions/:versionId/generate-testcases",
        requireAuthorizedUser,
        testcaseController.generateTestCases
    );

    // Save test cases to database
    router.post(
        "/projects/:projectId/versions/:versionId/testcases",
        requireAuthorizedUser,
        testcaseController.saveTestCases
    );

    // ==================== BASIC CRUD OPERATIONS ====================

    // Get test cases by project
    router.get(
        "/projects/:projectId/testcases",
        requireAuthorizedUser,
        testcaseController.getTestCasesByProject
    );

    // Get test case by ID
    router.get(
        "/testcases/:testCaseId",
        requireAuthorizedUser,
        testcaseController.getTestCaseById
    );

    // Update test case
    router.put(
        "/testcases/:testCaseId",
        requireAuthorizedUser,
        testcaseController.updateTestCase
    );

    // Execute test case
    router.put(
        "/testcases/:testCaseId/execute",
        requireAuthorizedUser,
        testcaseController.executeTestCase
    );

    // Delete test case
    router.delete(
        "/testcases/:testCaseId",
        requireAuthorizedUser,
        testcaseController.deleteTestCase
    );

    // ==================== BULK OPERATIONS ====================

    // Bulk execute test cases
    router.put(
        "/projects/:projectId/testcases/bulk-execute",
        requireAuthorizedUser,
        testcaseController.bulkExecuteTestCases
    );

    // Bulk update test cases
    router.put(
        "/projects/:projectId/testcases/bulk-update",
        requireAuthorizedUser,
        testcaseController.bulkUpdateTestCases
    );

    // Bulk delete test cases
    router.delete(
        "/projects/:projectId/testcases/bulk-delete",
        requireAuthorizedUser,
        testcaseController.bulkDeleteTestCases
    );

    // ==================== REPORTING & ANALYTICS ====================

    // Get test statistics
    router.get(
        "/projects/:projectId/test-statistics",
        requireAuthorizedUser,
        testcaseController.getTestStatistics
    );

    // Get database coverage report
    router.get(
        "/projects/:projectId/database-coverage",
        requireAuthorizedUser,
        testcaseController.getDatabaseCoverageReport
    );

    // Get requirement coverage report
    router.get(
        "/projects/:projectId/requirement-coverage",
        requireAuthorizedUser,
        testcaseController.getRequirementCoverageReport
    );

    // Get test cases by database table
    router.get(
        "/projects/:projectId/tables/:tableName/testcases",
        requireAuthorizedUser,
        testcaseController.getTestCasesByDatabaseTable
    );

    // Find duplicate test cases
    router.get(
        "/projects/:projectId/duplicate-testcases",
        requireAuthorizedUser,
        testcaseController.findDuplicateTestCases
    );

    // Get dashboard metrics
    router.get(
        "/projects/:projectId/testcase-metrics",
        requireAuthorizedUser,
        testcaseController.getDashboardMetrics
    );

    // ==================== IMPORT/EXPORT ====================

    // Export test cases
    router.get(
        "/projects/:projectId/export-testcases",
        requireAuthorizedUser,
        testcaseController.exportTestCases
    );

    // Import test cases
    router.post(
        "/projects/:projectId/versions/:versionId/import-testcases",
        requireAuthorizedUser,
        testcaseController.importTestCases
    );

    // ==================== EXPORT EXCEL ROUTES ====================

    // Export test cases to Excel
    router.get(
        "/projects/:projectId/export-excel",
        requireAuthorizedUser,
        testcaseController.exportTestCasesToExcel
    );

    // Export test cases to Excel with custom sheets (POST)
    router.post(
        "/projects/:projectId/export-excel",
        requireAuthorizedUser,
        testcaseController.exportTestCasesToExcel
    );

    // Export comprehensive report (all in one)
    router.get(
        "/projects/:projectId/export-comprehensive-report",
        requireAuthorizedUser,
        testcaseController.exportComprehensiveReport
    );


    return router;
}