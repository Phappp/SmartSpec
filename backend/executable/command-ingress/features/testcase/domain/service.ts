import Testcase from "../../../../../internal/model/testcase";
import Database from "../../../../../internal/model/database";
import Version from "../../../../../internal/model/version";
import { TestcaseGeminiService } from "./GeminiService";

export class TestcaseService {
    private testcaseGeminiService = new TestcaseGeminiService();

    /**
     * Generate ENTERPRISE test cases từ requirements và database schema với selection
     */
    async generateTestCases(
        projectId: string,
        versionId: string,
        selectedRequirementIds: string[],
        language: string = 'vi-VN'
    ) {
        console.log(`🎯 Generating ENTERPRISE test cases for ${selectedRequirementIds.length} selected requirements`);

        // 1. TỰ ĐỘNG lấy requirements từ version
        const version = await Version.findOne({
            project_id: projectId,
            _id: versionId
        });

        if (!version) {
            throw new Error("Version not found");
        }

        const requirementsToProcess = version.requirement_model.filter(
            req => selectedRequirementIds.includes(req.id)
        );

        if (requirementsToProcess.length === 0) {
            throw new Error("No matching requirements found");
        }

        // 2. TỰ ĐỘNG lấy database schema
        const database = await Database.findOne({
            project_id: projectId,
            version_id: versionId
        });

        if (!database) {
            throw new Error("Database schema not found for this version");
        }

        console.log(`📊 Loaded ${requirementsToProcess.length} requirements and ${database.tables?.length || 0} tables`);

        // 3. Gen ENTERPRISE test cases
        return await this.testcaseGeminiService.generateTestCases(
            requirementsToProcess,
            database,
            language
        );
    }

    /**
     * Enhance existing test cases với requirements mới theo Enterprise standard
     */
    async enhanceTestCases(
        projectId: string,
        versionId: string,
        newRequirementIds: string[],
        language: string = 'vi-VN'
    ) {
        // 1. Lấy existing test cases
        const existingTestCases = await Testcase.find({
            project_id: projectId,
            version_id: versionId
        }).lean();

        // 2. Lấy new requirements từ version
        const version = await Version.findOne({
            project_id: projectId,
            _id: versionId
        });

        if (!version) {
            throw new Error("Version not found");
        }

        const newRequirements = version.requirement_model.filter(
            req => newRequirementIds.includes(req.id)
        );

        if (newRequirements.length === 0) {
            throw new Error("No matching new requirements found");
        }

        // 3. Enhance với Enterprise standard
        return await this.testcaseGeminiService.enhanceTestCases(
            existingTestCases,
            newRequirements,
            language
        );
    }

    /**
     * Lưu ENTERPRISE test cases vào database
     */
    async saveTestCases(projectId: string, versionId: string, testCases: any[], createdBy?: string) {
        const testCasesToSave = testCases.map(testCase => ({
            project_id: projectId,
            version_id: versionId,
            created_by: createdBy,
            ...testCase
        }));

        return await Testcase.insertMany(testCasesToSave, { ordered: false });
    }

    /**
     * Lấy test cases theo project và version với Enterprise filters
     */
    async getTestCasesByProject(projectId: string, versionId?: string, filters: any = {}) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        // Apply Enterprise filters
        if (filters.test_type) query.test_type = filters.test_type;
        if (filters.status) query.status = filters.status;
        if (filters.priority) query.priority = filters.priority;
        if (filters.database_tables) query.database_tables = { $in: filters.database_tables };
        if (filters.source_requirement_ids) query.source_requirement_ids = { $in: filters.source_requirement_ids };
        if (filters.automation_tags) query["automation.tags"] = { $in: filters.automation_tags };

        return await Testcase.find(query)
            .populate('created_by', 'name email')
            .populate('executed_by', 'name email')
            .sort({ priority: -1, createdAt: -1 })
            .lean();
    }

    /**
     * Lấy test cases theo database table với Enterprise format
     */
    async getTestCasesByDatabaseTable(projectId: string, tableName: string, versionId?: string) {
        const query: any = {
            project_id: projectId,
            database_tables: tableName
        };
        if (versionId) query.version_id = versionId;

        return await Testcase.find(query)
            .populate('created_by', 'name email')
            .sort({ priority: -1, createdAt: -1 })
            .lean();
    }

    /**
     * Lấy test case theo ID với Enterprise data
     */
    async getTestCaseById(id: string) {
        return await Testcase.findById(id)
            .populate('created_by', 'name email')
            .populate('executed_by', 'name email')
            .populate('exceptions.resolved_by', 'name email');
    }

    /**
     * Cập nhật test case với Enterprise fields
     */
    async updateTestCase(id: string, updateData: any, updatedBy?: string) {
        const forbiddenFields = ['_id', 'project_id', 'version_id', 'created_at', 'created_by'];
        forbiddenFields.forEach(field => delete updateData[field]);

        if (updatedBy) {
            updateData.updated_by = updatedBy;
        }

        return await Testcase.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('created_by', 'name email')
            .populate('executed_by', 'name email');
    }

    /**
     * Thực thi test case với Enterprise logging
     */
    async executeTestCase(id: string, executionData: any, executedBy?: string) {
        const updateData: any = {
            status: executionData.status,
            executed_at: new Date(),
            actual_result: executionData.actual_result || ''
        };

        if (executionData.environment !== undefined) updateData.environment = executionData.environment;
        if (executionData.execution_logs !== undefined) updateData.execution_logs = executionData.execution_logs;
        if (executionData.exceptions !== undefined) updateData.exceptions = executionData.exceptions;
        if (executedBy !== undefined) updateData.executed_by = executedBy;

        // 🆕 Update test data với actual outputs nếu có
        if (executionData.test_data_actual_outputs) {
            const testCase = await Testcase.findById(id);
            if (testCase && testCase.test_data) {
                testCase.test_data.forEach((testData, index) => {
                    if (executionData.test_data_actual_outputs[index]) {
                        testData.actual_outputs = executionData.test_data_actual_outputs[index];
                    }
                });
                updateData.test_data = testCase.test_data;
            }
        }

        return await Testcase.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('executed_by', 'name email');
    }

    /**
     * Xóa test case
     */
    async deleteTestCase(id: string) {
        return await Testcase.findByIdAndDelete(id);
    }

    /**
     * Lấy ENTERPRISE test statistics với database coverage
     */
    async getTestStatistics(projectId: string, versionId?: string) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        const stats = await Testcase.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    by_status: {
                        $push: {
                            status: "$status",
                            count: 1
                        }
                    },
                    by_type: {
                        $push: {
                            type: "$test_type",
                            count: 1
                        }
                    },
                    by_priority: {
                        $push: {
                            priority: "$priority",
                            count: 1
                        }
                    },
                    automated_count: {
                        $sum: {
                            $cond: [{ $eq: ["$automation.is_automated", true] }, 1, 0]
                        }
                    },
                    // 🆕 ENTERPRISE statistics
                    database_tables_covered: { $addToSet: "$database_tables" },
                    database_operations_covered: { $addToSet: "$database_operations" },
                    requirement_coverage: { $addToSet: "$source_requirement_ids" }
                }
            },
            {
                $project: {
                    total: 1,
                    automated_count: 1,
                    automation_rate: {
                        $multiply: [
                            { $divide: ["$automated_count", "$total"] },
                            100
                        ]
                    },
                    by_status: {
                        $arrayToObject: {
                            $map: {
                                input: "$by_status",
                                as: "item",
                                in: {
                                    k: "$$item.status",
                                    v: "$$item.count"
                                }
                            }
                        }
                    },
                    by_type: {
                        $arrayToObject: {
                            $map: {
                                input: "$by_type",
                                as: "item",
                                in: {
                                    k: "$$item.type",
                                    v: "$$item.count"
                                }
                            }
                        }
                    },
                    by_priority: {
                        $arrayToObject: {
                            $map: {
                                input: "$by_priority",
                                as: "item",
                                in: {
                                    k: "$$item.priority",
                                    v: "$$item.count"
                                }
                            }
                        }
                    },
                    // 🆕 ENTERPRISE coverage stats
                    database_coverage: {
                        tables_covered: { $size: { $setUnion: "$database_tables_covered" } },
                        operations_covered: { $size: { $setUnion: "$database_operations_covered" } }
                    },
                    requirement_coverage_count: { $size: { $setUnion: "$requirement_coverage" } }
                }
            }
        ]);

        return stats[0] || {
            total: 0,
            automated_count: 0,
            automation_rate: 0,
            by_status: {},
            by_type: {},
            by_priority: {},
            database_coverage: {
                tables_covered: 0,
                operations_covered: 0
            },
            requirement_coverage_count: 0
        };
    }

    /**
     * 🆕 Lấy ENTERPRISE database coverage report
     */
    async getDatabaseCoverageReport(projectId: string, versionId?: string) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        // Lấy database schema để biết tổng số tables
        const dbQuery: any = { project_id: projectId };
        if (versionId) dbQuery.version_id = versionId;

        const database = await Database.findOne(dbQuery).lean();
        const totalTables = database?.tables?.length || 0;

        // Lấy thống kê test cases coverage với Enterprise format
        const coverageStats = await Testcase.aggregate([
            { $match: query },
            { $unwind: "$database_tables" },
            {
                $group: {
                    _id: "$database_tables",
                    test_case_count: { $sum: 1 },
                    test_types: { $addToSet: "$test_type" },
                    priorities: { $addToSet: "$priority" },
                    operations: { $addToSet: "$database_operations" }
                }
            },
            {
                $project: {
                    table_name: "$_id",
                    test_case_count: 1,
                    test_types: 1,
                    priorities: 1,
                    operations: 1,
                    coverage_score: {
                        $switch: {
                            branches: [
                                { case: { $gt: ["$test_case_count", 5] }, then: "excellent" },
                                { case: { $gt: ["$test_case_count", 2] }, then: "good" },
                                { case: { $gt: ["$test_case_count", 0] }, then: "fair" }
                            ],
                            default: "poor"
                        }
                    }
                }
            },
            { $sort: { test_case_count: -1 } }
        ]);

        // 🆕 Tính coverage chi tiết
        const uncoveredTables = database?.tables
            ?.filter((table: any) => !coverageStats.some((stat: any) => stat.table_name === table.name))
            .map((table: any) => ({
                name: table.name,
                description: table.description,
                columns_count: table.columns?.length || 0
            })) || [];

        return {
            total_tables: totalTables,
            covered_tables: coverageStats.length,
            coverage_percentage: totalTables > 0 ? Math.round((coverageStats.length / totalTables) * 100) : 0,
            table_coverage: coverageStats,
            uncovered_tables: uncoveredTables,
            // 🆕 ENTERPRISE metrics
            coverage_quality: {
                excellent: coverageStats.filter((s: any) => s.coverage_score === "excellent").length,
                good: coverageStats.filter((s: any) => s.coverage_score === "good").length,
                fair: coverageStats.filter((s: any) => s.coverage_score === "fair").length,
                poor: coverageStats.filter((s: any) => s.coverage_score === "poor").length
            }
        };
    }

    /**
     * 🆕 Lấy requirement coverage report
     */
    async getRequirementCoverageReport(projectId: string, versionId?: string) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        // Lấy requirements từ version
        const versionQuery: any = { project_id: projectId };
        if (versionId) versionQuery._id = versionId;

        const version = await Version.findOne(versionQuery).lean();
        const totalRequirements = version?.requirement_model?.length || 0;

        // Lấy covered requirements từ test cases
        const coverageStats = await Testcase.aggregate([
            { $match: query },
            { $unwind: "$source_requirement_ids" },
            {
                $group: {
                    _id: "$source_requirement_ids",
                    test_case_count: { $sum: 1 },
                    test_types: { $addToSet: "$test_type" },
                    priorities: { $addToSet: "$priority" }
                }
            },
            {
                $lookup: {
                    from: "versions",
                    let: { requirementId: "$_id", projectId: projectId },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$project_id", { $toObjectId: projectId }] } } },
                        { $unwind: "$requirement_model" },
                        { $match: { $expr: { $eq: ["$requirement_model.id", "$$requirementId"] } } },
                        { $replaceRoot: { newRoot: "$requirement_model" } }
                    ],
                    as: "requirement_info"
                }
            },
            {
                $project: {
                    requirement_id: "$_id",
                    requirement_name: { $arrayElemAt: ["$requirement_info.name", 0] },
                    requirement_priority: { $arrayElemAt: ["$requirement_info.priority", 0] },
                    test_case_count: 1,
                    test_types: 1,
                    priorities: 1,
                    coverage_score: {
                        $switch: {
                            branches: [
                                { case: { $gt: ["$test_case_count", 3] }, then: "excellent" },
                                { case: { $gt: ["$test_case_count", 1] }, then: "good" }
                            ],
                            default: "insufficient"
                        }
                    }
                }
            },
            { $sort: { test_case_count: -1 } }
        ]);

        const coveredRequirements = coverageStats.length;
        const uncoveredRequirements = totalRequirements - coveredRequirements;

        return {
            total_requirements: totalRequirements,
            covered_requirements: coveredRequirements,
            coverage_percentage: totalRequirements > 0 ? Math.round((coveredRequirements / totalRequirements) * 100) : 0,
            requirement_coverage: coverageStats,
            uncovered_requirements_count: uncoveredRequirements,
            coverage_quality: {
                excellent: coverageStats.filter((s: any) => s.coverage_score === "excellent").length,
                good: coverageStats.filter((s: any) => s.coverage_score === "good").length,
                insufficient: coverageStats.filter((s: any) => s.coverage_score === "insufficient").length
            }
        };
    }

    /**
     * 🆕 Tìm test cases trùng lặp (duplicate titles)
     */
    async findDuplicateTestCases(projectId: string, versionId?: string) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        const duplicates = await Testcase.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$title",
                    count: { $sum: 1 },
                    test_cases: {
                        $push: {
                            _id: "$_id",
                            test_type: "$test_type",
                            status: "$status",
                            created_at: "$createdAt"
                        }
                    }
                }
            },
            { $match: { count: { $gt: 1 } } },
            { $sort: { count: -1 } }
        ]);

        return duplicates;
    }
    // Thêm method mới trong TestcaseService
    async previewEnhancedTestCases(
        projectId: string,
        versionId: string,
        newRequirementIds: string[],
        language: string = 'vi-VN'
    ): Promise<{
        existingTestCases: any[];
        enhancementPreview: any;
        comparison: any;
    }> {
        // 1. Lấy existing test cases
        const existingTestCases = await Testcase.find({
            project_id: projectId,
            version_id: versionId
        }).lean();

        // 2. Lấy new requirements
        const version = await Version.findOne({
            project_id: projectId,
            _id: versionId
        });

        if (!version) {
            throw new Error("Version not found");
        }

        const newRequirements = version.requirement_model.filter(
            req => newRequirementIds.includes(req.id)
        );

        if (newRequirements.length === 0) {
            throw new Error("No matching new requirements found");
        }

        // 3. Generate enhancement preview
        const enhancementResult = await this.testcaseGeminiService.enhanceTestCases(
            existingTestCases,
            newRequirements,
            language
        );

        // 4. Tạo comparison data
        const comparison = this.createEnhancementComparison(
            existingTestCases,
            enhancementResult
        );

        return {
            existingTestCases,
            enhancementPreview: enhancementResult,
            comparison
        };
    }

    private createEnhancementComparison(existingTestCases: any[], enhancementResult: any): any {
        const existingCount = existingTestCases.length;
        const additionalCount = enhancementResult.additional_testcases?.length || 0;
        const updatedCount = enhancementResult.updated_testcases?.length || 0;

        // Phân tích coverage improvements
        const existingCoverage = this.extractRequirementsCoverage(existingTestCases);
        const newCoverage = this.extractRequirementsCoverage([
            ...existingTestCases,
            ...(enhancementResult.additional_testcases || [])
        ]);

        return {
            summary: {
                existing_test_cases: existingCount,
                new_test_cases: additionalCount,
                updated_test_cases: updatedCount,
                total_after_enhancement: existingCount + additionalCount,
                coverage_improvement: newCoverage.length - existingCoverage.length
            },
            details: {
                additional_test_cases: enhancementResult.additional_testcases?.map((tc: any) => ({
                    title: tc.title,
                    test_type: tc.test_type,
                    priority: tc.priority,
                    source_requirements: tc.source_requirement_ids,
                    database_tables: tc.database_tables
                })) || [],
                updated_test_cases: enhancementResult.updated_testcases?.map((tc: any) => ({
                    id: tc.id, // Nếu có ID từ existing
                    title: tc.title,
                    changes: this.identifyTestCaseChanges(tc, existingTestCases)
                })) || [],
                coverage_analysis: {
                    existing_requirements_covered: existingCoverage,
                    new_requirements_covered: newCoverage.filter((req: string) => !existingCoverage.includes(req)),
                    total_requirements_covered: newCoverage
                }
            },
            enterprise_metrics: {
                before: this.calculateEnterpriseMetrics(existingTestCases),
                after: this.calculateEnterpriseMetrics([
                    ...existingTestCases,
                    ...(enhancementResult.additional_testcases || [])
                ]),
                improvement: this.calculateImprovementMetrics(existingTestCases, enhancementResult)
            }
        };
    }

    private identifyTestCaseChanges(updatedTestCase: any, existingTestCases: any[]): string[] {
        const changes: string[] = [];

        // Tìm test case tương ứng bằng title (vì có thể chưa có ID)
        const existing = existingTestCases.find(tc => tc.title === updatedTestCase.title);

        if (!existing) return ['New test case'];

        if (existing.title !== updatedTestCase.title) changes.push('Title updated');
        if (JSON.stringify(existing.steps) !== JSON.stringify(updatedTestCase.steps)) changes.push('Steps modified');
        if (JSON.stringify(existing.test_data) !== JSON.stringify(updatedTestCase.test_data)) changes.push('Test data updated');
        if (existing.priority !== updatedTestCase.priority) changes.push('Priority changed');
        if (JSON.stringify(existing.expected_results) !== JSON.stringify(updatedTestCase.expected_results)) changes.push('Expected results updated');

        return changes.length > 0 ? changes : ['Minor enhancements'];
    }

    private calculateImprovementMetrics(existingTestCases: any[], enhancementResult: any): any {
        const beforeMetrics = this.calculateEnterpriseMetrics(existingTestCases);
        const afterTestCases = [
            ...existingTestCases,
            ...(enhancementResult.additional_testcases || [])
        ];
        const afterMetrics = this.calculateEnterpriseMetrics(afterTestCases);

        return {
            test_cases_increase: afterMetrics.total_test_cases - beforeMetrics.total_test_cases,
            automation_rate_change: afterMetrics.automation_rate - beforeMetrics.automation_rate,
            coverage_increase: afterMetrics.test_types_covered.length - beforeMetrics.test_types_covered.length,
            steps_increase: afterMetrics.total_steps - beforeMetrics.total_steps,
            test_data_increase: afterMetrics.total_test_data_scenarios - beforeMetrics.total_test_data_scenarios
        };
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

}