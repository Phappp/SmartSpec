// src/api/user.js
import axiosClient from "@/utils/axiosClient";

// ==================== USER LOGS ====================
export const getUserActivityLogs = (params = {}) =>
    axiosClient.get(`/api/logs/user-activity`, { params });

export const getProjectLogs = (projectId, params = {}) =>
    axiosClient.get(`/api/logs/project`, {
        params: { project_id: projectId, ...params }
    });

export const getOutputLogs = (targetType, projectId = null) =>
    axiosClient.get(`/api/logs/output`, {
        params: { target_type: targetType, project_id: projectId }
    });

// ==================== USER DASHBOARD ====================
export const getUserDashboardStats = (projectId = null) => {
    const params = projectId ? { project_id: projectId } : {};
    return axiosClient.get(`/api/logs/user-activity`, {
        params: { ...params, limit: 100 } // Lấy nhiều logs để tính stats
    });
};