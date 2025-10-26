// src/features/testcase/adapter/controller.ts

import { Response, NextFunction } from "express";
import { TestcaseService } from "../domain/service";
import { HttpRequest } from "../../../types/http_request";
import Database from "../../../../../internal/model/database";
import Version from "../../../../../internal/model/version";

export class TestcaseController {
    private testcaseService: TestcaseService;

    constructor() {
        this.testcaseService = new TestcaseService();
    }

    /**
     * Generate test cases từ requirements và database schema với selection
     */
    public generateTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, versionId } = req.params; // 🆕 Đổi từ versionId trong params thành projectId + versionId
            const {
                selectedRequirementIds, // 🆕 CHỈ CẦN IDs
                language = 'vi-VN'      // 🆕 Default Vietnamese
            } = req.body;

            if (!projectId || !versionId) {
                res.status(400).json({
                    message: "projectId và versionId là bắt buộc."
                });
                return;
            }

            if (!selectedRequirementIds || !Array.isArray(selectedRequirementIds) || selectedRequirementIds.length === 0) {
                res.status(400).json({
                    message: "selectedRequirementIds là bắt buộc và phải là mảng không rỗng."
                });
                return;
            }

            console.log(`🎯 Generating test cases for ${selectedRequirementIds.length} selected requirements in project ${projectId}, version ${versionId}`);

            // 🆕 Gọi service simplified
            const testCases = await this.testcaseService.generateTestCases(
                projectId,
                versionId,
                selectedRequirementIds,
                language
            );

            res.status(201).json({
                message: `Tạo thành công ${testCases.length} test cases cho ${selectedRequirementIds.length} requirements được chọn!`,
                data: testCases,
                count: testCases.length,
                metadata: {
                    selected_requirements_count: selectedRequirementIds.length,
                    database_tables_covered: this.extractDatabaseTablesCoverage(testCases),
                    database_operations_covered: this.extractDatabaseOperationsCoverage(testCases),
                    requirements_covered: this.extractRequirementsCoverage(testCases)
                }
            });

        } catch (error: any) {
            console.error("❌ Error generating test cases:", error);

            // Handle specific errors
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
                    message: "Service tạo test cases tạm thời không khả dụng",
                    error: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * 🆕 Generate test cases từ database schema (alternative endpoint)
     */
    public generateTestCasesFromDatabase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, versionId } = req.params;
            const { language = 'vi-VN', selectedTableNames } = req.body;

            if (!projectId || !versionId) {
                res.status(400).json({ message: "projectId và versionId là bắt buộc." });
                return;
            }

            console.log(`🗄️ Generating test cases from database schema for project ${projectId}, version ${versionId}`);

            // Lấy database schema từ database
            const database = await Database.findOne({ 
                project_id: projectId, 
                version_id: versionId 
            }).lean();

            if (!database) {
                res.status(404).json({ 
                    message: "Không tìm thấy database schema cho project và version này." 
                });
                return;
            }

            // Lấy requirements từ version
            const version = await Version.findOne({
                project_id: projectId,
                _id: versionId
            }).lean();

            if (!version || !version.requirement_model || version.requirement_model.length === 0) {
                res.status(404).json({ 
                    message: "Không tìm thấy requirements cho version này." 
                });
                return;
            }

            // Lọc tables nếu có selection
            let databaseSchema: any = database;
            if (selectedTableNames && Array.isArray(selectedTableNames) && selectedTableNames.length > 0) {
                databaseSchema = {
                    ...database,
                    tables: (database.tables as any).filter((table: any) => 
                        selectedTableNames.includes(table.name)
                    )
                };
                console.log(`🎯 Generating test cases for ${selectedTableNames.length} selected tables`);
            }

            // Build an array of requirement IDs from the version.requirement_model and call the service
            const requirementIds = Array.isArray(version.requirement_model)
                ? (version.requirement_model as any[]).map((r: any) => r.id)
                : [];

            const testCases = await this.testcaseService.generateTestCases(
                projectId,
                versionId,
                requirementIds,
                language
            );

            res.status(201).json({
                message: selectedTableNames 
                    ? `Tạo test cases thành công từ ${selectedTableNames.length} database tables được chọn!`
                    : "Tạo test cases thành công từ toàn bộ database schema!",
                data: testCases,
                count: testCases.length,
                metadata: {
                    total_tables: database.tables.length,
                    processed_tables: databaseSchema.tables.length,
                    selection_type: selectedTableNames ? 'table_selection' : 'all_tables',
                    selected_table_names: selectedTableNames || 'all',
                    requirements_covered: this.extractRequirementsCoverage(testCases),
                    database_coverage: this.calculateDatabaseCoverage(testCases, database.tables)
                }
            });

        } catch (error: any) {
            console.error("❌ Error generating test cases from database:", error);
            next(error);
        }
    }

    /**
     * 🆕 Lấy database coverage report
     */
    public getDatabaseCoverageReport = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId là bắt buộc." });
                return;
            }

            console.log(`📊 Getting database coverage report for project ${projectId}, version: ${versionId || 'all'}`);

            const coverageReport = await this.testcaseService.getDatabaseCoverageReport(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Lấy database coverage report thành công!",
                data: coverageReport
            });

        } catch (error) {
            console.error("❌ Error getting database coverage report:", error);
            next(error);
        }
    }

    /**
     * 🆕 Lấy test cases theo database table
     */
    public getTestCasesByDatabaseTable = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, tableName } = req.params;
            const { versionId } = req.query;

            if (!projectId || !tableName) {
                res.status(400).json({ message: "projectId và tableName là bắt buộc." });
                return;
            }

            console.log(`🗃️ Getting test cases for table ${tableName} in project ${projectId}`);

            const testCases = await this.testcaseService.getTestCasesByDatabaseTable(
                projectId,
                tableName,
                versionId as string
            );

            res.status(200).json({
                message: `Lấy test cases cho table ${tableName} thành công!`,
                data: testCases,
                count: testCases.length,
                metadata: {
                    table_name: tableName,
                    version_id: versionId || 'all'
                }
            });

        } catch (error) {
            console.error("❌ Error getting test cases by database table:", error);
            next(error);
        }
    }

    /**
     * Enhance existing test cases với requirements mới
     */
    public enhanceTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, versionId } = req.params;
            const {
                newRequirementIds, // 🆕 CHỈ CẦN IDs của requirements mới
                language = 'vi-VN'
            } = req.body;

            if (!projectId || !versionId) {
                res.status(400).json({
                    message: "projectId và versionId là bắt buộc."
                });
                return;
            }

            if (!newRequirementIds || !Array.isArray(newRequirementIds) || newRequirementIds.length === 0) {
                res.status(400).json({
                    message: "newRequirementIds là bắt buộc và phải là mảng không rỗng."
                });
                return;
            }

            console.log(`🔄 Enhancing test cases with ${newRequirementIds.length} new requirements for project ${projectId}, version ${versionId}`);

            const enhancementResult = await this.testcaseService.enhanceTestCases(
                projectId,
                versionId,
                newRequirementIds,
                language
            );

            res.status(200).json({
                message: `Bổ sung thành công ${enhancementResult.additional_testcases.length} test cases mới!`,
                data: enhancementResult,
                summary: {
                    added: enhancementResult.additional_testcases.length,
                    updated: enhancementResult.updated_testcases.length
                },
                metadata: {
                    new_requirements_count: newRequirementIds.length,
                    database_impact: this.analyzeDatabaseImpact(enhancementResult)
                }
            });

        } catch (error: any) {
            console.error("❌ Error enhancing test cases:", error);

            if (error.message.includes('not found')) {
                res.status(404).json({
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Lưu test cases vào database
     */
    public saveTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, versionId } = req.params;
            const { testCases } = req.body;

            // Lấy user ID từ auth token
            const createdBy = req.getSubject ? req.getSubject() : undefined;

            if (!projectId || !versionId) {
                res.status(400).json({ message: "projectId và versionId là bắt buộc." });
                return;
            }

            if (!testCases || !Array.isArray(testCases)) {
                res.status(400).json({ message: "testCases là bắt buộc và phải là mảng." });
                return;
            }

            console.log(`💾 Saving ${testCases.length} test cases for project ${projectId}, version ${versionId}`);

            const savedTestCases = await this.testcaseService.saveTestCases(
                projectId,
                versionId,
                testCases,
                createdBy
            );

            // 🆕 Phân tích database coverage sau khi save
            const coverageAnalysis = this.analyzeDatabaseCoverage(savedTestCases);

            res.status(201).json({
                message: "Lưu test cases thành công!",
                data: savedTestCases,
                count: savedTestCases.length,
                metadata: {
                    database_coverage: coverageAnalysis,
                    tables_covered: coverageAnalysis.tables_covered.length,
                    operations_covered: coverageAnalysis.operations_covered.length
                }
            });

        } catch (error: any) {
            console.error("❌ Error saving test cases:", error);

            if (error.message.includes('validation failed') || error.message.includes('duplicate')) {
                res.status(400).json({
                    message: "Dữ liệu test cases không hợp lệ",
                    error: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Lấy test cases theo project và version
     */
    public getTestCasesByProject = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId, test_type, status, priority, database_tables } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId là bắt buộc." });
                return;
            }

            const filters: any = {};
            if (test_type) filters.test_type = test_type;
            if (status) filters.status = status;
            if (priority) filters.priority = priority;
            if (database_tables) filters.database_tables = database_tables;

            console.log(`📋 Getting test cases for project ${projectId} with filters:`, filters);

            const testCases = await this.testcaseService.getTestCasesByProject(
                projectId,
                versionId as string,
                filters
            );

            res.status(200).json({
                message: "Lấy test cases thành công!",
                data: testCases,
                count: testCases.length,
                metadata: {
                    filters_applied: filters,
                    database_coverage: this.analyzeDatabaseCoverage(testCases)
                }
            });

        } catch (error) {
            console.error("❌ Error getting test cases:", error);
            next(error);
        }
    }

    /**
     * Lấy test case theo ID
     */
    public getTestCaseById = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { testCaseId } = req.params;

            if (!testCaseId) {
                res.status(400).json({ message: "testCaseId là bắt buộc." });
                return;
            }

            const testCase = await this.testcaseService.getTestCaseById(testCaseId);

            if (!testCase) {
                res.status(404).json({ message: `Không tìm thấy test case với id: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Lấy test case thành công!",
                data: testCase,
                metadata: {
                    database_impact: {
                        tables: testCase.database_tables || [],
                        operations: testCase.database_operations || []
                    }
                }
            });

        } catch (error) {
            console.error("❌ Error getting test case:", error);
            next(error);
        }
    }

    /**
     * Cập nhật test case
     */
    public updateTestCase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { testCaseId } = req.params;
            const updateData = req.body;

            // Lấy user ID từ auth token
            const updatedBy = req.getSubject ? req.getSubject() : undefined;

            if (!testCaseId) {
                res.status(400).json({ message: "testCaseId là bắt buộc." });
                return;
            }

            if (!updateData || Object.keys(updateData).length === 0) {
                res.status(400).json({ message: "updateData là bắt buộc." });
                return;
            }

            console.log(`✏️ Updating test case ${testCaseId}`);

            const updatedTestCase = await this.testcaseService.updateTestCase(
                testCaseId,
                updateData,
                updatedBy
            );

            if (!updatedTestCase) {
                res.status(404).json({ message: `Không tìm thấy test case với id: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Cập nhật test case thành công!",
                data: updatedTestCase
            });

        } catch (error: any) {
            console.error("❌ Error updating test case:", error);

            if (error.message.includes('validation failed') || error.message.includes('cast to ObjectId failed')) {
                res.status(400).json({
                    message: "Dữ liệu cập nhật không hợp lệ",
                    error: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Thực thi test case
     */
    public executeTestCase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { testCaseId } = req.params;
            const executionData = req.body;

            // Lấy user ID từ auth token
            const executedBy = req.getSubject ? req.getSubject() : undefined;

            if (!testCaseId) {
                res.status(400).json({ message: "testCaseId là bắt buộc." });
                return;
            }

            if (!executionData || !executionData.status) {
                res.status(400).json({ message: "executionData với status là bắt buộc." });
                return;
            }

            // Validate status
            const validStatuses = ['not_executed', 'passed', 'failed', 'blocked', 'skipped'];
            if (!validStatuses.includes(executionData.status)) {
                res.status(400).json({
                    message: `Status không hợp lệ. Status hợp lệ: ${validStatuses.join(', ')}`
                });
                return;
            }

            console.log(`🎯 Executing test case ${testCaseId} with status: ${executionData.status}`);

            const executedTestCase = await this.testcaseService.executeTestCase(
                testCaseId,
                executionData,
                executedBy
            );

            if (!executedTestCase) {
                res.status(404).json({ message: `Không tìm thấy test case với id: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Thực thi test case thành công!",
                data: executedTestCase
            });

        } catch (error: any) {
            console.error("❌ Error executing test case:", error);

            if (error.message.includes('validation failed') || error.message.includes('cast to ObjectId failed')) {
                res.status(400).json({
                    message: "Dữ liệu thực thi không hợp lệ",
                    error: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Xóa test case
     */
    public deleteTestCase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { testCaseId } = req.params;

            if (!testCaseId) {
                res.status(400).json({ message: "testCaseId là bắt buộc." });
                return;
            }

            console.log(`🗑️ Deleting test case ${testCaseId}`);

            const deletedTestCase = await this.testcaseService.deleteTestCase(testCaseId);

            if (!deletedTestCase) {
                res.status(404).json({ message: `Không tìm thấy test case với id: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Xóa test case thành công!",
                data: { id: testCaseId }
            });

        } catch (error) {
            console.error("❌ Error deleting test case:", error);
            next(error);
        }
    }

    /**
     * Lấy test statistics
     */
    public getTestStatistics = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId là bắt buộc." });
                return;
            }

            console.log(`📊 Getting test statistics for project ${projectId}, version: ${versionId || 'all'}`);

            const statistics = await this.testcaseService.getTestStatistics(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Lấy thống kê test thành công!",
                data: statistics
            });

        } catch (error) {
            console.error("❌ Error getting test statistics:", error);
            next(error);
        }
    }

    /**
     * Bulk operations - thực thi nhiều test cases
     */
    public bulkExecuteTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { testCaseIds, executionData } = req.body;

            // Lấy user ID từ auth token
            const executedBy = req.getSubject ? req.getSubject() : undefined;

            if (!projectId) {
                res.status(400).json({ message: "projectId là bắt buộc." });
                return;
            }

            if (!testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
                res.status(400).json({ message: "testCaseIds là bắt buộc và phải là mảng không rỗng." });
                return;
            }

            if (!executionData || !executionData.status) {
                res.status(400).json({ message: "executionData với status là bắt buộc." });
                return;
            }

            console.log(`⚡ Bulk executing ${testCaseIds.length} test cases for project ${projectId}`);

            const results = [];
            const errors = [];

            // Thực thi từng test case
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
                message: `Thực thi bulk test cases hoàn tất!`,
                data: {
                    successful: results.length,
                    failed: errors.length,
                    results: results,
                    errors: errors,
                    database_impact: this.analyzeBulkExecutionImpact(results)
                }
            });

        } catch (error) {
            console.error("❌ Error in bulk execute test cases:", error);
            next(error);
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * 🆕 Extract database tables coverage từ test cases
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
     * 🆕 Extract database operations coverage từ test cases
     */
    private extractDatabaseOperationsCoverage(testCases: any[]): string[] {
        const operations = new Set<string>();
        testCases.forEach(tc => {
            if (tc.database_operations && Array.isArray(tc.database_operations)) {
                tc.database_operations.forEach((op: string) => operations.add(op));
            }
        });
        return Array.from(operations);
    }

    /**
     * 🆕 Extract requirements coverage từ test cases
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

    /**
     * 🆕 Calculate database coverage
     */
    private calculateDatabaseCoverage(testCases: any[], allTables: any[]): any {
        const coveredTables = this.extractDatabaseTablesCoverage(testCases);
        const totalTables = allTables.length;

        return {
            tables_covered: coveredTables,
            total_tables: totalTables,
            coverage_percentage: totalTables > 0 ? Math.round((coveredTables.length / totalTables) * 100) : 0,
            coverage_gaps: allTables
                .filter(table => !coveredTables.includes(table.name))
                .map(table => table.name)
        };
    }

    /**
     * 🆕 Analyze database coverage
     */
    private analyzeDatabaseCoverage(testCases: any[]): any {
        const tablesCovered = this.extractDatabaseTablesCoverage(testCases);
        const operationsCovered = this.extractDatabaseOperationsCoverage(testCases);

        return {
            tables_covered: tablesCovered,
            operations_covered: operationsCovered,
            tables_count: tablesCovered.length,
            operations_count: operationsCovered.length,
            coverage_score: this.calculateCoverageScore(tablesCovered.length, operationsCovered.length)
        };
    }

    /**
     * 🆕 Calculate coverage score
     */
    private calculateCoverageScore(tablesCount: number, operationsCount: number): string {
        const score = (tablesCount * 0.6) + (operationsCount * 0.4);
        if (score >= 8) return 'excellent';
        if (score >= 6) return 'good';
        if (score >= 4) return 'fair';
        return 'poor';
    }

    /**
     * 🆕 Analyze database impact của enhancement
     */
    private analyzeDatabaseImpact(enhancementResult: any): any {
        const allTestCases = [
            ...(enhancementResult.additional_testcases || []),
            ...(enhancementResult.updated_testcases || [])
        ];

        return this.analyzeDatabaseCoverage(allTestCases);
    }

    /**
     * 🆕 Analyze bulk execution impact
     */
    private analyzeBulkExecutionImpact(executedTestCases: any[]): any {
        const tables = new Set<string>();
        const operations = new Set<string>();

        executedTestCases.forEach(tc => {
            if (tc.database_tables) {
                tc.database_tables.forEach((table: string) => tables.add(table));
            }
            if (tc.database_operations) {
                tc.database_operations.forEach((op: string) => operations.add(op));
            }
        });

        return {
            tables_affected: Array.from(tables),
            operations_performed: Array.from(operations),
            summary: `${tables.size} tables, ${operations.size} operations`
        };
    }

    /**
     * 🆕 Lấy requirements từ version (placeholder - cần implement thực tế)
     */
    private async getRequirementsFromVersion(versionId: string): Promise<any[]> {
        // TODO: Implement logic để lấy requirements từ version
        // Hiện tại return empty array cho demo
        console.log(`📋 Getting requirements for version ${versionId}`);
        return [];
    }
}