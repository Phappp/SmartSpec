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
  retryProjectAnalysis
};
