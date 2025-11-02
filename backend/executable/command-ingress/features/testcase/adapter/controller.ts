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
     * Generate ENTERPRISE test cases từ requirements và database schema với selection
     */
    public generateTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, versionId } = req.params;
            const {
                selectedRequirementIds,
                language = 'vi-VN'
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

            console.log(`🎯 Generating ENTERPRISE test cases for ${selectedRequirementIds.length} selected requirements in project ${projectId}, version ${versionId}`);

            const testCases = await this.testcaseService.generateTestCases(
                projectId,
                versionId,
                selectedRequirementIds,
                language
            );

            // 🆕 Enhanced response với Enterprise metadata
            res.status(201).json({
                message: `Tạo thành công ${testCases.length} ENTERPRISE test cases cho ${selectedRequirementIds.length} requirements được chọn!`,
                data: testCases,
                count: testCases.length,
                metadata: {
                    selected_requirements_count: selectedRequirementIds.length,
                    database_tables_covered: this.extractDatabaseTablesCoverage(testCases),
                    database_operations_covered: this.extractDatabaseOperationsCoverage(testCases),
                    requirements_covered: this.extractRequirementsCoverage(testCases),
                    enterprise_metrics: this.calculateEnterpriseMetrics(testCases)
                }
            });

        } catch (error: any) {
            console.error("❌ Error generating ENTERPRISE test cases:", error);

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
     * 🆕 Generate ENTERPRISE test cases từ database schema
     */
    public generateTestCasesFromDatabase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, versionId } = req.params;
            const { language = 'vi-VN', selectedTableNames } = req.body;

            if (!projectId || !versionId) {
                res.status(400).json({ message: "projectId và versionId là bắt buộc." });
                return;
            }

            console.log(`🗄️ Generating ENTERPRISE test cases from database schema for project ${projectId}, version ${versionId}`);

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

            let databaseSchema: any = database;
            if (selectedTableNames && Array.isArray(selectedTableNames) && selectedTableNames.length > 0) {
                databaseSchema = {
                    ...database,
                    tables: (database.tables as any).filter((table: any) =>
                        selectedTableNames.includes(table.name)
                    )
                };
                console.log(`🎯 Generating ENTERPRISE test cases for ${selectedTableNames.length} selected tables`);
            }

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
                    ? `Tạo ENTERPRISE test cases thành công từ ${selectedTableNames.length} database tables được chọn!`
                    : "Tạo ENTERPRISE test cases thành công từ toàn bộ database schema!",
                data: testCases,
                count: testCases.length,
                metadata: {
                    total_tables: database.tables.length,
                    processed_tables: databaseSchema.tables.length,
                    selection_type: selectedTableNames ? 'table_selection' : 'all_tables',
                    selected_table_names: selectedTableNames || 'all',
                    requirements_covered: this.extractRequirementsCoverage(testCases),
                    database_coverage: this.calculateDatabaseCoverage(testCases, database.tables),
                    enterprise_metrics: this.calculateEnterpriseMetrics(testCases)
                }
            });

        } catch (error: any) {
            console.error("❌ Error generating ENTERPRISE test cases from database:", error);
            next(error);
        }
    }

    /**
     * 🆕 Lấy ENTERPRISE database coverage report
     */
    public getDatabaseCoverageReport = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId là bắt buộc." });
                return;
            }

            console.log(`📊 Getting ENTERPRISE database coverage report for project ${projectId}, version: ${versionId || 'all'}`);

            const coverageReport = await this.testcaseService.getDatabaseCoverageReport(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Lấy ENTERPRISE database coverage report thành công!",
                data: coverageReport
            });

        } catch (error) {
            console.error("❌ Error getting ENTERPRISE database coverage report:", error);
            next(error);
        }
    }

    /**
     * 🆕 Lấy ENTERPRISE requirement coverage report
     */
    public getRequirementCoverageReport = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId là bắt buộc." });
                return;
            }

            console.log(`📋 Getting ENTERPRISE requirement coverage report for project ${projectId}, version: ${versionId || 'all'}`);

            const coverageReport = await this.testcaseService.getRequirementCoverageReport(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Lấy ENTERPRISE requirement coverage report thành công!",
                data: coverageReport
            });

        } catch (error) {
            console.error("❌ Error getting ENTERPRISE requirement coverage report:", error);
            next(error);
        }
    }

    /**
     * 🆕 Tìm test cases trùng lặp (duplicate titles)
     */
    public findDuplicateTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId là bắt buộc." });
                return;
            }

            console.log(`🔍 Finding duplicate test cases for project ${projectId}, version: ${versionId || 'all'}`);

            const duplicates = await this.testcaseService.findDuplicateTestCases(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Tìm test cases trùng lặp thành công!",
                data: duplicates,
                count: duplicates.length,
                summary: {
                    total_duplicates: duplicates.length,
                    affected_titles: duplicates.map((d: any) => d._id)
                }
            });

        } catch (error) {
            console.error("❌ Error finding duplicate test cases:", error);
            next(error);
        }
    }

    /**
     * Lấy test cases theo database table với Enterprise format
     */
    public getTestCasesByDatabaseTable = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, tableName } = req.params;
            const { versionId } = req.query;

            if (!projectId || !tableName) {
                res.status(400).json({ message: "projectId và tableName là bắt buộc." });
                return;
            }

            console.log(`🗃️ Getting ENTERPRISE test cases for table ${tableName} in project ${projectId}`);

            const testCases = await this.testcaseService.getTestCasesByDatabaseTable(
                projectId,
                tableName,
                versionId as string
            );

            res.status(200).json({
                message: `Lấy ENTERPRISE test cases cho table ${tableName} thành công!`,
                data: testCases,
                count: testCases.length,
                metadata: {
                    table_name: tableName,
                    version_id: versionId || 'all',
                    enterprise_analysis: this.analyzeTableCoverage(testCases, tableName)
                }
            });

        } catch (error) {
            console.error("❌ Error getting ENTERPRISE test cases by database table:", error);
            next(error);
        }
    }

    /**
     * Enhance existing test cases với requirements mới theo Enterprise standard
     */
    // public enhanceTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    //     try {
    //         const { projectId, versionId } = req.params;
    //         const {
    //             newRequirementIds,
    //             language = 'vi-VN'
    //         } = req.body;

    //         if (!projectId || !versionId) {
    //             res.status(400).json({
    //                 message: "projectId và versionId là bắt buộc."
    //             });
    //             return;
    //         }

    //         if (!newRequirementIds || !Array.isArray(newRequirementIds) || newRequirementIds.length === 0) {
    //             res.status(400).json({
    //                 message: "newRequirementIds là bắt buộc và phải là mảng không rỗng."
    //             });
    //             return;
    //         }

    //         console.log(`🔄 Enhancing ENTERPRISE test cases with ${newRequirementIds.length} new requirements for project ${projectId}, version ${versionId}`);

    //         const enhancementResult = await this.testcaseService.enhanceTestCases(
    //             projectId,
    //             versionId,
    //             newRequirementIds,
    //             language
    //         );

    //         res.status(200).json({
    //             message: `Bổ sung thành công ${enhancementResult.additional_testcases.length} ENTERPRISE test cases mới!`,
    //             data: enhancementResult,
    //             summary: {
    //                 added: enhancementResult.additional_testcases.length,
    //                 updated: enhancementResult.updated_testcases.length
    //             },
    //             metadata: {
    //                 new_requirements_count: newRequirementIds.length,
    //                 database_impact: this.analyzeDatabaseImpact(enhancementResult),
    //                 enterprise_improvements: this.analyzeEnterpriseImprovements(enhancementResult)
    //             }
    //         });

    //     } catch (error: any) {
    //         console.error("❌ Error enhancing ENTERPRISE test cases:", error);

    //         if (error.message.includes('not found')) {
    //             res.status(404).json({
    //                 message: error.message
    //             });
    //             return;
    //         }

    //         next(error);
    //     }
    // }

    /**
     * Lưu ENTERPRISE test cases vào database
     */
    public saveTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
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
                res.status(400).json({ message: "projectId và versionId là bắt buộc." });
                return;
            }

            if (!testCases || !Array.isArray(testCases)) {
                res.status(400).json({ message: "testCases là bắt buộc và phải là mảng." });
                return;
            }

            // 🆕 Validate Enterprise format
            const validationErrors = this.validateEnterpriseTestCases(testCases);
            if (validationErrors.length > 0) {
                res.status(400).json({
                    message: "Dữ liệu test cases không đúng chuẩn ENTERPRISE",
                    errors: validationErrors
                });
                return;
            }

            console.log(`💾 Saving ${testCases.length} ENTERPRISE test cases`);

            const savedTestCases = await this.testcaseService.saveTestCases(
                projectId,
                versionId,
                testCases,
                createdBy
            );

            console.log('✅ Controller: Test cases saved successfully', savedTestCases.length);

            const coverageAnalysis = this.analyzeDatabaseCoverage(savedTestCases);

            res.status(201).json({
                message: `Lưu thành công ${savedTestCases.length} ENTERPRISE test cases!`,
                data: savedTestCases,
                count: savedTestCases.length,
                insertedCount: savedTestCases.length,
                metadata: {
                    database_coverage: coverageAnalysis,
                    tables_covered: coverageAnalysis.tables_covered.length,
                    operations_covered: coverageAnalysis.operations_covered.length,
                    enterprise_metrics: this.calculateEnterpriseMetrics(savedTestCases)
                }
            });

        } catch (error: any) {
            console.error("❌ Error saving ENTERPRISE test cases:", error);

            if (error.message.includes('validation failed') || error.message.includes('Validation failed')) {
                res.status(400).json({
                    message: "Dữ liệu ENTERPRISE test cases không hợp lệ",
                    error: error.message
                });
                return;
            }

            if (error.message.includes('duplicate')) {
                res.status(400).json({
                    message: "Test cases trùng lặp",
                    error: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Lấy ENTERPRISE test cases theo project và version
     */
    public getTestCasesByProject = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId, test_type, status, priority, database_tables, automation_tags } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId là bắt buộc." });
                return;
            }

            const filters: any = {};
            if (test_type) filters.test_type = test_type;
            if (status) filters.status = status;
            if (priority) filters.priority = priority;
            if (database_tables) filters.database_tables = database_tables;
            if (automation_tags) filters.automation_tags = automation_tags;

            console.log(`📋 Getting ENTERPRISE test cases for project ${projectId} with filters:`, filters);

            const testCases = await this.testcaseService.getTestCasesByProject(
                projectId,
                versionId as string,
                filters
            );

            res.status(200).json({
                message: "Lấy ENTERPRISE test cases thành công!",
                data: testCases,
                count: testCases.length,
                metadata: {
                    filters_applied: filters,
                    database_coverage: this.analyzeDatabaseCoverage(testCases),
                    enterprise_metrics: this.calculateEnterpriseMetrics(testCases)
                }
            });

        } catch (error) {
            console.error("❌ Error getting ENTERPRISE test cases:", error);
            next(error);
        }
    }

    /**
     * Lấy ENTERPRISE test case theo ID
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
                res.status(404).json({ message: `Không tìm thấy ENTERPRISE test case với id: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Lấy ENTERPRISE test case thành công!",
                data: testCase,
                metadata: {
                    database_impact: {
                        tables: testCase.database_tables || [],
                        operations: testCase.database_operations || []
                    },
                    enterprise_analysis: this.analyzeSingleTestCase(testCase)
                }
            });

        } catch (error) {
            console.error("❌ Error getting ENTERPRISE test case:", error);
            next(error);
        }
    }

    /**
     * Cập nhật ENTERPRISE test case
     */
    public updateTestCase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { testCaseId } = req.params;
            const updateData = req.body;

            const updatedBy = req.getSubject ? req.getSubject() : undefined;

            if (!testCaseId) {
                res.status(400).json({ message: "testCaseId là bắt buộc." });
                return;
            }

            if (!updateData || Object.keys(updateData).length === 0) {
                res.status(400).json({ message: "updateData là bắt buộc." });
                return;
            }

            // 🆕 Validate Enterprise format nếu có update liên quan
            if (updateData.steps || updateData.test_data || updateData.expected_results) {
                const validationErrors = this.validateEnterpriseUpdate(updateData);
                if (validationErrors.length > 0) {
                    res.status(400).json({
                        message: "Dữ liệu cập nhật không đúng chuẩn ENTERPRISE",
                        errors: validationErrors
                    });
                    return;
                }
            }

            console.log(`✏️ Updating ENTERPRISE test case ${testCaseId}`);

            const updatedTestCase = await this.testcaseService.updateTestCase(
                testCaseId,
                updateData,
                updatedBy
            );

            if (!updatedTestCase) {
                res.status(404).json({ message: `Không tìm thấy ENTERPRISE test case với id: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Cập nhật ENTERPRISE test case thành công!",
                data: updatedTestCase
            });

        } catch (error: any) {
            console.error("❌ Error updating ENTERPRISE test case:", error);

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
     * Thực thi ENTERPRISE test case
     */
    public executeTestCase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { testCaseId } = req.params;
            const executionData = req.body;

            const executedBy = req.getSubject ? req.getSubject() : undefined;

            if (!testCaseId) {
                res.status(400).json({ message: "testCaseId là bắt buộc." });
                return;
            }

            if (!executionData || !executionData.status) {
                res.status(400).json({ message: "executionData với status là bắt buộc." });
                return;
            }

            const validStatuses = ['not_executed', 'passed', 'failed', 'blocked', 'skipped', 'in_progress'];
            if (!validStatuses.includes(executionData.status)) {
                res.status(400).json({
                    message: `Status không hợp lệ. Status hợp lệ: ${validStatuses.join(', ')}`
                });
                return;
            }

            console.log(`🎯 Executing ENTERPRISE test case ${testCaseId} with status: ${executionData.status}`);

            const executedTestCase = await this.testcaseService.executeTestCase(
                testCaseId,
                executionData,
                executedBy
            );

            if (!executedTestCase) {
                res.status(404).json({ message: `Không tìm thấy ENTERPRISE test case với id: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Thực thi ENTERPRISE test case thành công!",
                data: executedTestCase,
                metadata: {
                    execution_quality: this.analyzeExecutionQuality(executedTestCase),
                    enterprise_impact: this.analyzeExecutionImpact(executedTestCase)
                }
            });

        } catch (error: any) {
            console.error("❌ Error executing ENTERPRISE test case:", error);

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
     * Xóa ENTERPRISE test case
     */
    public deleteTestCase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { testCaseId } = req.params;

            if (!testCaseId) {
                res.status(400).json({ message: "testCaseId là bắt buộc." });
                return;
            }

            console.log(`🗑️ Deleting ENTERPRISE test case ${testCaseId}`);

            const deletedTestCase = await this.testcaseService.deleteTestCase(testCaseId);

            if (!deletedTestCase) {
                res.status(404).json({ message: `Không tìm thấy ENTERPRISE test case với id: ${testCaseId}` });
                return;
            }

            res.status(200).json({
                message: "Xóa ENTERPRISE test case thành công!",
                data: { id: testCaseId },
                metadata: {
                    database_impact_removed: {
                        tables: deletedTestCase.database_tables || [],
                        operations: deletedTestCase.database_operations || []
                    }
                }
            });

        } catch (error) {
            console.error("❌ Error deleting ENTERPRISE test case:", error);
            next(error);
        }
    }

    /**
     * Lấy ENTERPRISE test statistics
     */
    public getTestStatistics = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { versionId } = req.query;

            if (!projectId) {
                res.status(400).json({ message: "projectId là bắt buộc." });
                return;
            }

            console.log(`📊 Getting ENTERPRISE test statistics for project ${projectId}, version: ${versionId || 'all'}`);

            const statistics = await this.testcaseService.getTestStatistics(
                projectId,
                versionId as string
            );

            res.status(200).json({
                message: "Lấy ENTERPRISE thống kê test thành công!",
                data: statistics
            });

        } catch (error) {
            console.error("❌ Error getting ENTERPRISE test statistics:", error);
            next(error);
        }
    }

    /**
     * Bulk operations - thực thi nhiều ENTERPRISE test cases
     */
    public bulkExecuteTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId } = req.params;
            const { testCaseIds, executionData } = req.body;

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

            console.log(`⚡ Bulk executing ${testCaseIds.length} ENTERPRISE test cases for project ${projectId}`);

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
                        errors.push({ testCaseId, error: 'ENTERPRISE test case not found' });
                    }
                } catch (error: any) {
                    errors.push({ testCaseId, error: error.message });
                }
            }

            res.status(200).json({
                message: `Thực thi bulk ENTERPRISE test cases hoàn tất!`,
                data: {
                    successful: results.length,
                    failed: errors.length,
                    results: results,
                    errors: errors,
                    enterprise_impact: this.analyzeBulkExecutionImpact(results)
                }
            });

        } catch (error) {
            console.error("❌ Error in bulk execute ENTERPRISE test cases:", error);
            next(error);
        }
    }

    // ==================== ENTERPRISE HELPER METHODS ====================

    /**
     * 🆕 Validate Enterprise test cases format
     */
    private validateEnterpriseTestCases(testCases: any[]): string[] {
        const errors: string[] = [];

        testCases.forEach((tc, index) => {
            // Check required Enterprise fields
            if (!tc.title || typeof tc.title !== 'string') {
                errors.push(`Test case ${index}: Title là bắt buộc`);
            }

            if (!tc.steps || !Array.isArray(tc.steps) || tc.steps.length === 0) {
                errors.push(`Test case ${index}: Steps là bắt buộc và phải có ít nhất 1 step`);
            }

            if (tc.steps) {
                tc.steps.forEach((step: any, stepIndex: number) => {
                    if (!step.step_number || !step.action) {
                        errors.push(`Test case ${index}, Step ${stepIndex}: step_number và action là bắt buộc`);
                    }
                });
            }

            if (!tc.expected_results) {
                errors.push(`Test case ${index}: expected_results là bắt buộc`);
            }

            if (!tc.test_data || !Array.isArray(tc.test_data)) {
                errors.push(`Test case ${index}: test_data là bắt buộc và phải là mảng`);
            }
        });

        return errors;
    }

    /**
     * 🆕 Validate Enterprise update data
     */
    private validateEnterpriseUpdate(updateData: any): string[] {
        const errors: string[] = [];

        if (updateData.steps && Array.isArray(updateData.steps)) {
            updateData.steps.forEach((step: any, index: number) => {
                if (!step.step_number || !step.action) {
                    errors.push(`Step ${index}: step_number và action là bắt buộc`);
                }
            });
        }

        if (updateData.test_data && !Array.isArray(updateData.test_data)) {
            errors.push("test_data phải là mảng");
        }

        return errors;
    }

    /**
     * 🆕 Calculate Enterprise metrics
     */
    private calculateEnterpriseMetrics(testCases: any[]): any {
        let totalSteps = 0;
        let totalTestData = 0;
        let automationReady = 0;
        const testTypes = new Set<string>();
        const priorities = new Set<string>();

        testCases.forEach(tc => {
            if (tc.steps) totalSteps += tc.steps.length;
            if (tc.test_data) totalTestData += tc.test_data.length;
            if (tc.automation?.is_automated) automationReady++;
            if (tc.test_type) testTypes.add(tc.test_type);
            if (tc.priority) priorities.add(tc.priority);
        });

        return {
            total_test_cases: testCases.length,
            total_steps: totalSteps,
            total_test_data_scenarios: totalTestData,
            automation_ready_count: automationReady,
            automation_rate: testCases.length > 0 ? Math.round((automationReady / testCases.length) * 100) : 0,
            test_types_covered: Array.from(testTypes),
            priorities_covered: Array.from(priorities),
            average_steps_per_test: testCases.length > 0 ? Math.round(totalSteps / testCases.length) : 0,
            test_data_density: testCases.length > 0 ? Math.round(totalTestData / testCases.length) : 0
        };
    }

    /**
     * 🆕 Analyze table coverage
     */
    private analyzeTableCoverage(testCases: any[], tableName: string): any {
        const operations = new Set<string>();
        const testTypes = new Set<string>();
        let totalSteps = 0;

        testCases.forEach(tc => {
            if (tc.database_operations) {
                tc.database_operations.forEach((op: string) => operations.add(op));
            }
            if (tc.test_type) testTypes.add(tc.test_type);
            if (tc.steps) totalSteps += tc.steps.length;
        });

        return {
            table_name: tableName,
            test_cases_count: testCases.length,
            operations_covered: Array.from(operations),
            test_types: Array.from(testTypes),
            total_steps: totalSteps,
            coverage_score: this.calculateTableCoverageScore(testCases.length, operations.size)
        };
    }

    /**
     * 🆕 Calculate table coverage score
     */
    private calculateTableCoverageScore(testCaseCount: number, operationsCount: number): string {
        const score = (testCaseCount * 0.7) + (operationsCount * 0.3);
        if (score >= 5) return 'excellent';
        if (score >= 3) return 'good';
        if (score >= 1) return 'fair';
        return 'poor';
    }

    /**
     * 🆕 Analyze single test case
     */
    private analyzeSingleTestCase(testCase: any): any {
        return {
            steps_count: testCase.steps?.length || 0,
            test_data_scenarios: testCase.test_data?.length || 0,
            has_preconditions: !!(testCase.preconditions && testCase.preconditions.length > 0),
            has_postconditions: !!(testCase.postconditions && testCase.postconditions.length > 0),
            automation_ready: testCase.automation?.is_automated || false,
            multi_level_validation: !!(testCase.expected_results?.ui_level &&
                testCase.expected_results?.api_level &&
                testCase.expected_results?.database_level),
            enterprise_score: this.calculateTestCaseEnterpriseScore(testCase)
        };
    }

    /**
     * 🆕 Calculate test case enterprise score
     */
    private calculateTestCaseEnterpriseScore(testCase: any): number {
        let score = 0;

        if (testCase.steps?.length >= 3) score += 2;
        if (testCase.test_data?.length >= 2) score += 2;
        if (testCase.preconditions?.length > 0) score += 1;
        if (testCase.postconditions?.length > 0) score += 1;
        if (testCase.automation?.is_automated) score += 2;
        if (testCase.expected_results?.ui_level &&
            testCase.expected_results?.api_level &&
            testCase.expected_results?.database_level) score += 2;

        return Math.min(score, 10);
    }

    /**
     * 🆕 Analyze execution quality
     */
    private analyzeExecutionQuality(executedTestCase: any): any {
        return {
            execution_time: executedTestCase.executed_at,
            status: executedTestCase.status,
            has_actual_result: !!executedTestCase.actual_result,
            has_environment_data: !!(executedTestCase.environment &&
                Object.keys(executedTestCase.environment).length > 0),
            has_execution_logs: !!(executedTestCase.execution_logs &&
                executedTestCase.execution_logs.length > 0),
            quality_score: this.calculateExecutionQualityScore(executedTestCase)
        };
    }

    /**
     * 🆕 Calculate execution quality score
     */
    private calculateExecutionQualityScore(executedTestCase: any): number {
        let score = 0;

        if (executedTestCase.actual_result) score += 3;
        if (executedTestCase.environment && Object.keys(executedTestCase.environment).length > 0) score += 2;
        if (executedTestCase.execution_logs && executedTestCase.execution_logs.length > 0) score += 2;
        if (executedTestCase.executed_by) score += 1;
        if (executedTestCase.executed_at) score += 2;

        return Math.min(score, 10);
    }

    /**
     * 🆕 Analyze execution impact
     */
    private analyzeExecutionImpact(executedTestCase: any): any {
        return {
            tables_affected: executedTestCase.database_tables || [],
            operations_performed: executedTestCase.database_operations || [],
            business_impact: executedTestCase.expected_results?.business_level || 'Not specified',
            data_validation: !!(executedTestCase.test_data &&
                executedTestCase.test_data.some((td: any) => td.actual_outputs))
        };
    }

    /**
     * 🆕 Analyze enterprise improvements từ enhancement
     */
    private analyzeEnterpriseImprovements(enhancementResult: any): any {
        const allTestCases = [
            ...(enhancementResult.additional_testcases || []),
            ...(enhancementResult.updated_testcases || [])
        ];

        return this.calculateEnterpriseMetrics(allTestCases);
    }

    // ==================== EXISTING HELPER METHODS (UPDATED) ====================

    private extractDatabaseTablesCoverage(testCases: any[]): string[] {
        const tables = new Set<string>();
        testCases.forEach(tc => {
            if (tc.database_tables && Array.isArray(tc.database_tables)) {
                tc.database_tables.forEach((table: string) => tables.add(table));
            }
        });
        return Array.from(tables);
    }

    private extractDatabaseOperationsCoverage(testCases: any[]): string[] {
        const operations = new Set<string>();
        testCases.forEach(tc => {
            if (tc.database_operations && Array.isArray(tc.database_operations)) {
                tc.database_operations.forEach((op: string) => operations.add(op));
            }
        });
        return Array.from(operations);
    }

    private extractRequirementsCoverage(testCases: any[]): string[] {
        const requirements = new Set<string>();
        testCases.forEach(tc => {
            if (tc.source_requirement_ids && Array.isArray(tc.source_requirement_ids)) {
                tc.source_requirement_ids.forEach((reqId: string) => requirements.add(reqId));
            }
        });
        return Array.from(requirements);
    }

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

    private calculateCoverageScore(tablesCount: number, operationsCount: number): string {
        const score = (tablesCount * 0.6) + (operationsCount * 0.4);
        if (score >= 8) return 'excellent';
        if (score >= 6) return 'good';
        if (score >= 4) return 'fair';
        return 'poor';
    }

    private analyzeDatabaseImpact(enhancementResult: any): any {
        const allTestCases = [
            ...(enhancementResult.additional_testcases || []),
            ...(enhancementResult.updated_testcases || [])
        ];

        return this.analyzeDatabaseCoverage(allTestCases);
    }

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
            enterprise_impact: this.calculateEnterpriseMetrics(executedTestCases),
            summary: `${tables.size} tables, ${operations.size} operations`
        };
    }
    // Thêm method mới trong TestcaseController
    public previewEnhanceTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, versionId } = req.params;
            const {
                newRequirementIds,
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

            console.log(`🔍 Previewing ENTERPRISE test case enhancement for project ${projectId}, version ${versionId}`);

            const previewData = await this.testcaseService.previewEnhancedTestCases(
                projectId,
                versionId,
                newRequirementIds,
                language
            );

            res.status(200).json({
                message: "Preview ENTERPRISE test case enhancement thành công!",
                data: previewData,
                metadata: {
                    can_apply: previewData.enhancementPreview.additional_testcases.length > 0 ||
                        previewData.enhancementPreview.updated_testcases.length > 0,
                    recommendation: this.generateEnhancementRecommendation(previewData.comparison)
                }
            });

        } catch (error: any) {
            console.error("❌ Error previewing ENTERPRISE test case enhancement:", error);

            if (error.message.includes('not found')) {
                res.status(404).json({
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

    private generateEnhancementRecommendation(comparison: any): string {
        const { summary, enterprise_metrics } = comparison;

        if (summary.new_test_cases === 0 && summary.updated_test_cases === 0) {
            return "Không có thay đổi nào được đề xuất. Test cases hiện tại đã đạt chuẩn ENTERPRISE.";
        }

        const improvements = [];
        if (summary.new_test_cases > 0) {
            improvements.push(`Thêm ${summary.new_test_cases} test cases mới`);
        }
        if (summary.updated_test_cases > 0) {
            improvements.push(`Cập nhật ${summary.updated_test_cases} test cases hiện có`);
        }
        if (enterprise_metrics.improvement.coverage_increase > 0) {
            improvements.push(`Tăng coverage cho ${enterprise_metrics.improvement.coverage_increase} requirement(s)`);
        }

        return `Đề xuất áp dụng enhancement để: ${improvements.join(', ')}.`;
    }

    // Cập nhật enhanceTestCases hiện tại để hỗ trợ cả preview và apply
    public enhanceTestCases = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { projectId, versionId } = req.params;
            const {
                newRequirementIds,
                language = 'vi-VN',
                action = 'apply' // 'preview' hoặc 'apply'
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

            // Nếu là preview mode
            if (action === 'preview') {
                return this.previewEnhanceTestCases(req, res, next);
            }

            // Apply mode (giữ nguyên logic cũ)
            console.log(`🔄 Applying ENTERPRISE test case enhancement for project ${projectId}, version ${versionId}`);

            const enhancementResult = await this.testcaseService.enhanceTestCases(
                projectId,
                versionId,
                newRequirementIds,
                language
            );

            res.status(200).json({
                message: `Áp dụng ENTERPRISE test case enhancement thành công!`,
                data: enhancementResult,
                summary: {
                    added: enhancementResult.additional_testcases.length,
                    updated: enhancementResult.updated_testcases.length
                },
                metadata: {
                    new_requirements_count: newRequirementIds.length,
                    database_impact: this.analyzeDatabaseImpact(enhancementResult),
                    enterprise_improvements: this.analyzeEnterpriseImprovements(enhancementResult)
                }
            });

        } catch (error: any) {
            console.error("❌ Error in ENTERPRISE test case enhancement:", error);
            next(error);
        }
    }
}