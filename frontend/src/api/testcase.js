// testcase.js - Updated to match actual API endpoints
import axiosClient from "./../utils/axiosClient";

// ==================== TEST CASE GENERATION & SAVING ====================

/**
 * Generate test cases from selected requirements
 */
export const generateTestCases = (projectId, versionId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/versions/${versionId}/generate-testcases`, data);

/**
 * Save test cases to database
 */
export const saveTestCases = (projectId, versionId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/versions/${versionId}/testcases`, data);

// ==================== BASIC CRUD OPERATIONS ====================

/**
 * Get test cases by project with optional filters
 */
export const getTestCasesByProject = (projectId, params = {}) =>
    axiosClient.get(`/api/testcases/projects/${projectId}/testcases`, { params });

/**
 * Get test case by ID
 */
export const getTestCaseById = (testCaseId) =>
    axiosClient.get(`/api/testcases/testcases/${testCaseId}`);

/**
 * Update test case
 */
export const updateTestCase = (testCaseId, data) =>
    axiosClient.put(`/api/testcases/testcases/${testCaseId}`, data);

/**
 * Execute test case
 */
export const executeTestCase = (testCaseId, data) =>
    axiosClient.put(`/api/testcases/testcases/${testCaseId}/execute`, data);

/**
 * Delete test case
 */
export const deleteTestCase = (testCaseId) =>
    axiosClient.delete(`/api/testcases/testcases/${testCaseId}`);

// ==================== BULK OPERATIONS ====================

/**
 * Bulk execute test cases
 */
export const bulkExecuteTestCases = (projectId, data) =>
    axiosClient.put(`/api/testcases/projects/${projectId}/testcases/bulk-execute`, data);

/**
 * Bulk update test cases
 */
export const bulkUpdateTestCases = (projectId, data) =>
    axiosClient.put(`/api/testcases/projects/${projectId}/testcases/bulk-update`, data);

/**
 * Bulk delete test cases
 */
export const bulkDeleteTestCases = (projectId, data) =>
    axiosClient.delete(`/api/testcases/projects/${projectId}/testcases/bulk-delete`, { data });

// ==================== REPORTING & ANALYTICS ====================

/**
 * Get test statistics
 */
export const getTestStatistics = (projectId, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/test-statistics`, { params });
};

/**
 * Get database coverage report
 */
export const getDatabaseCoverageReport = (projectId, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/database-coverage`, { params });
};

/**
 * Get requirement coverage report
 */
export const getRequirementCoverageReport = (projectId, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/requirement-coverage`, { params });
};

/**
 * Get test cases by database table
 */
export const getTestCasesByDatabaseTable = (projectId, tableName, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/tables/${tableName}/testcases`, { params });
};

/**
 * Find duplicate test cases
 */
export const findDuplicateTestCases = (projectId, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/duplicate-testcases`, { params });
};

/**
 * Get dashboard metrics
 */
export const getDashboardMetrics = (projectId, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/testcase-metrics`, { params });
};

// ==================== IMPORT/EXPORT ====================

/**
 * Export test cases
 */
export const exportTestCases = (projectId, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/export-testcases`, { params });
};

/**
 * Import test cases
 */
export const importTestCases = (projectId, versionId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/versions/${versionId}/import-testcases`, data);

// ==================== VALIDATION & UTILITIES ====================

/**
 * Validate test case data before saving
 */
export const validateTestCaseData = (testCaseData) => {
    const errors = [];

    if (!testCaseData.title || typeof testCaseData.title !== 'string') {
        errors.push('Title is required and must be a string');
    }

    if (!testCaseData.steps || !Array.isArray(testCaseData.steps) || testCaseData.steps.length === 0) {
        errors.push('Steps are required and must have at least 1 step');
    }

    if (testCaseData.steps) {
        testCaseData.steps.forEach((step, index) => {
            if (!step.step_number || !step.action) {
                errors.push(`Step ${index + 1}: step_number and action are required`);
            }
        });
    }

    return errors;
};

/**
 * Extract database tables from test cases
 */
export const extractDatabaseTablesCoverage = (testCases) => {
    const tables = new Set();
    testCases.forEach(tc => {
        if (tc.database_tables && Array.isArray(tc.database_tables)) {
            tc.database_tables.forEach(table => tables.add(table));
        }
    });
    return Array.from(tables);
};

/**
 * Extract requirements coverage from test cases
 */
export const extractRequirementsCoverage = (testCases) => {
    const requirements = new Set();
    testCases.forEach(tc => {
        if (tc.source_requirement_ids && Array.isArray(tc.source_requirement_ids)) {
            tc.source_requirement_ids.forEach(reqId => requirements.add(reqId));
        }
    });
    return Array.from(requirements);
};

/**
 * Export test cases to Excel with filters
 */
export const exportTestCasesToExcel = (projectId, params = {}) => {
    return axiosClient.get(`/api/testcases/projects/${projectId}/export-excel`, {
        params,
        responseType: 'blob' // QUAN TRỌNG: để nhận file binary
    });
};


// ==================== FILE DOWNLOAD UTILITIES ====================

/**
 * Download Excel file from blob response
 */
export const downloadExcelFile = (blobData, filename) => {
    // Tạo URL từ blob data
    const url = window.URL.createObjectURL(new Blob([blobData]));

    // Tạo link element
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.remove();
    window.URL.revokeObjectURL(url);
};

/**
 * Handle Excel export with automatic download
 */
export const handleExcelExport = async (exportFunction, projectId, params = {}, customFilename = null) => {
    try {
        const response = await exportFunction(projectId, params);

        // Tạo filename mặc định nếu không có custom
        const filename = customFilename || `export-${projectId}-${Date.now()}.xlsx`;

        // Download file
        downloadExcelFile(response.data, filename);

        return { success: true, filename };
    } catch (error) {
        console.error('Excel export error:', error);
        throw error;
    }
};

// ==================== EXPORT FILTER UTILITIES ====================

/**
 * Build export filters for Excel export
 */
export const buildExportFilters = (filters = {}) => {
    const {
        test_type,
        status,
        priority,
        database_tables,
        source_requirement_ids,
        startDate,
        endDate,
        versionId
    } = filters;

    const params = {};

    if (test_type) params.test_type = test_type;
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (versionId) params.versionId = versionId;

    // Array parameters
    if (database_tables && Array.isArray(database_tables)) {
        params.database_tables = database_tables.join(',');
    }

    if (source_requirement_ids && Array.isArray(source_requirement_ids)) {
        params.source_requirement_ids = source_requirement_ids.join(',');
    }

    // Date range
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return params;
};

/**
 * Quick export functions for common scenarios
 */
export const quickExports = {
    // Export all test cases
    allTestCases: (projectId, versionId = null) =>
        exportTestCasesToExcel(projectId, { versionId }),

    // Export only failed test cases
    failedTestCases: (projectId, versionId = null) =>
        exportTestCasesToExcel(projectId, { versionId, status: 'failed' }),

    // Export only automated test cases
    automatedTestCases: (projectId, versionId = null) =>
        exportTestCasesToExcel(projectId, { versionId, test_type: 'api' }),
};

// ==================== API OBJECT ====================

export const testcaseApi = {
    // Generation & Saving
    generateTestCases,
    saveTestCases,

    // Basic CRUD
    getTestCasesByProject,
    getTestCaseById,
    updateTestCase,
    executeTestCase,
    deleteTestCase,

    // Bulk Operations
    bulkExecuteTestCases,
    bulkUpdateTestCases,
    bulkDeleteTestCases,

    // Reporting & Analytics
    getTestStatistics,
    getDatabaseCoverageReport,
    getRequirementCoverageReport,
    getTestCasesByDatabaseTable,
    findDuplicateTestCases,
    getDashboardMetrics,

    // Import/Export
    exportTestCases,
    importTestCases,

    // ====== NEW EXPORT EXCEL APIs ======
    exportTestCasesToExcel,

    // Export Utilities
    downloadExcelFile,
    handleExcelExport,
    buildExportFilters,
    quickExports,

    // Utilities
    validateTestCaseData,
    extractDatabaseTablesCoverage,
    extractRequirementsCoverage
};


export default testcaseApi;