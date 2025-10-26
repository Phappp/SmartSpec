import Testcase from "../../../../../internal/model/testcase";
import Database from "../../../../../internal/model/database";
import Version from "../../../../../internal/model/version";
import { TestcaseGeminiService } from "./GeminiService";

export class TestcaseService {
    private testcaseGeminiService = new TestcaseGeminiService();

    /**
     * Generate test cases từ requirements và database schema với selection
     */
    async generateTestCases(
        projectId: string,
        versionId: string,
        selectedRequirementIds: string[],
        language: string = 'vi-VN'
    ) {
        console.log(`🎯 Generating test cases for ${selectedRequirementIds.length} selected requirements`);

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

        // 3. Gen test cases
        return await this.testcaseGeminiService.generateTestCases(
            requirementsToProcess,
            database,
            language
        );
    }

    /**
     * Enhance existing test cases với requirements mới
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

        const newRequirements = version.requirement_model.filter(
            req => newRequirementIds.includes(req.id)
        );

        // 3. Enhance
        return await this.testcaseGeminiService.enhanceTestCases(
            existingTestCases,
            newRequirements,
            language
        );
    }


    /**
     * Lưu test cases vào database
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
     * Lấy test cases theo project và version
     */
    async getTestCasesByProject(projectId: string, versionId?: string, filters: any = {}) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        // Apply filters
        if (filters.test_type) query.test_type = filters.test_type;
        if (filters.status) query.status = filters.status;
        if (filters.priority) query.priority = filters.priority;
        if (filters.database_tables) query.database_tables = { $in: filters.database_tables };

        return await Testcase.find(query)
            .populate('created_by', 'name email')
            .populate('executed_by', 'name email')
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Lấy test cases theo database table
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
     * Lấy test case theo ID
     */
    async getTestCaseById(id: string) {
        return await Testcase.findById(id)
            .populate('created_by', 'name email')
            .populate('executed_by', 'name email')
            .populate('exceptions.resolved_by', 'name email');
    }

    /**
     * Cập nhật test case
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
     * Thực thi test case
     */
    async executeTestCase(id: string, executionData: any, executedBy?: string) {
        const updateData: any = {
            status: executionData.status,
            executed_at: new Date()
        };

        if (executionData.actual_result !== undefined) updateData.actual_result = executionData.actual_result;
        if (executionData.execution_logs !== undefined) updateData.execution_logs = executionData.execution_logs;
        if (executionData.environment !== undefined) updateData.environment = executionData.environment;
        if (executionData.exceptions !== undefined) updateData.exceptions = executionData.exceptions;
        if (executedBy !== undefined) updateData.executed_by = executedBy;

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
     * Lấy test statistics với database coverage
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
                    // 🆕 Thống kê database coverage
                    database_tables_covered: { $addToSet: "$database_tables" },
                    database_operations_covered: { $addToSet: "$database_operations" }
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
                    // 🆕 Database coverage stats
                    database_coverage: {
                        tables_covered: { $size: { $setUnion: "$database_tables_covered" } },
                        operations_covered: { $size: { $setUnion: "$database_operations_covered" } }
                    }
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
            }
        };
    }

    /**
     * 🆕 Lấy database coverage report
     */
    async getDatabaseCoverageReport(projectId: string, versionId?: string) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        // Lấy database schema để biết tổng số tables
        const dbQuery: any = { project_id: projectId };
        if (versionId) dbQuery.version_id = versionId;

        const database = await Database.findOne(dbQuery).lean();
        const totalTables = database?.tables?.length || 0;

        // Lấy thống kê test cases coverage
        const coverageStats = await Testcase.aggregate([
            { $match: query },
            { $unwind: "$database_tables" },
            {
                $group: {
                    _id: "$database_tables",
                    test_case_count: { $sum: 1 },
                    test_types: { $addToSet: "$test_type" },
                    priorities: { $addToSet: "$priority" }
                }
            },
            {
                $project: {
                    table_name: "$_id",
                    test_case_count: 1,
                    test_types: 1,
                    priorities: 1,
                    coverage_score: {
                        $cond: [
                            { $gt: ["$test_case_count", 0] },
                            "good",
                            "poor"
                        ]
                    }
                }
            },
            { $sort: { test_case_count: -1 } }
        ]);

        return {
            total_tables: totalTables,
            covered_tables: coverageStats.length,
            coverage_percentage: totalTables > 0 ? Math.round((coverageStats.length / totalTables) * 100) : 0,
            table_coverage: coverageStats,
            uncovered_tables: database?.tables
                ?.filter((table: any) => !coverageStats.some((stat: any) => stat.table_name === table.name))
                .map((table: any) => table.name) || []
        };
    }
}