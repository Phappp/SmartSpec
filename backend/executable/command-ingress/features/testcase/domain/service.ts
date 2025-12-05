// TestcaseService.ts
import { Types } from "mongoose";
import Testcase from "../../../../../internal/model/testcase";
import Database from "../../../../../internal/model/database";
import Version from "../../../../../internal/model/version";
import Usecase from "../../../../../internal/model/usecase";
import User from "../../../../../internal/model/user";
import { TestcaseGeminiService } from "./GeminiService";
import { VersionService } from "../../version/domain/service";
import { LogService } from "../../log/domain/service";
import { PreviewChangeDto } from "../../version/adapter/preview.dto";

export class TestcaseService {
    private testcaseGeminiService = new TestcaseGeminiService();
    private logService = new LogService();
    private versionService = new VersionService();

    /**
     * Generate enterprise test cases from selected requirements
     */
    async generateTestCases(
        projectId: string,
        versionId: string,
        userId: string,
        selectedRequirementIds: string[],
        language: string = 'vi-VN',
        testType: string = 'all'
    ) {
        console.log(`🎯 Generating ENTERPRISE test cases for ${selectedRequirementIds.length} selected requirements`);

        // Get version and requirements
        const version = await Version.findOne({
            project_id: projectId,
            _id: versionId
        });

        if (!version) {
            throw new Error("Version not found");
        }

        // Lấy usecases từ collection
        const allUsecases = await Usecase.find({ version_id: version._id }).lean();
        
        // Helper: Normalize requirement ID (support both _id and id for backward compatibility)
        const normalizeRequirementId = (req: any): string[] => {
            const ids: string[] = [];
            if (req._id) {
                const idStr = String(req._id).trim();
                ids.push(idStr);
                // Also add without ObjectId wrapper if it's an ObjectId string
                if (Types.ObjectId.isValid(idStr)) {
                    ids.push(new Types.ObjectId(idStr).toString());
                }
            }
            if (req.id && String(req.id).trim() !== String(req._id || '').trim()) {
                ids.push(String(req.id).trim());
            }
            return Array.from(new Set(ids)); // Remove duplicates
        };

        // Normalize selectedRequirementIds from frontend (handle ObjectId strings, plain strings, etc.)
        // Filter out null, undefined, empty strings, and invalid values
        const normalizedSelectedIds = selectedRequirementIds
            .filter(id => id != null && id !== '' && String(id).trim() !== '' && String(id).toLowerCase() !== 'null' && String(id).toLowerCase() !== 'undefined')
            .map(id => {
                const idStr = String(id).trim();
                // Try to convert to ObjectId if valid, otherwise use as-is
                if (Types.ObjectId.isValid(idStr)) {
                    return new Types.ObjectId(idStr).toString();
                }
                return idStr;
            })
            .filter(id => id && id !== ''); // Final filter to ensure no empty strings

        console.log('🔍 Testcase Generation Debug:', {
            selectedRequirementIds,
            normalizedSelectedIds,
            totalUsecases: allUsecases.length,
            usecaseIds: allUsecases.map(req => ({
                _id: req._id ? String(req._id) : null,
                id: req._id || null,
                name: req.name
            }))
        });

        // Filter requirements - handle both _id and id with normalized comparison
        const requirementsToProcess = allUsecases.filter(req => {
            const reqIds = normalizeRequirementId(req);
            return normalizedSelectedIds.some(selectedId => {
                const normalizedSelected = String(selectedId).trim();
                return reqIds.some(reqId => {
                    const normalizedReq = String(reqId).trim();
                    // Case-insensitive comparison and handle ObjectId string variations
                    return normalizedReq === normalizedSelected ||
                           normalizedReq.toLowerCase() === normalizedSelected.toLowerCase() ||
                           (Types.ObjectId.isValid(normalizedReq) && Types.ObjectId.isValid(normalizedSelected) &&
                            new Types.ObjectId(normalizedReq).toString() === new Types.ObjectId(normalizedSelected).toString());
                });
            });
        });

        if (normalizedSelectedIds.length === 0) {
            console.error('❌ No valid requirement IDs provided:', {
                originalSelectedRequirementIds: selectedRequirementIds,
                filteredCount: normalizedSelectedIds.length
            });
            throw new Error('No valid requirement IDs provided. Please select at least one requirement.');
        }

        if (requirementsToProcess.length === 0) {
            console.error('❌ No matching requirements found:', {
                selectedRequirementIds,
                normalizedSelectedIds,
                availableUsecaseIds: allUsecases.map(req => ({
                    _id: req._id ? String(req._id) : null,
                    name: req.name
                }))
            });
            throw new Error(`No matching requirements found. Selected IDs: ${normalizedSelectedIds.join(', ')}. Available usecases: ${allUsecases.length}`);
        }

        console.log(`✅ Found ${requirementsToProcess.length} matching requirements out of ${selectedRequirementIds.length} selected`);

        // Get database schema (optional)
        const database = await Database.findOne({
            project_id: projectId,
            version_id: versionId
        });

        const databaseSchema = database || {
            tables: [],
            relationships: []
        };

        console.log(`📊 Processing ${requirementsToProcess.length} requirements with ${databaseSchema.tables?.length || 0} tables`);

        // XỬ LÝ LOGIC KHI testType = "all"
        let generatedTestCases: any[];
        if (testType === 'all') {
            generatedTestCases = await this.generateAllTestTypes(
                requirementsToProcess,
                databaseSchema,
                language
            );
        } else {
            // Generate với testType cụ thể
            generatedTestCases = await this.testcaseGeminiService.generateTestCases(
                requirementsToProcess,
                databaseSchema,
                language,
                testType
            );
        }

        // ✅ Ghi log cho generate testcase
        try {
            const user = await User.findById(userId).lean();
            const username = user?.name || "Unknown User";
            await this.logService.createLog({
                project_id: projectId,
                user_id: userId,
                action: "generate_output",
                target_id: versionId,
                target_type: "testcases",
                version_number: version.version_number,
                affects_requirement: true,
                level: "info",
                performed_by_ai: true,
                details: {
                    after: {
                        count: generatedTestCases.length,
                        test_type: testType,
                        requirement_count: requirementsToProcess.length
                    },
                    message: `${username} generated ${generatedTestCases.length} test cases from ${requirementsToProcess.length} requirement(s) (type: ${testType})`
                }
            });
        } catch (logError) {
            console.error("❌ Error logging testcase generation:", logError);
            // Không throw error để không ảnh hưởng đến flow chính
        }

        return generatedTestCases;
    }

    private async generateAllTestTypes(requirements: any[], databaseSchema: any, language: string): Promise<any[]> {
        console.log(`🔄 Generating all test types for ${requirements.length} requirements`);

        const allTestCases: any[] = [];
        const testTypes = ['integration', 'api', 'ui', 'performance', 'security']; // Các loại test chính

        for (const requirement of requirements) {
            try {
                // Tạo test cases cho từng loại test
                for (const testType of testTypes) {
                    console.log(`🧪 Generating ${testType} tests for requirement: ${requirement.name}`);

                    const testCases = await this.testcaseGeminiService.generateTestCases(
                        [requirement], // Chỉ 1 requirement
                        databaseSchema,
                        language,
                        testType
                    );

                    // Thêm vào kết quả tổng
                    allTestCases.push(...testCases);

                    // Delay giữa các request để tránh rate limit
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error(`❌ Error generating tests for requirement ${requirement.name}:`, error);
                // Tiếp tục với requirement tiếp theo
                continue;
            }
        }

        console.log(`🎉 Generated total ${allTestCases.length} test cases across all types`);
        return allTestCases;
    }

    /**
     * Save test cases to database
     */
    // Sửa hàm saveTestCases
    // async saveTestCases(projectId: string, versionId: string, testCases: any[], createdBy?: string) {
    //     console.log('💾 Saving test cases:', {
    //         projectId,
    //         versionId,
    //         testCasesCount: testCases.length,
    //         createdBy
    //     });

    //     try {
    //         const testCasesToSave = testCases.map(testCase => {
    //             // XÓA id nếu có để MongoDB tự generate _id
    //             const { id, ...cleanTestCase } = testCase;

    //             return {
    //                 project_id: projectId,
    //                 version_id: versionId,
    //                 created_by: createdBy,
    //                 created_at: new Date(),
    //                 updated_at: new Date(),
    //                 ...cleanTestCase  // KHÔNG có id
    //             };
    //         });

    //         console.log('📦 Test cases ready for save:', testCasesToSave.length);

    //         const savedTestCases = await Testcase.insertMany(testCasesToSave, {
    //             ordered: false
    //         }).catch(error => {
    //             console.warn('⚠️ Some test cases failed, but continuing...', error);

    //             if (error.insertedDocs && error.insertedDocs.length > 0) {
    //                 return error.insertedDocs;
    //             }

    //             console.log('🔄 No insertedDocs found, returning original test cases');
    //             return testCasesToSave;
    //         });

    //         console.log(`✅ Successfully processed ${savedTestCases.length} test cases`);
    //         return savedTestCases;

    //     } catch (error: any) {
    //         console.warn('⚠️ Error caught but ignoring:', error);
    //         console.log('🔄 Returning original test cases as success');

    //         const safeTestCases = testCases.map(testCase => {
    //             const { id, ...cleanTestCase } = testCase;
    //             return {
    //                 project_id: projectId,
    //                 version_id: versionId,
    //                 created_by: createdBy,
    //                 created_at: new Date(),
    //                 updated_at: new Date(),
    //                 ...cleanTestCase
    //             };
    //         });

    //         return safeTestCases;
    //     }
    // }

    /**
     * Lưu ENTERPRISE test cases vào database
     */
    /**
 * Lưu ENTERPRISE test cases vào database
 */
    async saveTestCases(projectId: string, versionId: string, testCases: any[], createdBy?: string) {
        console.log('💾 Saving test cases:', {
            projectId,
            versionId,
            testCasesCount: testCases.length,
            createdBy
        });

        try {
            const testCasesToSave = testCases.map(testCase => {
                // XÓA id nếu có để MongoDB tự generate _id
                const { id, ...cleanTestCase } = testCase;

                return {
                    project_id: projectId,
                    version_id: versionId,
                    created_by: createdBy,
                    created_at: new Date(),
                    updated_at: new Date(),
                    ...cleanTestCase  // KHÔNG có id
                };
            });

            console.log('📦 Test cases ready for save:', testCasesToSave.length);

            const savedTestCases = await Testcase.insertMany(testCasesToSave, {
                ordered: false
            }).catch(error => {
                console.warn('⚠️ Some test cases failed, but continuing...', error);

                if (error.insertedDocs && error.insertedDocs.length > 0) {
                    return error.insertedDocs;
                }

                console.log('🔄 No insertedDocs found, returning original test cases');
                return testCasesToSave;
            });

            console.log(`✅ Successfully processed ${savedTestCases.length} test cases`);

            // ✅ Ghi log cho save testcase
            try {
                const version = await Version.findById(versionId).lean();
                if (version && createdBy) {
                    const user = await User.findById(createdBy).lean();
                    const username = user?.name || "Unknown User";
                    await this.logService.createLog({
                        project_id: projectId,
                        user_id: createdBy,
                        action: "generate_output",
                        target_id: versionId,
                        target_type: "testcases",
                        version_number: version.version_number,
                        affects_requirement: true,
                        level: "info",
                        performed_by_ai: false,
                        details: {
                            after: {
                                count: savedTestCases.length,
                                saved_ids: savedTestCases.map((tc: any) => tc._id?.toString() || tc.id)
                            },
                            message: `${username} saved ${savedTestCases.length} test cases to database`
                        }
                    });
                }
            } catch (logError) {
                console.error("❌ Error logging testcase save:", logError);
                // Không throw error để không ảnh hưởng đến flow chính
            }

            return savedTestCases;

        } catch (error: any) {
            console.warn('⚠️ Error caught but ignoring:', error);
            console.log('🔄 Returning original test cases as success');

            const safeTestCases = testCases.map(testCase => {
                const { id, ...cleanTestCase } = testCase;
                return {
                    project_id: projectId,
                    version_id: versionId,
                    created_by: createdBy,
                    created_at: new Date(),
                    updated_at: new Date(),
                    ...cleanTestCase
                };
            });

            return safeTestCases;
        }
    }

    /**
     * Lấy test cases theo project và version với Enterprise filters
     */
    async getTestCasesByProject(projectId: string, versionId?: string, filters: any = {}) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        // Apply filters
        if (filters.test_type) query.test_type = filters.test_type;
        if (filters.status) query.status = filters.status;
        if (filters.priority) query.priority = filters.priority;
        if (filters.database_tables) query.database_tables = { $in: filters.database_tables };
        if (filters.source_requirement_ids) query.source_requirement_ids = { $in: filters.source_requirement_ids };

        if (filters.search && filters.search.trim() !== '') {
            const searchRegex = new RegExp(filters.search, 'i'); // Case-insensitive search

            query.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { 'steps.action': searchRegex },
                { 'steps.expected_result': searchRegex },
                { expected_results: searchRegex },
                { actual_result: searchRegex },
                { database_tables: searchRegex }
            ];
        }

        return await Testcase.find(query)
            .populate('created_by', 'name email')
            .populate('executed_by', 'name email')
            .sort({ priority: -1, createdAt: -1 })
            .lean();
    }

    /**
     * Get test cases by database table
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
     * Get test case by ID
     */
    async getTestCaseById(id: string) {
        return await Testcase.findById(id)
            .populate('created_by', 'name email')
            .populate('executed_by', 'name email')
            .populate('exceptions.resolved_by', 'name email');
    }

    /**
     * Update test case
     */
    async updateTestCase(id: string, updateData: any, updatedBy?: string) {
        const forbiddenFields = ['_id', 'project_id', 'version_id', 'created_at', 'created_by'];
        forbiddenFields.forEach(field => delete updateData[field]);

        if (updatedBy) {
            updateData.updated_by = updatedBy;
        }
        /* -------------------------------------------------------
        * 1️⃣ Lấy test case hiện tại
        * -----------------------------------------------------*/
        const oldTestcase = await Testcase.findById(id).lean();
        if (!oldTestcase) throw new Error("Testcase not found");

        let version = await Version.findById(oldTestcase.version_id);
        if (!version) throw new Error("Version not found");

        let versionId = version._id.toString();
        let testcaseIdMap = new Map<string, string>();

        /* -------------------------------------------------------
        * 2️⃣ Nếu version permanent → BUMP trước
        * -----------------------------------------------------*/
        if (version.version_temporary === false) {
            const bumpRes = await this.versionService.bumpVersion(
                versionId,
                updatedBy!,
                "minor"
            );

            if (!bumpRes.data) throw new Error("Auto bump failed");

            version = bumpRes.data.newVersion;
            versionId = version._id.toString();

            // lấy map testcase cũ → mới (tcMap)
            testcaseIdMap = bumpRes.data.idMaps.tcMap || new Map();

            // lấy ID testcase mới sau bump
            const newId = testcaseIdMap.get(id);
            if (!newId) throw new Error("Updated testcase ID not found in bump map");

            id = newId;
        }
        const updatedTestcase = await Testcase.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .populate('created_by', 'name email')
            .populate('executed_by', 'name email');
        if (!updatedTestcase) throw new Error("Failed to update testcase after bump");
        /* -------------------------------------------------------
        * 4️⃣ Tạo PREVIEW CHANGE cho update
        * -----------------------------------------------------*/
        const changePayload: PreviewChangeDto = {
            entity_type: "testcase",
            change_type: "updated",
            entity_id: id,
            before_snapshot: oldTestcase,
            after_snapshot: updatedTestcase.toObject()
        };

        const previewRes = await this.versionService.createOrUpdatePreview(
            versionId,
            updatedBy,
            changePayload
        );
        // Lấy username từ User model
        let username = 'Unknown User';
        if (updatedBy) {
            const user = await User.findById(updatedBy);
            username = user?.name || username;
        }

        await this.logService.createLog({
            project_id: updatedTestcase.project_id.toString(),
            user_id: updatedBy,
            action: "update_output",
            target_id: id,
            target_type: "testcases",
            version_number: version.version_number,
            affects_requirement: false,
            level: "info",
            details: {
                message: `${username} updated testcase ${updatedTestcase?.title || id}`
            }
        });
        // Return cả testcase và version info để frontend có thể cập nhật selectedVersionId
        return {
            testcase: updatedTestcase,
            version: version,
            newVersionId: versionId
        };
    }

    /**
     * Execute test case
     */
    async executeTestCase(id: string, executionData: any, executedBy?: string) {
        const updateData: any = {
            status: executionData.status,
            executed_at: new Date(),
            actual_result: executionData.actual_result || ''
        };

        if (executionData.environment) updateData.environment = executionData.environment;

        // SỬA LỖI: Chuyển execution_logs thành object
        if (executionData.execution_logs) {
            updateData.$push = {
                execution_logs: {
                    $each: executionData.execution_logs.map((log: string) => ({
                        message: log,
                        timestamp: new Date(),
                        type: 'execution'
                    }))
                }
            };
        }

        if (executionData.exceptions) updateData.exceptions = executionData.exceptions;
        if (executedBy) updateData.executed_by = executedBy;

        // Update test data with actual outputs
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
     * Delete test case
     */
    async deleteTestCase(userId: string, id: string) {
        /* -------------------------------------------------------
        * 1️⃣ Load test case cũ
        * -----------------------------------------------------*/
        const oldTestcase = await Testcase.findById(id).lean();
        if (!oldTestcase) throw new Error("Testcase not found");

        let version = await Version.findById(oldTestcase.version_id);
        if (!version) throw new Error("Version not found for testcase");

        let versionId = version._id.toString();
        let testcaseIdMap = new Map<string, string>();

        /* -------------------------------------------------------
        * 2️⃣ Nếu version permanent → BUMP trước khi xoá
        * -----------------------------------------------------*/
        if (version.version_temporary === false) {
            const bumpRes = await this.versionService.bumpVersion(
                versionId,
                userId,
                "minor"
            );

            if (!bumpRes.data) throw new Error("Auto bump failed");

            version = bumpRes.data.newVersion;
            versionId = version._id.toString();

            // Map ID testcase cũ → testcase mới (tcMap)
            testcaseIdMap = bumpRes.data.idMaps.tcMap || new Map();

            // tìm ID mới của testcase cần xoá
            const newId = testcaseIdMap.get(id);
            if (!newId) throw new Error("Testcase to delete not found in bumped version map");

            id = newId;
        }

        /* -------------------------------------------------------
        * 3️⃣ Xoá testcase trong version sau bump
        * -----------------------------------------------------*/
        const deletedTC = await Testcase.findByIdAndDelete(id).lean();
        if (!deletedTC) throw new Error("Failed to delete testcase");

        /* -------------------------------------------------------
        * 4️⃣ Tạo PREVIEW CHANGE cho delete
        * -----------------------------------------------------*/
        const changePayload: PreviewChangeDto = {
            entity_type: "testcase",
            change_type: "deleted",
            entity_id: id,
            before_snapshot: oldTestcase,  // before = data cũ
            after_snapshot: null           // after = null
        };

        const previewRes = await this.versionService.createOrUpdatePreview(
            versionId,
            userId,
            changePayload
        );

        versionId = previewRes.data.versionId;

        /* -------------------------------------------------------
        * 5️⃣ Ghi LOG Enterprise
        * -----------------------------------------------------*/
        const user = await User.findById(userId).lean();
        const username = user?.name || "Unknown User";

        await this.logService.createLog({
            project_id: oldTestcase.project_id.toString(),
            user_id: userId,
            action: "delete_output",
            target_id: id,
            target_type: "testcases",
            version_number: version.version_number,
            affects_requirement: false,
            level: "warning",
            details: {
                message: `${username} deleted testcase ${oldTestcase.title}`
            }
        });

        /* -------------------------------------------------------
        * 6️⃣ Trả về đầy đủ
        * -----------------------------------------------------*/
        return deletedTC
    }


    /**
     * Get test statistics
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
                    database_tables_covered: { $addToSet: "$database_tables" },
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
                    database_coverage: {
                        tables_covered: { $size: { $setUnion: "$database_tables_covered" } }
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
            database_coverage: { tables_covered: 0 },
            requirement_coverage_count: 0
        };
    }

    /**
     * Get database coverage report
     */
    async getDatabaseCoverageReport(projectId: string, versionId?: string) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        // Get database schema
        const dbQuery: any = { project_id: projectId };
        if (versionId) dbQuery.version_id = versionId;

        const database = await Database.findOne(dbQuery).lean();
        const totalTables = database?.tables?.length || 0;

        // Get coverage stats
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

        // Find uncovered tables
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
            coverage_quality: {
                excellent: coverageStats.filter((s: any) => s.coverage_score === "excellent").length,
                good: coverageStats.filter((s: any) => s.coverage_score === "good").length,
                fair: coverageStats.filter((s: any) => s.coverage_score === "fair").length,
                poor: coverageStats.filter((s: any) => s.coverage_score === "poor").length
            }
        };
    }

    /**
     * Get requirement coverage report
     */
    async getRequirementCoverageReport(projectId: string, versionId?: string) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        // Get requirements from version
        const versionQuery: any = { project_id: projectId };
        if (versionId) versionQuery._id = versionId;

        const version = await Version.findOne(versionQuery).lean();
        
        // Lấy tổng số usecases từ collection
        const usecaseQuery: any = { project_id: projectId };
        if (versionId) usecaseQuery.version_id = versionId;
        const totalRequirements = await Usecase.countDocuments(usecaseQuery);

        // Get covered requirements from test cases
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
                    from: "usecases",
                    let: { requirementId: "$_id", projectId: projectId, versionId: versionId },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$project_id", { $toObjectId: projectId }] } } },
                        ...(versionId ? [{ $match: { $expr: { $eq: ["$version_id", { $toObjectId: versionId }] } } }] : []),
                        { $match: { $expr: { $eq: [{ $toString: "$_id" }, { $toString: "$$requirementId" }] } } }
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
     * Find duplicate test cases
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

    /**
     * Get test case metrics for dashboard
     */
    async getDashboardMetrics(projectId: string, versionId?: string) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        const metrics = await Testcase.aggregate([
            { $match: query },
            {
                $facet: {
                    statusSummary: [
                        {
                            $group: {
                                _id: "$status",
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    typeSummary: [
                        {
                            $group: {
                                _id: "$test_type",
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    prioritySummary: [
                        {
                            $group: {
                                _id: "$priority",
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    automationSummary: [
                        {
                            $group: {
                                _id: "$automation.is_automated",
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    recentActivity: [
                        { $sort: { updated_at: -1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                title: 1,
                                status: 1,
                                test_type: 1,
                                updated_at: 1
                            }
                        }
                    ]
                }
            }
        ]);

        return metrics[0] || {
            statusSummary: [],
            typeSummary: [],
            prioritySummary: [],
            automationSummary: [],
            recentActivity: []
        };
    }

    /**
     * Bulk update test cases
     */
    async bulkUpdateTestCases(ids: string[], updateData: any, updatedBy?: string) {
        const forbiddenFields = ['_id', 'project_id', 'version_id', 'created_at', 'created_by'];
        forbiddenFields.forEach(field => delete updateData[field]);

        if (updatedBy) {
            updateData.updated_by = updatedBy;
        }

        updateData.updated_at = new Date();

        const result = await Testcase.updateMany(
            { _id: { $in: ids } },
            { $set: updateData }
        );

        return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount
        };
    }

    /**
     * Bulk delete test cases
     */
    async bulkDeleteTestCases(ids: string[]) {
        const result = await Testcase.deleteMany({
            _id: { $in: ids }
        });

        return {
            deletedCount: result.deletedCount
        };
    }

    /**
     * Export test cases to JSON
     */
    async exportTestCases(projectId: string, versionId?: string) {
        const query: any = { project_id: projectId };
        if (versionId) query.version_id = versionId;

        const testCases = await Testcase.find(query)
            .populate('created_by', 'name email')
            .populate('executed_by', 'name email')
            .lean();

        const exportData = {
            export_date: new Date().toISOString(),
            project_id: projectId,
            version_id: versionId,
            total_test_cases: testCases.length,
            test_cases: testCases.map(tc => ({
                title: tc.title,
                description: tc.description,
                test_type: tc.test_type,
                priority: tc.priority,
                status: tc.status,
                source_requirement_ids: tc.source_requirement_ids,
                database_tables: tc.database_tables,
                steps: tc.steps,
                test_data: tc.test_data,
                expected_results: tc.expected_results,
                automation: tc.automation
            }))
        };

        return exportData;
    }

    /**
     * Import test cases from JSON
     */
    async importTestCases(projectId: string, versionId: string, importData: any, createdBy?: string) {
        const testCasesToImport = importData.test_cases.map((tc: any) => ({
            project_id: projectId,
            version_id: versionId,
            created_by: createdBy,
            created_at: new Date(),
            updated_at: new Date(),
            ...tc
        }));

        const result = await Testcase.insertMany(testCasesToImport, {
            ordered: false
        });

        return {
            importedCount: result.length,
            totalCount: testCasesToImport.length
        };
    }

}