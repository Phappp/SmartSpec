// src/features/testcase/adapter/controller.ts

import { Response, NextFunction } from "express";
import { TestcaseService } from "../domain/service";
import { HttpRequest } from "../../../types/http_request";
import { TestcaseExportService, ExportFilters } from '../domain/exportService';
import Database from "../../../../../internal/model/database";
import Version from "../../../../../internal/model/version";
import * as ExcelJS from 'exceljs';

export class TestcaseController {
    private testcaseService: TestcaseService;
    private exportService: TestcaseExportService

    constructor() {
        this.testcaseService = new TestcaseService();
        this.exportService = new TestcaseExportService();
    }

    /**
     * Generate test cases from selected requirements
     */
    /**
 * Generate test cases from selected requirements
 */
    public generateTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.getSubject();
            if (!userId) {
                handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
                return;
            }
            const { projectId, versionId } = req.params;
            const {
                selectedRequirementIds,
                language = 'vi-VN',
                testType = 'all' // MẶC ĐỊNH LÀ 'all'
            } = req.body;

            if (!projectId || !versionId) {
                res.status(400).json({
                    message: "projectId and versionId are required"
                });
                return;
            }

            if (!selectedRequirementIds || !Array.isArray(selectedRequirementIds) || selectedRequirementIds.length === 0) {
                res.status(400).json({
                    message: "selectedRequirementIds must be a non-empty array"
                });
                return;
            }

            // Validate testType - THÊM 'all' vào valid types
            const validTestTypes = ['all', 'unit', 'integration', 'api', 'ui', 'performance', 'security'];
            if (!validTestTypes.includes(testType)) {
                res.status(400).json({
                    message: `Invalid testType. Valid values: ${validTestTypes.join(', ')}`
                });
                return;
            }

            console.log(`🎯 Generating ${testType} test cases for ${selectedRequirementIds.length} requirements`);

            const testCases = await this.testcaseService.generateTestCases(
                projectId,
                versionId,
                userId,
                selectedRequirementIds,
                language,
                testType
            );

            // Phân tích test types distribution
            const testTypeDistribution = this.analyzeTestTypeDistribution(testCases);

            res.status(201).json({
                message: `Successfully generated ${testCases.length} ${testType} test cases`,
                data: testCases,
                count: testCases.length,
                metadata: {
                    selected_requirements_count: selectedRequirementIds.length,
                    database_tables_covered: this.extractDatabaseTablesCoverage(testCases),
                    requirements_covered: this.extractRequirementsCoverage(testCases),
                    test_type: testType,
                    test_type_distribution: testTypeDistribution // THÊM phân bố test types
                }
            });

        } catch (error: any) {
            console.error("❌ Error generating test cases:", error);

            if (error.message.includes('not found')) {
                res.status(404).json({
                    message: error.message
                });
                return;
            }

            if (error.message.includes('No requirements selected') || error.message.includes('No matching requirements')) {
                res.status(400).json({
                    message: error.message
                });
                return;
            }

            if (error.message.includes('API key') || error.message.includes('Gemini')) {
                res.status(503).json({
                    message: "Test case generation service temporarily unavailable",
                    error: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Analyze test type distribution
     */
    private analyzeTestTypeDistribution(testCases: any[]): any {
        const distribution: any = {};

        testCases.forEach(tc => {
            const testType = tc.test_type || 'unknown';
            distribution[testType] = (distribution[testType] || 0) + 1;
        });

        return distribution;
    }


    /**
     * Save test cases to database
     */
    public saveTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.getSubject();
            if (!userId) {
                handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
                return;
            }
            const { projectId, versionId } = req.params;
            const { testCases } = req.body;
            const createdBy = req.getSubject ? req.getSubject() : undefined;

            console.log('📥 Controller received:', {
                projectId,
                versionId,
                testCasesCount: testCases?.length,
                createdBy
            });

            if (!projectId || !versionId) {
                res.status(400).json({ message: "projectId and versionId are required" });
                return;
            }

            if (!testCases || !Array.isArray(testCases)) {
                res.status(400).json({ message: "testCases must be an array" });
                return;
            }

            // Validate test case format
            const validationErrors = this.validateTestCases(testCases);
            if (validationErrors.length > 0) {
                res.status(400).json({
                    message: "Invalid test case data",
                    errors: validationErrors
                });
                return;
            }

            console.log(`💾 Saving ${testCases.length} test cases`);

            const savedTestCases = await this.testcaseService.saveTestCases(
                projectId,
                versionId,
                testCases,
                createdBy
                userId,
                requirementIds,
                language
            );

            console.log('✅ Controller: Test cases saved successfully', savedTestCases.length);

            res.status(201).json({
                message: `Successfully saved ${savedTestCases.length} test cases`,
                data: savedTestCases,
                count: savedTestCases.length,
                insertedCount: savedTestCases.length
            });

        } catch (error: any) {
            console.error("❌ Error saving test cases:", error);

            if (error.message.includes('validation failed')) {
                res.status(400).json({
                    message: "Invalid test case data",
                    error: error.message
                });
                return;
            }

            if (error.message.includes('duplicate')) {
                res.status(400).json({
                    message: "Duplicate test cases",
                    error: error.message
                });
                return;
            }

            next(error);
        }
    }


    /**
     * Get test cases by project
     */
    public getTestCasesByProject = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId, test_type, status, priority, database_tables } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            const filters: any = {};
            if (test_type) filters.test_type = test_type;
            if (status) filters.status = status;
            if (priority) filters.priority = priority;
            if (database_tables) filters.database_tables = database_tables;

            console.log(`📋 Getting test cases for project ${projectId}`);

            const testCases = await this.testcaseService.getTestCasesByProject(
                projectId,
                versionId as string,
                filters
            );

            res.status(200).json({
                message: "Successfully retrieved test cases",
                data: testCases,
                count: testCases.length
            });

        } catch (error) {
            console.error("❌ Error getting test cases:", error);
            next(error);
        }
    }

    /**
     * Get test case by ID
     */
    public getTestCaseById = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { testCaseId } = req.params;

            if (!testCaseId) {
                res.status(400).json({ message: "testCaseId is required" });
                return;
            }

            const testCase = await this.testcaseService.getTestCaseById(testCaseId);

            if (!testCase) {
                res.status(404).json({ message: `Test case not found: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Successfully retrieved test case",
                data: testCase
            });

        } catch (error) {
            console.error("❌ Error getting test case:", error);
            next(error);
        }
    }

    /**
     * Update test case
     */
    public updateTestCase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { testCaseId } = req.params;
            const updateData = req.body;
            const updatedBy = req.getSubject ? req.getSubject() : undefined;

            if (!testCaseId) {
                res.status(400).json({ message: "testCaseId is required" });
                return;
            }

            if (!updateData || Object.keys(updateData).length === 0) {
                res.status(400).json({ message: "updateData is required" });
                return;
            }

            console.log(`✏️ Updating test case ${testCaseId}`);

            const updatedTestCase = await this.testcaseService.updateTestCase(
                testCaseId,
                updateData,
                updatedBy
            );

            if (!updatedTestCase) {
                res.status(404).json({ message: `Test case not found: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Successfully updated test case",
                data: updatedTestCase
            });

        } catch (error: any) {
            console.error("❌ Error updating test case:", error);

            if (error.message.includes('validation failed')) {
                res.status(400).json({
                    message: "Invalid update data",
                    error: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Execute test case
     */
    public executeTestCase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { testCaseId } = req.params;
            const executionData = req.body;
            const executedBy = req.getSubject ? req.getSubject() : undefined;

            if (!testCaseId) {
                res.status(400).json({ message: "testCaseId is required" });
                return;
            }

            if (!executionData || !executionData.status) {
                res.status(400).json({ message: "executionData with status is required" });
                return;
            }

            const validStatuses = ['not_executed', 'passed', 'failed', 'blocked', 'skipped', 'in_progress'];
            if (!validStatuses.includes(executionData.status)) {
                res.status(400).json({
                    message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
                });
                return;
            }

            console.log(`🎯 Executing test case ${testCaseId}`);

            const executedTestCase = await this.testcaseService.executeTestCase(
                testCaseId,
                executionData,
                executedBy
            );

            if (!executedTestCase) {
                res.status(404).json({ message: `Test case not found: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Successfully executed test case",
                data: executedTestCase
            });

        } catch (error: any) {
            console.error("❌ Error executing test case:", error);

            if (error.message.includes('validation failed')) {
                res.status(400).json({
                    message: "Invalid execution data",
                    error: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Delete test case
     */
    public deleteTestCase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { testCaseId } = req.params;

            if (!testCaseId) {
                res.status(400).json({ message: "testCaseId is required" });
                return;
            }

            console.log(`🗑️ Deleting test case ${testCaseId}`);

            const deletedTestCase = await this.testcaseService.deleteTestCase(testCaseId);

            if (!deletedTestCase) {
                res.status(404).json({ message: `Test case not found: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Successfully deleted test case",
                data: { id: testCaseId }
            });

        } catch (error) {
            console.error("❌ Error deleting test case:", error);
            next(error);
        }
    }

    /**
     * Get test statistics
     */
    public getTestStatistics = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            console.log(`📊 Getting test statistics for project ${projectId}`);

            const statistics = await this.testcaseService.getTestStatistics(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Successfully retrieved test statistics",
                data: statistics
            });

        } catch (error) {
            console.error("❌ Error getting test statistics:", error);
            next(error);
        }
    }

    /**
     * Get database coverage report
     */
    public getDatabaseCoverageReport = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            console.log(`📊 Getting database coverage report for project ${projectId}`);

            const coverageReport = await this.testcaseService.getDatabaseCoverageReport(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Successfully retrieved database coverage report",
                data: coverageReport
            });

        } catch (error) {
            console.error("❌ Error getting database coverage report:", error);
            next(error);
        }
    }

    /**
     * Get requirement coverage report
     */
    public getRequirementCoverageReport = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            console.log(`📋 Getting requirement coverage report for project ${projectId}`);

            const coverageReport = await this.testcaseService.getRequirementCoverageReport(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Successfully retrieved requirement coverage report",
                data: coverageReport
            });

        } catch (error) {
            console.error("❌ Error getting requirement coverage report:", error);
            next(error);
        }
    }

    /**
     * Find duplicate test cases
     */
    public findDuplicateTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            console.log(`🔍 Finding duplicate test cases for project ${projectId}`);

            const duplicates = await this.testcaseService.findDuplicateTestCases(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Successfully found duplicate test cases",
                data: duplicates,
                count: duplicates.length
            });

        } catch (error) {
            console.error("❌ Error finding duplicate test cases:", error);
            next(error);
        }
    }

    /**
     * Get test cases by database table
     */
    public getTestCasesByDatabaseTable = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, tableName } = req.params;
            const { versionId } = req.query;

            if (!projectId || !tableName) {
                res.status(400).json({ message: "projectId and tableName are required" });
                return;
            }

            console.log(`🗃️ Getting test cases for table ${tableName}`);

            const testCases = await this.testcaseService.getTestCasesByDatabaseTable(
                projectId,
                tableName,
                versionId as string
            );

            res.status(200).json({
                message: `Successfully retrieved test cases for table ${tableName}`,
                data: testCases,
                count: testCases.length
            });

        } catch (error) {
            console.error("❌ Error getting test cases by database table:", error);
            next(error);
        }
    }

    /**
     * Bulk execute test cases
     */
    public bulkExecuteTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.getSubject();
            if (!userId) {
                handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
                return;
            }
            const { projectId } = req.params;
            const { testCaseIds, executionData } = req.body;
            const executedBy = req.getSubject ? req.getSubject() : undefined;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            if (!testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
                res.status(400).json({ message: "testCaseIds must be a non-empty array" });
                return;
            }

            if (!executionData || !executionData.status) {
                res.status(400).json({ message: "executionData with status is required" });
                return;
            }

            console.log(`⚡ Bulk executing ${testCaseIds.length} test cases`);

            const results = [];
            const errors = [];

            for (const testCaseId of testCaseIds) {
                try {
                    const result = await this.testcaseService.executeTestCase(
                        testCaseId,
                        executionData,
                        executedBy
                    );
                    if (result) {
                        results.push(result);
                    } else {
                        errors.push({ testCaseId, error: 'Test case not found' });
                    }
                } catch (error: any) {
                    errors.push({ testCaseId, error: error.message });
                }
            }

            res.status(200).json({
                message: `Bulk execution completed`,
                data: {
                    successful: results.length,
                    failed: errors.length,
                    results: results,
                    errors: errors
                }
            });

        } catch (error) {
            console.error("❌ Error in bulk execute test cases:", error);
            next(error);
        }
    }

    /**
     * Bulk update test cases
     */
    public bulkUpdateTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { testCaseIds, updateData } = req.body;
            const updatedBy = req.getSubject ? req.getSubject() : undefined;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            if (!testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
                res.status(400).json({ message: "testCaseIds must be a non-empty array" });
                return;
            }

            if (!updateData || Object.keys(updateData).length === 0) {
                res.status(400).json({ message: "updateData is required" });
                return;
            }

            console.log(`⚡ Bulk updating ${testCaseIds.length} test cases`);

            const result = await this.testcaseService.bulkUpdateTestCases(
                testCaseIds,
                updateData,
                updatedBy
            );

            res.status(200).json({
                message: "Bulk update completed",
                data: result
            });

        } catch (error) {
            console.error("❌ Error in bulk update test cases:", error);
            next(error);
        }
    }

    /**
     * Bulk delete test cases
     */
    public bulkDeleteTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { testCaseIds } = req.body;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            if (!testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
                res.status(400).json({ message: "testCaseIds must be a non-empty array" });
                return;
            }

            console.log(`⚡ Bulk deleting ${testCaseIds.length} test cases`);

            const result = await this.testcaseService.bulkDeleteTestCases(testCaseIds);

            res.status(200).json({
                message: "Bulk delete completed",
                data: result
            });

        } catch (error) {
            console.error("❌ Error in bulk delete test cases:", error);
            next(error);
        }
    }

    /**
     * Export test cases
     */
    public exportTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            console.log(`📤 Exporting test cases for project ${projectId}`);

            const exportData = await this.testcaseService.exportTestCases(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Successfully exported test cases",
                data: exportData
            });

        } catch (error) {
            console.error("❌ Error exporting test cases:", error);
            next(error);
        }
    }

    /**
     * Import test cases
     */
    public importTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, versionId } = req.params;
            const { importData } = req.body;
            const createdBy = req.getSubject ? req.getSubject() : undefined;

            if (!projectId || !versionId) {
                res.status(400).json({ message: "projectId and versionId are required" });
                return;
            }

            if (!importData || !importData.test_cases) {
                res.status(400).json({ message: "importData with test_cases is required" });
                return;
            }

            console.log(`📥 Importing ${importData.test_cases.length} test cases`);

            const result = await this.testcaseService.importTestCases(
                projectId,
                versionId,
                importData,
                createdBy
            );

            res.status(201).json({
                message: "Successfully imported test cases",
                data: result
            });

        } catch (error) {
            console.error("❌ Error importing test cases:", error);
            next(error);
        }
    }

    /**
     * Get dashboard metrics
     */
    public getDashboardMetrics = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            console.log(`📈 Getting dashboard metrics for project ${projectId}`);

            const metrics = await this.testcaseService.getDashboardMetrics(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Successfully retrieved dashboard metrics",
                data: metrics
            });

        } catch (error) {
            console.error("❌ Error getting dashboard metrics:", error);
            next(error);
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Validate test cases format
     */
    /**
 * Validate test cases format
 */
    private validateTestCases(testCases: any[]): string[] {
        const errors: string[] = [];
        const validTestTypes = ['all', 'unit', 'integration', 'api', 'ui', 'performance', 'security']; // THÊM 'all'

        testCases.forEach((tc, index) => {
            if (!tc.title || typeof tc.title !== 'string') {
                errors.push(`Test case ${index}: Title is required`);
            }

            if (tc.test_type && !validTestTypes.includes(tc.test_type)) {
                errors.push(`Test case ${index}: Invalid test_type. Valid values: ${validTestTypes.join(', ')}`);
            }

            if (!tc.steps || !Array.isArray(tc.steps) || tc.steps.length === 0) {
                errors.push(`Test case ${index}: Steps are required and must have at least 1 step`);
            }

            if (tc.steps) {
                tc.steps.forEach((step: any, stepIndex: number) => {
                    if (!step.step_number || !step.action) {
                        errors.push(`Test case ${index}, Step ${stepIndex}: step_number and action are required`);
                    }
                });
            }
        });

        return errors;
    }

    /**
     * Extract database tables coverage
     */
    private extractDatabaseTablesCoverage(testCases: any[]): string[] {
        const tables = new Set<string>();
        testCases.forEach(tc => {
            if (tc.database_tables && Array.isArray(tc.database_tables)) {
                tc.database_tables.forEach((table: string) => tables.add(table));
            }
        });
        return Array.from(tables);
    }

    /**
     * Extract requirements coverage
     */
    private extractRequirementsCoverage(testCases: any[]): string[] {
        const requirements = new Set<string>();
        testCases.forEach(tc => {
            if (tc.source_requirement_ids && Array.isArray(tc.source_requirement_ids)) {
                tc.source_requirement_ids.forEach((reqId: string) => requirements.add(reqId));
            }
        });
        return Array.from(requirements);
    }

    // ==================== EXPORT EXCEL METHODS ====================

    /**
     * Export test cases to Excel
     */
    public exportTestCasesToExcel = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId, test_type, status, priority, startDate, endDate } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            console.log(`📊 Exporting test cases to Excel for project ${projectId}`);

            // Build filters
            const filters: ExportFilters = {};

            if (test_type) filters.test_type = test_type as string;
            if (status) filters.status = status as string;
            if (priority) filters.priority = priority as string;

            // Date range filter
            if (startDate && endDate) {
                filters.date_range = {
                    start: new Date(startDate as string),
                    end: new Date(endDate as string)
                };
            }

            const excelBuffer = await this.exportService.exportTestCasesToExcel(
                projectId,
                versionId as string,
                filters
            );

            // Set response headers for file download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="testcases-${projectId}-${Date.now()}.xlsx"`);

            res.send(excelBuffer);

        } catch (error) {
            console.error("❌ Error exporting test cases to Excel:", error);
            next(error);
        }
    }

    /**
     * Export comprehensive test report (all reports in one Excel file)
     */
    public exportComprehensiveReport = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId is required" });
                return;
            }

            console.log(`📑 Exporting comprehensive report for project ${projectId}`);

            // Tạo workbook tổng hợp
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Test Management System';
            workbook.created = new Date();

            // Lấy dữ liệu từ các service
            const testCases = await this.testcaseService.getTestCasesByProject(projectId, versionId as string);
            const executionStats = await this.testcaseService.getTestStatistics(projectId, versionId as string);
            const dbCoverage = await this.testcaseService.getDatabaseCoverageReport(projectId, versionId as string);
            const reqCoverage = await this.testcaseService.getRequirementCoverageReport(projectId, versionId as string);

            // Tạo các sheet
            await this.createComprehensiveSummarySheet(workbook, executionStats, dbCoverage, reqCoverage);
            await this.createComprehensiveTestCasesSheet(workbook, testCases);
            await this.createComprehensiveCoverageSheet(workbook, dbCoverage, reqCoverage);

            const buffer = await workbook.xlsx.writeBuffer();

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="comprehensive-report-${projectId}-${Date.now()}.xlsx"`);

            res.send(Buffer.from(buffer));

        } catch (error) {
            console.error("❌ Error exporting comprehensive report:", error);
            next(error);
        }
    }

    // ==================== HELPER METHODS FOR COMPREHENSIVE REPORT ====================

    private async createComprehensiveSummarySheet(
        workbook: ExcelJS.Workbook,
        executionStats: any,
        dbCoverage: any,
        reqCoverage: any
    ): Promise<void> {
        const sheet = workbook.addWorksheet('Executive Summary');

        sheet.columns = [
            { header: 'Category', key: 'category', width: 25 },
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 20 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        this.applyExcelHeaderStyle(sheet, '4472C4');

        const summaryData = [
            { category: 'Test Coverage', metric: 'Total Test Cases', value: executionStats.total, status: '' },
            { category: 'Test Coverage', metric: 'Requirements Coverage', value: `${reqCoverage.coverage_percentage}%`, status: this.getCoverageStatus(reqCoverage.coverage_percentage) },
            { category: 'Test Coverage', metric: 'Database Coverage', value: `${dbCoverage.coverage_percentage}%`, status: this.getCoverageStatus(dbCoverage.coverage_percentage) },
            { category: 'Execution', metric: 'Pass Rate', value: `${executionStats.passed_rate || 0}%`, status: this.getPassRateStatus(executionStats.passed_rate) },
            { category: 'Execution', metric: 'Automation Rate', value: `${executionStats.automation_rate || 0}%`, status: this.getAutomationStatus(executionStats.automation_rate) }
        ];

        summaryData.forEach(item => {
            sheet.addRow(item);
        });
    }

    private async createComprehensiveTestCasesSheet(workbook: ExcelJS.Workbook, testCases: any[]): Promise<void> {
        const sheet = workbook.addWorksheet('Test Cases');

        sheet.columns = [
            { header: 'ID', key: 'id', width: 12 },
            { header: 'Title', key: 'title', width: 40 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Priority', key: 'priority', width: 12 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Automated', key: 'automated', width: 12 }
        ];

        this.applyExcelHeaderStyle(sheet, '70AD47');

        testCases.forEach(testCase => {
            sheet.addRow({
                id: testCase._id,
                title: testCase.title,
                type: testCase.test_type,
                priority: testCase.priority,
                status: testCase.status,
                automated: testCase.automation?.is_automated ? 'Yes' : 'No'
            });
        });
    }

    private async createComprehensiveCoverageSheet(workbook: ExcelJS.Workbook, dbCoverage: any, reqCoverage: any): Promise<void> {
        const sheet = workbook.addWorksheet('Coverage Analysis');

        sheet.columns = [
            { header: 'Coverage Type', key: 'type', width: 20 },
            { header: 'Covered', key: 'covered', width: 15 },
            { header: 'Total', key: 'total', width: 15 },
            { header: 'Percentage', key: 'percentage', width: 15 },
            { header: 'Quality', key: 'quality', width: 15 }
        ];

        this.applyExcelHeaderStyle(sheet, 'FFC000');

        const coverageData = [
            { type: 'Requirements', covered: reqCoverage.covered_requirements, total: reqCoverage.total_requirements, percentage: `${reqCoverage.coverage_percentage}%`, quality: this.getCoverageQuality(reqCoverage.coverage_percentage) },
            { type: 'Database Tables', covered: dbCoverage.covered_tables, total: dbCoverage.total_tables, percentage: `${dbCoverage.coverage_percentage}%`, quality: this.getCoverageQuality(dbCoverage.coverage_percentage) }
        ];

        coverageData.forEach(item => {
            sheet.addRow(item);
        });
    }

    private applyExcelHeaderStyle(sheet: any, color: string): void {
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color }
        };
    }

    private getCoverageStatus(percentage: number): string {
        if (percentage >= 90) return 'Excellent';
        if (percentage >= 70) return 'Good';
        if (percentage >= 50) return 'Fair';
        return 'Poor';
    }

    private getPassRateStatus(percentage: number): string {
        if (percentage >= 95) return 'Excellent';
        if (percentage >= 85) return 'Good';
        if (percentage >= 70) return 'Fair';
        return 'Poor';
    }

    private getAutomationStatus(percentage: number): string {
        if (percentage >= 80) return 'Excellent';
        if (percentage >= 60) return 'Good';
        if (percentage >= 40) return 'Fair';
        return 'Low';
    }

    private getCoverageQuality(percentage: number): string {
        if (percentage >= 90) return 'High';
        if (percentage >= 70) return 'Medium';
        if (percentage >= 50) return 'Low';
        return 'Very Low';
    }
}