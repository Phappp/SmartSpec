// src/api/versions.js
import axiosClient from "@/utils/axiosClient";

// ==================== VERSION MANAGEMENT API ====================
export const getVersionsByProject = (projectId) =>
    axiosClient.get(`/api/versions/project/${projectId}`);

export const setCurrentVersion = (projectId, versionId) =>
    axiosClient.patch(`/api/versions/projects/${projectId}/current-version/${versionId}`);

export const deleteVersion = (versionId) =>
    axiosClient.delete(`/api/versions/${versionId}`);

// ==================== PREVIEW & APPROVAL API ====================
export const createOrUpdatePreview = (versionId, change) =>
    axiosClient.post(`/api/versions/${versionId}/preview`, { change });

export const getPreview = (versionId) =>
    axiosClient.get(`/api/versions/${versionId}/preview`);

export const approveVersion = (versionId, changeType = "minor", comment = "") =>
    axiosClient.post(`/api/versions/${versionId}/approve`, {
        changeType,
        comment
    });

export const rollbackVersion = (versionId) =>
    axiosClient.post(`/api/versions/${versionId}/rollback`);

// ==================== VERSION ACTIONS API ====================
export const bumpVersion = (versionId, changeType = "minor") =>
    axiosClient.post(`/api/versions/${versionId}/bump`, { changeType });

export const revertChange = (versionId, changeId) =>
    axiosClient.post(`/api/versions/${versionId}/change/${changeId}/revert`);

// ==================== VERSION FLAGS API ====================
export const markEditing = (versionId) =>
    axiosClient.patch(`/api/versions/${versionId}/editing`);

export const markLocked = (versionId) =>
    axiosClient.patch(`/api/versions/${versionId}/locked`);

// ==================== CÁC API CHƯA CÓ TRONG ROUTE BE - CẦN IMPLEMENT THÊM ====================

// ❌ CÁC API SAU ĐÂY CHƯA CÓ TRONG ROUTE BE - CẦN ĐƯỢC IMPLEMENT TRƯỚC KHI SỬ DỤNG:

// export const bulkDeleteVersions = (versionIds) =>
//     axiosClient.post(`/api/versions/bulk/delete`, {
//         versionIds
//     });

// export const bulkExportVersions = (versionIds, format = "json") =>
//     axiosClient.post(`/api/versions/bulk/export`, {
//         versionIds,
//         format
//     }, {
//         responseType: 'blob'
//     });

// export const compareVersions = (versionId1, versionId2) =>
//     axiosClient.get(`/api/versions/compare`, {
//         params: { version1: versionId1, version2: versionId2 }
//     });

// export const getVersionDiff = (versionId, changeId) =>
//     axiosClient.get(`/api/versions/${versionId}/changes/${changeId}/diff`);

// export const getVersionStats = (projectId) =>
//     axiosClient.get(`/api/versions/project/${projectId}/stats`);

// export const getVersionTimeline = (projectId) =>
//     axiosClient.get(`/api/versions/project/${projectId}/timeline`);