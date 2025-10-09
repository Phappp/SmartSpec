// 🔥 CẬP NHẬT project.js HOÀN CHỈNH
import axiosClient from "./../utils/axiosClient";

// Projects
export const getMyProjects = () => axiosClient.get(`/api/projects/myproject`);
export const getSharedProjects = () => axiosClient.get(`/api/projects/shared`);
export const getRecentProjects = () => axiosClient.get(`/api/projects/recent`);
export const getTrashedProjects = () => axiosClient.get(`/api/projects/trashed`);
export const getProjectDetail = (id) => axiosClient.get(`/api/projects/${id}`);

export const createProject = (data) => axiosClient.post(`/api/projects`, data);
export const updateProject = (id, data) => axiosClient.put(`/api/projects/${id}`, data);
export const deleteProject = (id) => axiosClient.delete(`/api/projects/${id}`);
export const restoreProject = (id) => axiosClient.post(`/api/projects/${id}/restore`);
export const retryProjectAnalysis = (projectId, versionId) => {
  return axiosClient.post(`/api/orchestrate/projects/${projectId}/versions/${versionId}/retry`, {
    mode: 'full'
  });
};

//Usecase
export const usecaseApi = {
  // GET /versions/:versionId/usecases
  getUsecases: (versionId) => axiosClient.get(`/api/usecaseManagement/versions/${versionId}/usecases`),

  // POST /versions/:versionId/usecases
  createUsecase: (versionId, data) => axiosClient.post(`/api/usecaseManagement/versions/${versionId}/usecases`, data),

  // PUT /versions/:versionId/usecases/:usecaseId
  updateUsecase: (versionId, usecaseId, data) =>
    axiosClient.put(`/api/usecaseManagement/versions/${versionId}/usecases/${usecaseId}`, data),

  // DELETE /versions/:versionId/usecases/:usecaseId
  deleteUsecase: (versionId, usecaseId) =>
    axiosClient.delete(`/api/usecaseManagement/versions/${versionId}/usecases/${usecaseId}`)
};

// DATABASE
// 🔥 THÊM API MỚI ĐỂ SINH DATABASE
export const generateDatabaseSchema = (versionId) => {
  return axiosClient.post(`/api/databases/versions/${versionId}/generate-database`);
};

export const getDatabasesByVersion = (versionId) => {
  return axiosClient.get(`/api/databases?versionId=${versionId}`);
};

export const getDatabaseById = (databaseId) => {
  return axiosClient.get(`/api/databases/${databaseId}`);
};

// 🔥 THÊM API MỚI CHO REFERENCES
export const getDatabaseWithReferences = (databaseId) => {
  return axiosClient.get(`/api/databases/${databaseId}/with-references`);
};

export const getTableRelationships = (databaseId, tableName) => {
  return axiosClient.get(`/api/databases/${databaseId}/tables/${tableName}/relationships`);
};

export const validateForeignKey = (databaseId, data) => {
  return axiosClient.post(`/api/databases/${databaseId}/validate-foreign-key`, data);
};

export const getAvailableTablesForReferences = (databaseId, excludeTable = null) => {
  const params = excludeTable ? { excludeTable } : {};
  return axiosClient.get(`/api/databases/${databaseId}/available-tables`, { params });
};

export const updateDatabase = (databaseId, data) => {
  return axiosClient.put(`/api/databases/${databaseId}`, data);
};

export const deleteDatabase = (databaseId) => {
  return axiosClient.delete(`/api/databases/${databaseId}`);
};

// --- CRUD cho từng Bảng (trong một Schema) ---
export const addTableToDatabase = (databaseId, tableData) => {
  return axiosClient.post(`/api/databases/${databaseId}/tables`, tableData);
};

export const updateTableInDatabase = (databaseId, tableName, tableData) => {
  return axiosClient.put(`/api/databases/${databaseId}/tables/${tableName}`, tableData);
};

export const deleteTableFromDatabase = (databaseId, tableName) => {
  return axiosClient.delete(`/api/databases/${databaseId}/tables/${tableName}`);
};

// 🔥 THÊM API CHO CẬP NHẬT POSITION CÁC BẢNG
export const updateTablePosition = (databaseId, tableName, position) => {
  return axiosClient.put(`/api/databases/${databaseId}/tables/${tableName}/position`, {
    position
  });
};

export const updateMultipleTablePositions = (databaseId, positionUpdates) => {
  // Gửi trực tiếp mảng positionUpdates làm body, không gói trong object
  return axiosClient.put(`/api/databases/${databaseId}/tables/positions`, positionUpdates);
};

// 🔥 THÊM API CHO BỎ QUA CONFLICT
export const skipConflict = (versionId, conflictId) => {
  return axiosClient.delete(`/api/usecaseManagement/versions/${versionId}/conflicts/${conflictId}`);
};

// 🔥 THÊM API MỚI CHO INCREMENTAL ANALYSIS
export const startIncrementalAnalysis = (projectId, versionId) => {
  return axiosClient.post(`/api/orchestrate/projects/${projectId}/versions/${versionId}/process`, {
    mode: 'incremental'
  });
};

// 🔥 THÊM API CHO CONFLICT RESOLUTION
export function findProjectConflicts(projectId, versionId) {
  return axiosClient.post(`/api/orchestrate/projects/${projectId}/versions/${versionId}/find-conflicts`);
}

export function resolveProjectConflict(projectId, versionId, data) {
  return axiosClient.post(`/api/orchestrate/projects/${projectId}/versions/${versionId}/resolve-conflict`, data);
}

// Versions
export const addInputsToVersion = (versionId, data) => axiosClient.post(`/api/projects/versions/${versionId}/inputs`, data);
export const deleteUnprocessedInputs = (versionId) => axiosClient.delete(`/api/projects/versions/${versionId}/inputs/unprocessed-inputs`);
export const deleteSpecificInput = (versionId, inputId) => axiosClient.delete(`/api/projects/versions/${versionId}/inputs/${inputId}`);
export const getVersionStatus = (versionId) => axiosClient.get(`/api/projects/versions/${versionId}/status`);

// Attachments
export const uploadAttachments = (projectId, formData) =>
  axiosClient.post(`/api/projects/${projectId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// User
export function getCurrentUser() {
  return axiosClient.get("/api/auth/me");
}

// Documentation generation
export const generateDocumentation = (projectId, payload = {}) =>
  axiosClient.post(`/api/projects/${projectId}/generate`, payload);

export default {
  getMyProjects,
  getSharedProjects,
  getRecentProjects,
  getTrashedProjects,
  createProject,
  updateProject,
  deleteProject,
  restoreProject,
  uploadAttachments,
  generateDocumentation,
  getCurrentUser,
  getVersionStatus,
  getProjectDetail,
  retryProjectAnalysis,
  startIncrementalAnalysis,
  skipConflict,
  generateDatabaseSchema,
  getDatabaseWithReferences,
  getTableRelationships,
  validateForeignKey,
  getAvailableTablesForReferences,
  getDatabaseById,
  updateDatabase,
  deleteDatabase,
  addTableToDatabase,
  updateTableInDatabase,
  deleteTableFromDatabase,
  findProjectConflicts,
  resolveProjectConflict,
  updateTablePosition,
  updateMultipleTablePositions,

};