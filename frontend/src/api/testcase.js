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

    // Utilities
    validateTestCaseData,
    extractDatabaseTablesCoverage,
    extractRequirementsCoverage
};

export default testcaseApi;