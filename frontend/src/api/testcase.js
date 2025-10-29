// 🔥 CẬP NHẬT testcase.js - THÊM ENTERPRISE APIS VÀ FIX MISSING FUNCTIONS

import axiosClient from "./../utils/axiosClient";

// ================== 🆕 ENTERPRISE TESTCASE GENERATION ============================

/**
 * 🆕 ENTERPRISE: Generate test cases từ selected requirement IDs
 */
export const generateTestCasesSimplified = (projectId, versionId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/versions/${versionId}/generate-testcases`, data);

/**
 * 🆕 ENTERPRISE: Enhance test cases với new requirement IDs  
 */
export const enhanceTestCasesSimplified = (projectId, versionId, data) =>
    axiosClient.put(`/api/testcases/projects/${projectId}/versions/${versionId}/enhance-testcases`, data);

// ================== 🆕 ENTERPRISE REPORTING & ANALYTICS ============================

/**
 * 🆕 ENTERPRISE: Lấy requirement coverage report
 */
export const getRequirementCoverageReport = (projectId, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/requirement-coverage`, { params });
};

/**
 * 🆕 ENTERPRISE: Tìm test cases trùng lặp
 */
export const findDuplicateTestCases = (projectId, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/duplicate-testcases`, { params });
};

/**
 * 🆕 ENTERPRISE: Validate Enterprise test case format
 */
export const validateEnterpriseTestCase = (testCaseData) =>
    axiosClient.post(`/api/testcases/validate-enterprise`, testCaseData);

/**
 * 🆕 ENTERPRISE: Analyze test case quality metrics
 */
export const analyzeTestCaseQuality = (projectId, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/quality-metrics`, { params });
};

// ================== CORE TESTCASE APIs ============================

/**
 * Generate test cases từ requirements
 */
export const generateTestCases = (projectId, versionId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/versions/${versionId}/generate-testcases`, data);

/**
 * Generate test cases từ database schema
 */
export const generateTestCasesFromDatabase = (projectId, versionId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/versions/${versionId}/generate-from-database`, data);

/**
 * Enhance existing test cases
 */
export const enhanceTestCases = (projectId, versionId, data) =>
    axiosClient.put(`/api/testcases/projects/${projectId}/versions/${versionId}/enhance-testcases`, data);

/**
 * Save test cases to database
 */
export const saveTestCases = (projectId, versionId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/versions/${versionId}/testcases`, data);

/**
 * Get test cases by project
 */
export const getTestCasesByProject = (projectId, params = {}) =>
    axiosClient.get(`/api/testcases/projects/${projectId}/testcases`, { params });

/**
 * Get test cases by database table
 */
export const getTestCasesByDatabaseTable = (projectId, tableName, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/tables/${tableName}/testcases`, { params });
};

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

/**
 * Bulk execute test cases
 */
export const bulkExecuteTestCases = (projectId, data) =>
    axiosClient.put(`/api/testcases/projects/${projectId}/testcases/bulk-execute`, data);

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

// ================== REQUIREMENTS MANAGEMENT ============================

/**
 * 🆕 Lấy requirements từ version (cho test case generation)
 */
export const getRequirementsForTestGeneration = (projectId, versionId) =>
    axiosClient.get(`/api/projects/${projectId}/versions/${versionId}/requirements`);

/**
 * 🆕 Lấy requirements với pagination và filtering
 */
export const getRequirements = (projectId, versionId, params = {}) =>
    axiosClient.get(`/api/projects/${projectId}/versions/${versionId}/requirements`, { params });

// ================== BATCH TESTCASE OPERATIONS ============================

/**
 * 🆕 Delete multiple test cases
 * @param {string} projectId - ID của project
 * @param {object} data - Dữ liệu delete
 * @param {array} data.testCaseIds - Danh sách test case IDs cần xóa
 */
export const bulkDeleteTestCases = (projectId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/bulk-delete`, data);

/**
 * 🆕 Update multiple test cases
 * @param {string} projectId - ID của project  
 * @param {object} data - Dữ liệu update
 * @param {array} data.testCaseIds - Danh sách test case IDs
 * @param {object} data.updateData - Dữ liệu cập nhật
 */
export const bulkUpdateTestCases = (projectId, data) =>
    axiosClient.put(`/api/testcases/projects/${projectId}/bulk-update`, data);

/**
 * 🆕 Change test case status in bulk
 * @param {string} projectId - ID của project
 * @param {object} data - Dữ liệu status change
 * @param {array} data.testCaseIds - Danh sách test case IDs
 * @param {string} data.status - Status mới
 */
export const bulkChangeStatus = (projectId, data) =>
    axiosClient.put(`/api/testcases/projects/${projectId}/bulk-change-status`, data);

// ================== TESTCASE TEMPLATES & CLONING ============================

/**
 * 🆕 Clone test case
 * @param {string} testCaseId - ID của test case gốc
 * @param {object} data - Dữ liệu clone
 * @param {string} data.newTitle - Tiêu đề mới (optional)
 * @param {string} data.targetVersionId - Version target (optional)
 */
export const cloneTestCase = (testCaseId, data = {}) =>
    axiosClient.post(`/api/testcases/testcases/${testCaseId}/clone`, data);

/**
 * 🆕 Create test case from template với database mapping
 * @param {string} projectId - ID của project
 * @param {string} versionId - ID của version
 * @param {object} data - Dữ liệu tạo test case
 * @param {string} data.templateId - ID của template
 * @param {array} data.databaseTables - Database tables mapping
 * @param {array} data.databaseOperations - Database operations
 * @param {object} data.customizations - Tùy chỉnh
 */
export const createTestCaseFromTemplateWithDB = (projectId, versionId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/versions/${versionId}/create-from-template-db`, data);

// ================== TEST DATA MANAGEMENT ============================

/**
 * 🆕 Generate test data từ database schema
 * @param {string} projectId - ID của project
 * @param {string} versionId - ID của version  
 * @param {object} data - Dữ liệu generate
 * @param {array} data.tables - Danh sách tables
 * @param {object} data.constraints - Constraints
 */
export const generateTestData = (projectId, versionId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/versions/${versionId}/generate-test-data`, data);

/**
 * 🆕 Validate test data với database schema
 * @param {string} projectId - ID của project
 * @param {object} testData - Test data cần validate
 * @param {array} testData.inputs - Input data
 * @param {array} testData.expectedOutputs - Expected outputs
 */
export const validateTestData = (projectId, testData) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/validate-test-data`, testData);

// ================== UTILITY & EXPORT/IMPORT ============================

/**
 * Export test cases
 */
export const exportTestCases = (projectId, format = 'json') =>
    axiosClient.get(`/api/testcases/projects/${projectId}/export`, {
        params: { format },
        responseType: 'blob'
    });

/**
 * Import test cases
 */
export const importTestCases = (projectId, versionId, formData) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/versions/${versionId}/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });

/**
 * Duplicate test cases
 */
export const duplicateTestCases = (projectId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/duplicate`, data);

/**
 * Get test case templates
 */
export const getTestcaseTemplates = (projectId) =>
    axiosClient.get(`/api/testcases/projects/${projectId}/templates`);

/**
 * Create test case from template
 */
export const createTestCaseFromTemplate = (projectId, versionId, data) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/versions/${versionId}/create-from-template`, data);

/**
 * Validate test case
 */
export const validateTestCase = (testCaseData) =>
    axiosClient.post(`/api/testcases/validate`, testCaseData);

/**
 * Search test cases
 */
export const searchTestCases = (projectId, query, filters = {}) =>
    axiosClient.get(`/api/testcases/projects/${projectId}/search`, {
        params: { query, ...filters }
    });

/**
 * Debug test case API
 */
export const debugTestcaseAPI = async (endpoint, data = {}) => {
    console.log(`🔍 DEBUG Testcase API:`, { endpoint, data });
    try {
        const response = await axiosClient.get(`/api/testcases/debug/${endpoint}`, { params: data });
        console.log(`✅ DEBUG Success:`, response.data);
        return response;
    } catch (error) {
        console.error(`❌ DEBUG Error:`, error.response?.data || error.message);
        throw error;
    }
};

// ================== 🆕 ENTERPRISE BATCH VALIDATION ============================

/**
 * 🆕 ENTERPRISE: Validate multiple test cases
 */
export const bulkValidateTestCases = (projectId, testCaseIds) =>
    axiosClient.post(`/api/testcases/projects/${projectId}/bulk-validate`, { testCaseIds });

/**
 * 🆕 ENTERPRISE: Fix test case format issues
 */
export const fixTestCaseFormat = (projectId, testCaseId, fixes) =>
    axiosClient.put(`/api/testcases/projects/${projectId}/testcases/${testCaseId}/fix-format`, fixes);

/**
 * 🆕 ENTERPRISE: Bulk fix test case formats
 */
export const bulkFixTestCaseFormats = (projectId, fixes) =>
    axiosClient.put(`/api/testcases/projects/${projectId}/bulk-fix-formats`, fixes);

// ================== 🆕 ENTERPRISE AUTOMATION INTEGRATION ============================

/**
 * 🆕 ENTERPRISE: Generate automation scripts
 */
export const generateAutomationScripts = (projectId, testCaseIds, framework = 'pytest') =>
    axiosClient.post(`/api/testcases/projects/${projectId}/generate-automation-scripts`, {
        testCaseIds,
        framework
    });

/**
 * 🆕 ENTERPRISE: Get automation readiness report
 */
export const getAutomationReadinessReport = (projectId, versionId = null) => {
    const params = versionId ? { versionId } : {};
    return axiosClient.get(`/api/testcases/projects/${projectId}/automation-readiness`, { params });
};

// 🔥 CẬP NHẬT testcaseApi object - THÊM ENTERPRISE FUNCTIONS
export const testcaseApi = {
    // 🆕 Enterprise Generation
    generateTestCasesSimplified,
    enhanceTestCasesSimplified,

    // 🆕 Enterprise Reporting & Analytics
    getRequirementCoverageReport,
    findDuplicateTestCases,
    validateEnterpriseTestCase,
    analyzeTestCaseQuality,

    // Requirements
    getRequirementsForTestGeneration,
    getRequirements,

    // Core Testcase APIs
    generateTestCases,
    generateTestCasesFromDatabase,
    enhanceTestCases,
    saveTestCases,
    getTestCasesByProject,
    getTestCasesByDatabaseTable,
    getTestCaseById,
    updateTestCase,
    executeTestCase,
    deleteTestCase,
    bulkExecuteTestCases,
    getTestStatistics,
    getDatabaseCoverageReport,

    // 🆕 Bulk Operations
    bulkDeleteTestCases,
    bulkUpdateTestCases,
    bulkChangeStatus,

    // 🆕 Templates & Cloning
    cloneTestCase,
    createTestCaseFromTemplateWithDB,

    // 🆕 Test Data Management
    generateTestData,
    validateTestData,

    // 🆕 Enterprise Batch Validation
    bulkValidateTestCases,
    fixTestCaseFormat,
    bulkFixTestCaseFormats,

    // 🆕 Enterprise Automation Integration
    generateAutomationScripts,
    getAutomationReadinessReport,

    // Utilities
    exportTestCases,
    importTestCases,
    duplicateTestCases,
    getTestcaseTemplates,
    createTestCaseFromTemplate,
    validateTestCase,
    searchTestCases,
    debugTestcaseAPI
};

// 🔥 EXPORT DEFAULT CHO COMPATIBILITY
export default testcaseApi;