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

// 🔥 THÊM API MỚI CHO INCREMENTAL ANALYSIS
export const startIncrementalAnalysis = (projectId, versionId) => {
  return axiosClient.post(`/api/orchestrate/projects/${projectId}/versions/${versionId}/process`, {
    mode: 'incremental'
  });
};

// 🔥 THÊM API CHO CONFLICT RESOLUTION
// export const resolveConflict = (versionId, conflictId, resolution) => {
//   return axiosClient.post(`/api/projects/versions/${versionId}/conflicts/${conflictId}/resolve`, {
//     keep: resolution // 'old' or 'new'
//   });
// };

// HÀM MỚI: Kích hoạt việc tìm kiếm conflict
export function findProjectConflicts(projectId, versionId) {
  return axiosClient.post(`/api/orchestrate/projects/${projectId}/versions/${versionId}/find-conflicts`);
}

// HÀM MỚI: Gửi yêu cầu giải quyết một nhóm conflict
export function resolveProjectConflict(projectId, versionId, data) {
  // Đảm bảo URL đúng với định nghĩa route ở backend
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
  return axiosClient.get("/api/auth/me"); // confirm endpoint này đúng chưa
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
  // resolveConflict
};
