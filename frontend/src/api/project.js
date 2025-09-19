import axiosClient from "./../utils/axiosClient";

// Projects
export const getMyProjects = () => axiosClient.get(`/project/myproject`);
export const getSharedProjects = () => axiosClient.get(`/project/shared`);
export const getRecentProjects = () => axiosClient.get(`/project/recent`);

export const createProject = (data) => axiosClient.post(`/project`, data);
export const updateProject = (id, data) => axiosClient.put(`/project/${id}`, data);
export const deleteProject = (id) => axiosClient.delete(`/project/${id}`);
export const restoreProject = (id) => axiosClient.post(`/project/${id}/restore`);

export const getProject = (id) => axiosClient.get(`/project/${id}`);

// Attachments
export const uploadAttachments = (projectId, formData) =>
  axiosClient.post(`/project/${projectId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// User
export function getCurrentUser() {
  return axiosClient.get("/auth/me"); // confirm endpoint này đúng chưa
}

// Documentation generation
export const generateDocumentation = (projectId, payload = {}) =>
  axiosClient.post(`/project/${projectId}/generate`, payload);

export default {
  getMyProjects,
  getSharedProjects,
  getRecentProjects,
  createProject,
  updateProject,
  deleteProject,
  restoreProject,
  getProject,
  uploadAttachments,
  generateDocumentation,
  getCurrentUser,
};
