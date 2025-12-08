// exportService.ts
import * as ExcelJS from 'exceljs';
import Testcase from "../../../../../internal/model/testcase";
import Database from "../../../../../internal/model/database";
import Version from "../../../../../internal/model/version";
import Usecase from "../../../../../internal/model/usecase";

export interface ExportFilters {
    test_type?: string;
    status?: string;
    priority?: string;
    database_tables?: string[];
    source_requirement_ids?: string[];
    testCaseIds?: string[]; // Specific test case IDs to export
    date_range?: {
        start: Date;
        end: Date;
    };
}

export class TestcaseExportService {

    /**
     * Export comprehensive test cases report to Excel
     */
    async exportTestCasesToExcel(
        projectId: string,
        versionId?: string,
        filters: ExportFilters = {}
    ): Promise<Buffer> {
        console.log(`📊 Exporting test cases to Excel for project: ${projectId}`, { versionId, filters });

        // Lấy test cases với filters
        const testCases = await this.getTestCasesWithFilters(projectId, versionId, filters);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Test Management System';
        workbook.created = new Date();

        // === MAIN TEST CASES SHEET ===
        await this.createMainTestCasesSheet(workbook, testCases);

        // === DETAILED SHEET ===
        await this.createDetailedSheet(workbook, testCases);

        // === SUMMARY SHEET ===
        await this.createSummarySheet(workbook, projectId, versionId, testCases);

        // === EXECUTION HISTORY SHEET ===
        await this.createExecutionHistorySheet(workbook, testCases);

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * Export test cases to Excel with custom sheets and fields
     */
    async exportTestCasesToExcelWithSheets(
        projectId: string,
        versionId: string | undefined,
        sheets: Array<{ name: string; testCaseIds: string[] }>,
        fields: string[],
        filters: ExportFilters = {}
    ): Promise<Buffer> {
        console.log(`📊 Exporting test cases with custom sheets for project: ${projectId}`, {
            sheetsCount: sheets.length,
            fieldsCount: fields.length
        });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Test Management System';
        workbook.created = new Date();

        // Get all test cases that are in any sheet
        const allTestCaseIds = new Set<string>();
        sheets.forEach(sheet => {
            sheet.testCaseIds.forEach(id => allTestCaseIds.add(String(id)));
        });

        // Fetch all test cases
        const query: any = {
            project_id: projectId,
            _id: { $in: Array.from(allTestCaseIds) }
        };
        if (versionId) query.version_id = versionId;

        const allTestCases = await Testcase.find(query)
            .populate('created_by', 'name email')
            .populate('executed_by', 'name email')
            .lean();

        // Create a map for quick lookup
        const testCaseMap = new Map<string, any>();
        allTestCases.forEach(tc => {
            testCaseMap.set(String(tc._id), tc);
        });

        // Create sheets
        for (const sheetConfig of sheets) {
            const sheetTestCases = sheetConfig.testCaseIds
                .map(id => testCaseMap.get(String(id)))
                .filter(tc => tc !== undefined);

            if (sheetTestCases.length > 0) {
                await this.createCustomSheet(workbook, sheetConfig.name, sheetTestCases, fields);
            }
        }

        // Create Status Summary Sheet
        await this.createStatusSummarySheet(workbook, allTestCases);

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    // ==================== PRIVATE METHODS ====================

    private async getTestCasesWithFilters(
        projectId: string,
        versionId?: string,
        filters: ExportFilters = {}
    ): Promise<any[]> {
        const query: any = { project_id: projectId };

        if (versionId) query.version_id = versionId;
        
        // If specific test case IDs are provided, use them (highest priority)
        if (filters.testCaseIds && filters.testCaseIds.length > 0) {
            query._id = { $in: filters.testCaseIds };
        } else {
            // Otherwise, apply other filters
            if (filters.test_type) query.test_type = filters.test_type;
            if (filters.status) query.status = filters.status;
            if (filters.priority) query.priority = filters.priority;
            if (filters.database_tables) query.database_tables = { $in: filters.database_tables };
            if (filters.source_requirement_ids) query.source_requirement_ids = { $in: filters.source_requirement_ids };
        }
        
        if (filters.date_range) {
            query.created_at = {
                $gte: filters.date_range.start,
                $lte: filters.date_range.end
            };
        }

        return await Testcase.find(query)
            .populate('created_by', 'name email')
            .populate('executed_by', 'name email')
            .populate('exceptions.resolved_by', 'name email')
            .sort({ priority: -1, created_at: -1 })
            .lean();
    }

    // ==================== SHEET CREATION METHODS ====================

    private async createMainTestCasesSheet(workbook: ExcelJS.Workbook, testCases: any[]): Promise<void> {
        const sheet = workbook.addWorksheet('Test Cases Overview');

        sheet.columns = [
            { header: 'ID', key: 'id', width: 12 },
            { header: 'Title', key: 'title', width: 40 },
            { header: 'Type', key: 'test_type', width: 15 },
            { header: 'Priority', key: 'priority', width: 12 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Requirements', key: 'requirements', width: 20 },
            { header: 'Database Tables', key: 'database_tables', width: 25 },
            { header: 'Steps Count', key: 'steps_count', width: 12 },
            { header: 'Automated', key: 'automated', width: 12 },
            { header: 'Created By', key: 'created_by', width: 20 },
            { header: 'Created Date', key: 'created_date', width: 15 },
            { header: 'Last Executed', key: 'last_executed', width: 15 }
        ];

        this.applyHeaderStyle(sheet, '4472C4');

        testCases.forEach((testCase, index) => {
            const row = sheet.addRow({
                id: testCase._id?.toString() || '',
                title: testCase.title,
                test_type: this.formatEnumValue(testCase.test_type),
                priority: this.formatEnumValue(testCase.priority),
                status: this.formatEnumValue(testCase.status),
                requirements: testCase.source_requirement_ids?.join(', ') || '',
                database_tables: testCase.database_tables?.join(', ') || '',
                steps_count: testCase.steps?.length || 0,
                automated: testCase.automation?.is_automated ? 'Yes' : 'No',
                created_by: testCase.created_by?.name || 'N/A',
                created_date: testCase.created_at ? new Date(testCase.created_at).toLocaleDateString() : '',
                last_executed: testCase.executed_at ? new Date(testCase.executed_at).toLocaleDateString() : 'Never'
            });

            this.applyStatusStyle(row.getCell('status'), testCase.status);
            this.applyPriorityStyle(row.getCell('priority'), testCase.priority);

            // Alternate row coloring
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'F8F9FA' }
                };
            }
        });

        // Auto-filter
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: sheet.rowCount, column: sheet.columnCount }
        };
    }

    private async createDetailedSheet(workbook: ExcelJS.Workbook, testCases: any[]): Promise<void> {
        const sheet = workbook.addWorksheet('Test Case Details');

        sheet.columns = [
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Description', key: 'description', width: 40 },
            { header: 'Test Type', key: 'test_type', width: 15 },
            { header: 'Objectives', key: 'objectives', width: 30 },
            { header: 'Preconditions', key: 'preconditions', width: 30 },
            { header: 'Postconditions', key: 'postconditions', width: 30 },
            { header: 'Steps', key: 'steps', width: 50 },
            { header: 'Expected Results', key: 'expected_results', width: 40 },
            { header: 'Test Data', key: 'test_data', width: 30 },
            { header: 'Environment', key: 'environment', width: 25 }
        ];

        this.applyHeaderStyle(sheet, '70AD47');

        // Limit to first 100 test cases for performance
        const limitedTestCases = testCases.slice(0, 100);

        for (const testCase of limitedTestCases) {
            sheet.addRow({
                title: testCase.title,
                description: testCase.description || '',
                test_type: this.formatEnumValue(testCase.test_type),
                objectives: testCase.objectives?.join('; ') || '',
                preconditions: testCase.preconditions?.join('; ') || '',
                postconditions: testCase.postconditions?.join('; ') || '',
                steps: this.formatSteps(testCase.steps),
                expected_results: this.formatExpectedResults(testCase.expected_results),
                test_data: this.formatTestData(testCase.test_data),
                environment: this.formatEnvironment(testCase.environment)
            });
        }
    }

    private async createSummarySheet(
        workbook: ExcelJS.Workbook,
        projectId: string,
        versionId?: string,
        testCases?: any[]
    ): Promise<void> {
        const sheet = workbook.addWorksheet('Summary Report');

        const stats = await this.calculateBasicStats(testCases || []);
        const dbCoverage = await this.getDatabaseCoverage(projectId, versionId);
        const reqCoverage = await this.getRequirementCoverage(projectId, versionId);

        sheet.columns = [
            { header: 'Category', key: 'category', width: 25 },
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 20 },
            { header: 'Percentage', key: 'percentage', width: 15 }
        ];

        this.applyHeaderStyle(sheet, 'FFC000');

        const summaryData = [
            // Test Case Statistics
            { category: 'Test Cases', metric: 'Total Test Cases', value: stats.total, percentage: '' },
            { category: 'Test Cases', metric: 'Automated Test Cases', value: stats.automated, percentage: stats.automationRate },
            { category: 'Test Cases', metric: 'Manual Test Cases', value: stats.manual, percentage: stats.manualRate },

            // Status Distribution
            { category: 'Execution Status', metric: 'Passed', value: stats.byStatus.passed, percentage: stats.statusRates.passed },
            { category: 'Execution Status', metric: 'Failed', value: stats.byStatus.failed, percentage: stats.statusRates.failed },
            { category: 'Execution Status', metric: 'Blocked', value: stats.byStatus.blocked, percentage: stats.statusRates.blocked },
            { category: 'Execution Status', metric: 'Not Executed', value: stats.byStatus.not_executed, percentage: stats.statusRates.not_executed },

            // Coverage
            { category: 'Coverage', metric: 'Database Tables Covered', value: dbCoverage.covered_tables, percentage: dbCoverage.coverage_percentage + '%' },
            { category: 'Coverage', metric: 'Requirements Covered', value: reqCoverage.covered_requirements, percentage: reqCoverage.coverage_percentage + '%' },

            // Priority Distribution
            { category: 'Priority', metric: 'Critical', value: stats.byPriority.critical, percentage: stats.priorityRates.critical },
            { category: 'Priority', metric: 'High', value: stats.byPriority.high, percentage: stats.priorityRates.high },
            { category: 'Priority', metric: 'Medium', value: stats.byPriority.medium, percentage: stats.priorityRates.medium },
            { category: 'Priority', metric: 'Low', value: stats.byPriority.low, percentage: stats.priorityRates.low }
        ];

        summaryData.forEach((item, index) => {
            const row = sheet.addRow(item);

            // Color coding by category
            if (item.category === 'Test Cases') {
                row.getCell('category').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } };
            } else if (item.category === 'Execution Status') {
                row.getCell('category').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } };
            } else if (item.category === 'Coverage') {
                row.getCell('category').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DDEBF7' } };
            } else if (item.category === 'Priority') {
                row.getCell('category').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FCE4D6' } };
            }
        });
    }

    private async createExecutionHistorySheet(workbook: ExcelJS.Workbook, testCases: any[]): Promise<void> {
        const sheet = workbook.addWorksheet('Execution History');

        sheet.columns = [
            { header: 'Test Case', key: 'test_case', width: 30 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Last Execution', key: 'last_execution', width: 20 },
            { header: 'Last Status', key: 'last_status', width: 15 },
            { header: 'Executed By', key: 'executed_by', width: 20 },
            { header: 'Duration (ms)', key: 'duration', width: 15 },
            { header: 'Environment', key: 'environment', width: 20 },
            { header: 'Execution Count', key: 'execution_count', width: 15 }
        ];

        this.applyHeaderStyle(sheet, '7030A0');

        testCases.forEach((testCase, index) => {
            const lastExecution = testCase.execution_history?.[0];
            const executionCount = testCase.execution_history?.length || 0;

            const row = sheet.addRow({
                test_case: testCase.title,
                type: testCase.test_type,
                last_execution: lastExecution?.executed_at ? new Date(lastExecution.executed_at).toLocaleString() : 'Never',
                last_status: lastExecution?.result || 'Not Executed',
                executed_by: lastExecution?.executed_by?.name || 'N/A',
                duration: lastExecution?.duration_ms || 'N/A',
                environment: lastExecution?.environment_snapshot?.runtime_env || 'N/A',
                execution_count: executionCount
            });

            if (lastExecution) {
                this.applyStatusStyle(row.getCell('last_status'), lastExecution.result);
            }
        });
    }

    // ==================== HELPER METHODS ====================

    private applyHeaderStyle(sheet: ExcelJS.Worksheet, color: string): void {
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    private applyStatusStyle(cell: ExcelJS.Cell, status: string): void {
        const statusColors: { [key: string]: string } = {
            'passed': '70AD47', // Green
            'failed': 'FF0000', // Red
            'blocked': 'FFC000', // Orange
            'not_executed': 'A5A5A5', // Gray
            'in_progress': '5B9BD5' // Blue
        };

        const color = statusColors[status] || 'FFFFFF';
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color }
        };

        if (color !== 'FFFFFF') {
            cell.font = { color: { argb: 'FFFFFF' }, bold: true };
        }
    }

    private applyPriorityStyle(cell: ExcelJS.Cell, priority: string): void {
        const priorityColors: { [key: string]: string } = {
            'critical': 'C00000', // Dark Red
            'high': 'FF0000', // Red
            'medium': 'FFC000', // Orange
            'low': 'FFFF00' // Yellow
        };

        const color = priorityColors[priority];
        if (color) {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: color }
            };
            cell.font = { bold: true };
        }
    }

    private formatEnumValue(value: string): string {
        if (!value) return '';
        return value.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    private formatSteps(steps: any[]): string {
        if (!steps || !Array.isArray(steps)) return '';

        return steps.map(step =>
            `${step.step_number}. ${step.action} → ${step.expected_immediate_result}`
        ).join('\n');
    }

    private formatExpectedResults(expectedResults: any): string {
        if (!expectedResults) return '';

        const parts = [];
        if (expectedResults.ui_level?.length > 0) {
            parts.push(`UI: ${expectedResults.ui_level.join('; ')}`);
        }
        if (expectedResults.api_level?.status_code) {
            parts.push(`API: Status ${expectedResults.api_level.status_code}`);
        }
        if (expectedResults.database_level?.length > 0) {
            parts.push(`DB: ${expectedResults.database_level.join('; ')}`);
        }
        if (expectedResults.business_level) {
            parts.push(`Business: ${expectedResults.business_level}`);
        }

        return parts.join('\n');
    }

    private formatTestData(testData: any[]): string {
        if (!testData || !Array.isArray(testData)) return '';

        return testData.map(data =>
            `${data.name} (${Object.keys(data.input_payload || {}).length} inputs)`
        ).join('; ');
    }

    private formatEnvironment(environment: any): string {
        if (!environment) return '';

        const parts = [];
        if (environment.os) parts.push(environment.os);
        if (environment.browser) parts.push(environment.browser);
        if (environment.runtime_env) parts.push(environment.runtime_env);
        if (environment.device) parts.push(environment.device);

        return parts.join(' / ');
    }

    // ==================== STATISTICS METHODS ====================

    private async calculateBasicStats(testCases: any[]): Promise<any> {
        const total = testCases.length;
        const automated = testCases.filter(tc => tc.automation?.is_automated).length;
        const manual = total - automated;

        const byStatus = {
            passed: testCases.filter(tc => tc.status === 'passed').length,
            failed: testCases.filter(tc => tc.status === 'failed').length,
            blocked: testCases.filter(tc => tc.status === 'blocked').length,
            not_executed: testCases.filter(tc => tc.status === 'not_executed').length,
            in_progress: testCases.filter(tc => tc.status === 'in_progress').length
        };

        const byPriority = {
            critical: testCases.filter(tc => tc.priority === 'critical').length,
            high: testCases.filter(tc => tc.priority === 'high').length,
            medium: testCases.filter(tc => tc.priority === 'medium').length,
            low: testCases.filter(tc => tc.priority === 'low').length
        };

        return {
            total,
            automated,
            manual,
            automationRate: total > 0 ? `${((automated / total) * 100).toFixed(1)}%` : '0%',
            manualRate: total > 0 ? `${((manual / total) * 100).toFixed(1)}%` : '0%',
            byStatus,
            byPriority,
            statusRates: {
                passed: total > 0 ? `${((byStatus.passed / total) * 100).toFixed(1)}%` : '0%',
                failed: total > 0 ? `${((byStatus.failed / total) * 100).toFixed(1)}%` : '0%',
                blocked: total > 0 ? `${((byStatus.blocked / total) * 100).toFixed(1)}%` : '0%',
                not_executed: total > 0 ? `${((byStatus.not_executed / total) * 100).toFixed(1)}%` : '0%',
                in_progress: total > 0 ? `${((byStatus.in_progress / total) * 100).toFixed(1)}%` : '0%'
            },
            priorityRates: {
                critical: total > 0 ? `${((byPriority.critical / total) * 100).toFixed(1)}%` : '0%',
                high: total > 0 ? `${((byPriority.high / total) * 100).toFixed(1)}%` : '0%',
                medium: total > 0 ? `${((byPriority.medium / total) * 100).toFixed(1)}%` : '0%',
                low: total > 0 ? `${((byPriority.low / total) * 100).toFixed(1)}%` : '0%'
            }
        };
    }


    private async getDatabaseCoverage(projectId: string, versionId?: string): Promise<any> {
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
                    priorities: { $addToSet: "$priority" },
                    statuses: { $addToSet: "$status" }
                }
            },
            {
                $project: {
                    table_name: "$_id",
                    test_case_count: 1,
                    test_types: 1,
                    priorities: 1,
                    statuses: 1,
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

    private async getRequirementCoverage(projectId: string, versionId?: string): Promise<any> {
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
                    priorities: { $addToSet: "$priority" },
                    statuses: { $addToSet: "$status" }
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
                    requirement_description: { $arrayElemAt: ["$requirement_info.description", 0] },
                    test_case_count: 1,
                    test_types: 1,
                    priorities: 1,
                    statuses: 1,
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

        // Get uncovered requirements
        const coveredRequirementIds = new Set(coverageStats.map((stat: any) => stat.requirement_id));
        const allUsecases = await Usecase.find(usecaseQuery).lean();
        const uncoveredReqs = allUsecases
            .filter((req: any) => !coveredRequirementIds.has(String(req._id)))
            .map((req: any) => ({
                requirement_id: String(req._id),
                name: req.name,
                priority: req.priority,
                description: req.description
            })) || [];

        return {
            total_requirements: totalRequirements,
            covered_requirements: coveredRequirements,
            coverage_percentage: totalRequirements > 0 ? Math.round((coveredRequirements / totalRequirements) * 100) : 0,
            requirement_coverage: coverageStats,
            uncovered_requirements: uncoveredReqs,
            uncovered_requirements_count: uncoveredRequirements,
            coverage_quality: {
                excellent: coverageStats.filter((s: any) => s.coverage_score === "excellent").length,
                good: coverageStats.filter((s: any) => s.coverage_score === "good").length,
                insufficient: coverageStats.filter((s: any) => s.coverage_score === "insufficient").length
            }
        };
    }

    /**
     * Create a custom sheet with selected fields
     */
    private async createCustomSheet(
        workbook: ExcelJS.Workbook,
        sheetName: string,
        testCases: any[],
        fields: string[]
    ): Promise<void> {
        // Field mapping
        const fieldMap: { [key: string]: { header: string; width: number; getValue: (tc: any) => any } } = {
            'test_case_id': {
                header: 'Test Case ID',
                width: 15,
                getValue: (tc) => String(tc._id || '')
            },
            'test_case_name': {
                header: 'Test Case Name/Title',
                width: 40,
                getValue: (tc) => tc.title || ''
            },
            'description': {
                header: 'Description',
                width: 50,
                getValue: (tc) => tc.description || ''
            },
            'module_feature': {
                header: 'Module/Feature',
                width: 30,
                getValue: (tc) => {
                    // Get usecase names from requirement IDs
                    if (tc.source_requirement_ids && tc.source_requirement_ids.length > 0) {
                        return tc.source_requirement_ids.join(', ');
                    }
                    return '';
                }
            },
            'test_priority': {
                header: 'Test Priority',
                width: 15,
                getValue: (tc) => this.formatEnumValue(tc.priority) || ''
            },
            'preconditions': {
                header: 'Preconditions',
                width: 40,
                getValue: (tc) => {
                    if (Array.isArray(tc.preconditions)) {
                        return tc.preconditions.join('; ');
                    }
                    return '';
                }
            },
            'test_data': {
                header: 'Test Data',
                width: 50,
                getValue: (tc) => {
                    if (Array.isArray(tc.test_data) && tc.test_data.length > 0) {
                        return tc.test_data.map((td: any) => {
                            const name = td.name || 'Unnamed';
                            const input = JSON.stringify(td.input_payload || {});
                            return `${name}: ${input}`;
                        }).join(' | ');
                    }
                    return '';
                }
            },
            'test_steps': {
                header: 'Test Steps',
                width: 60,
                getValue: (tc) => {
                    if (Array.isArray(tc.steps) && tc.steps.length > 0) {
                        return tc.steps.map((step: any, index: number) => {
                            const stepNum = step.step_number || (index + 1);
                            const action = step.action || '';
                            // Format: "1. Action text." (with period at end if not present)
                            let formattedAction = action.trim();
                            if (formattedAction && !formattedAction.endsWith('.') && !formattedAction.endsWith('!') && !formattedAction.endsWith('?')) {
                                formattedAction += '.';
                            }
                            return `${stepNum}. ${formattedAction}`;
                        }).join('\n');
                    }
                    return '';
                }
            },
            'expected_result': {
                header: 'Expected Result',
                width: 50,
                getValue: (tc) => {
                    if (tc.expected_results) {
                        const results: string[] = [];
                        if (Array.isArray(tc.expected_results.ui_level)) {
                            results.push(`UI: ${tc.expected_results.ui_level.join('; ')}`);
                        }
                        if (tc.expected_results.api_level?.status_code) {
                            results.push(`API Status: ${tc.expected_results.api_level.status_code}`);
                        }
                        if (Array.isArray(tc.expected_results.database_level)) {
                            results.push(`DB: ${tc.expected_results.database_level.join('; ')}`);
                        }
                        if (tc.expected_results.business_level) {
                            results.push(`Business: ${tc.expected_results.business_level}`);
                        }
                        return results.join(' | ');
                    }
                    return '';
                }
            },
            'actual_result': {
                header: 'Actual Result',
                width: 50,
                getValue: (tc) => {
                    if (tc.execution_logs && Array.isArray(tc.execution_logs) && tc.execution_logs.length > 0) {
                        const latestLog = tc.execution_logs[tc.execution_logs.length - 1];
                        if (latestLog.actual_result) {
                            return latestLog.actual_result;
                        }
                        if (latestLog.result) {
                            return JSON.stringify(latestLog.result);
                        }
                    }
                    return '';
                }
            },
            'status': {
                header: 'Status',
                width: 15,
                getValue: (tc) => this.formatEnumValue(tc.status) || ''
            }
        };

        // Build columns based on selected fields
        const columns = fields
            .filter(field => fieldMap[field])
            .map(field => ({
                header: fieldMap[field].header,
                key: field,
                width: fieldMap[field].width
            }));

        if (columns.length === 0) {
            console.warn('No valid fields selected, using default fields');
            columns.push(
                { header: 'Test Case ID', key: 'test_case_id', width: 15 },
                { header: 'Test Case Name/Title', key: 'test_case_name', width: 40 }
            );
        }

        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = columns;

        // Apply header style
        this.applyHeaderStyle(sheet, '4472C4');

        // Add rows
        testCases.forEach((testCase, index) => {
            const rowData: any = {};
            fields.forEach(field => {
                if (fieldMap[field]) {
                    rowData[field] = fieldMap[field].getValue(testCase);
                }
            });
            const row = sheet.addRow(rowData);

            // Enable text wrapping for test_steps column if present
            if (fields.includes('test_steps')) {
                const stepsCell = row.getCell('test_steps');
                stepsCell.alignment = { 
                    vertical: 'top', 
                    wrapText: true 
                };
            }

            // Apply status and priority styling if status field is present
            if (fields.includes('status')) {
                this.applyStatusStyle(row.getCell('status'), testCase.status);
            }
            if (fields.includes('test_priority')) {
                this.applyPriorityStyle(row.getCell('test_priority'), testCase.priority);
            }

            // Alternate row coloring
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'F8F9FA' }
                };
            }
        });

        // Auto-filter
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: sheet.rowCount, column: sheet.columnCount }
        };
    }

    /**
     * Create Status Summary Sheet
     */
    private async createStatusSummarySheet(
        workbook: ExcelJS.Workbook,
        testCases: any[]
    ): Promise<void> {
        const sheet = workbook.addWorksheet('Status Summary');

        // Calculate statistics
        const statusCounts: { [key: string]: number } = {};
        testCases.forEach((tc) => {
            const status = tc.status || 'not_executed';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        // Define columns
        sheet.columns = [
            { header: 'Status', key: 'status', width: 20 },
            { header: 'Task(số lượng fail/pass)', key: 'count', width: 30 }
        ];

        // Apply header style
        this.applyHeaderStyle(sheet, '4472C4');

        // Add rows for each status (prioritize pass and fail)
        const statusOrder = ['passed', 'failed', 'blocked', 'in_progress', 'not_executed'];
        statusOrder.forEach((status) => {
            if (statusCounts[status]) {
                const row = sheet.addRow({
                    status: this.formatEnumValue(status),
                    count: statusCounts[status]
                });

                // Apply status color
                if (status === 'passed') {
                    row.getCell('status').fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'D1FAE5' }
                    };
                } else if (status === 'failed') {
                    row.getCell('status').fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FEE2E2' }
                    };
                }
            }
        });
    }

}

export default TestcaseExportService;