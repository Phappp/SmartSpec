// 🔥 SỬA HOÀN TOÀN project.js - FIXED INVITATION APIS
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

// ========== SHARE - COMPLETELY FIXED APIS ====================
export const getProjectInvites = (projectId) => {
  return axiosClient.get(`/api/projects/${projectId}/members/invites`);
};

export const cancelInvite = (projectId, memberId) => {
  return axiosClient.delete(`/api/projects/${projectId}/members/${memberId}/cancel`);
};

// 🔥 FIXED: Sửa hoàn toàn cách gọi API accept và reject
export const acceptInvite = (projectId, memberId, token = null) => {
  // Gửi token trong request body
  const data = token ? { token } : {};
  return axiosClient.post(`/api/projects/${projectId}/members/${memberId}/accept`, data);
};

export const rejectInvite = (projectId, memberId, token = null) => {
  // Gửi token trong request body  
  const data = token ? { token } : {};
  return axiosClient.post(`/api/projects/${projectId}/members/${memberId}/reject`, data);
};

export const removeMember = (projectId, memberId) => {
  return axiosClient.delete(`/api/projects/${projectId}/members/${memberId}`);
};

export const leaveProject = (projectId) => {
  return axiosClient.post(`/api/projects/${projectId}/leave`);
};

export const inviteMember = (projectId, email, role) => {
  return axiosClient.post(`/api/projects/${projectId}/members/invite`, {
    email,
    role
  });
};

// ================== USECASE MANAGEMENT ============================
export const usecaseApi = {
  getUsecases: (versionId) => axiosClient.get(`/api/usecaseManagement/versions/${versionId}/usecases`),
  createUsecase: (versionId, data) => axiosClient.post(`/api/usecaseManagement/versions/${versionId}/usecases`, data),
  updateUsecase: (versionId, usecaseId, data) =>
    axiosClient.put(`/api/usecaseManagement/versions/${versionId}/usecases/${usecaseId}`, data),
  deleteUsecase: (versionId, usecaseId) =>
    axiosClient.delete(`/api/usecaseManagement/versions/${versionId}/usecases/${usecaseId}`)
};

// DATABASE
export const generateDatabaseSchema = (versionId) => {
  return axiosClient.post(`/api/databases/versions/${versionId}/generate-database`);
};

export const getDatabasesByVersion = (versionId) => {
  return axiosClient.get(`/api/databases?versionId=${versionId}`);
};

export const getDatabaseById = (databaseId) => {
  return axiosClient.get(`/api/databases/${databaseId}`);
};

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

// --- CRUD cho từng Bảng ---
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
  return axiosClient.put(`/api/databases/${databaseId}/tables/positions`, positionUpdates);
};

// === 🔥 COMPOSITE KEY MANAGEMENT APIs ===
export const getCompositeKeyInfo = (databaseId, tableName) => {
  return axiosClient.get(`/api/databases/${databaseId}/tables/${tableName}/composite-key`);
};

export const createCompositeKey = (databaseId, tableName, columnNames) => {
  return axiosClient.post(`/api/databases/${databaseId}/tables/${tableName}/composite-key`, {
    columnNames
  });
};

export const convertToSingleKey = (databaseId, tableName, primaryKeyColumnName) => {
  return axiosClient.post(`/api/databases/${databaseId}/tables/${tableName}/convert-to-single-key`, {
    primaryKeyColumnName
  });
};

// === 🔥 UTILITY APIs ===
export const getDatabaseStats = (databaseId) => {
  return axiosClient.get(`/api/databases/${databaseId}/stats`);
};

export const exportDatabaseSQL = (databaseId) => {
  return axiosClient.get(`/api/databases/${databaseId}/export-sql`);
};

export const validateTableStructure = (databaseId, tableData) => {
  return axiosClient.post(`/api/databases/${databaseId}/validate-table`, tableData);
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
export const addInputsToVersion = (versionId, data) => axiosClient.post(`/api/input/versions/${versionId}/inputs`, data);
export const deleteSpecificInput = (versionId, inputId) => axiosClient.delete(`/api/input/versions/${versionId}/inputs/${inputId}`);
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

// Invitations
export const getMyInvitations = () => {
  return axiosClient.get('/api/users/me/invites');
}

// 🔥 THÊM DEBUG FUNCTION ĐỂ KIỂM TRA API CALLS
export const debugInvitationAPI = async (action, projectId, memberId, token = null) => {
  console.log(`🔍 DEBUG ${action}:`, {
    projectId,
    memberId,
    token,
    endpoint: `/api/projects/${projectId}/members/${memberId}/${action}`
  });

  try {
    const data = token ? { token } : {};
    const response = await axiosClient.post(`/api/projects/${projectId}/members/${memberId}/${action}`, data);
    console.log(`✅ ${action} SUCCESS:`, response.data);
    return response;
  } catch (error) {
    console.error(`❌ ${action} ERROR:`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

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

  // 🔥 COMPOSITE KEY APIs
  getCompositeKeyInfo,
  createCompositeKey,
  convertToSingleKey,

  // 🔥 UTILITY APIs
  getDatabaseStats,
  exportDatabaseSQL,
  validateTableStructure,

  // SHARE - COMPLETELY FIXED APIS
  getProjectInvites,
  cancelInvite,
  acceptInvite,
  rejectInvite,
  removeMember,
  leaveProject,
  inviteMember,
  getMyInvitations,

  // 🔥 DEBUG FUNCTION
  debugInvitationAPI
};