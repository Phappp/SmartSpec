// src/api/version.js
import axiosClient from "@/utils/axiosClient";

// ==================== VERSION API ====================
export const getVersionsByProject = (projectId) =>
    axiosClient.get(`/api/versions/project/${projectId}`);

export const setCurrentVersion = (projectId, versionId) =>
    axiosClient.patch(`/api/versions/projects/${projectId}/current-version/${versionId}`);

export const deleteVersion = (versionId) =>
    axiosClient.delete(`/api/versions/${versionId}`);

export const bumpVersion = (versionId, changeType = "minor") =>
    axiosClient.post(`/api/versions/${versionId}/bump`, null, {
        params: { changeType }
    });

// ==================== PREVIEW API ====================
export const getPreview = (versionId) =>
    axiosClient.get(`/api/versions/${versionId}/preview`);

export const createOrUpdatePreview = (versionId, change) =>
    axiosClient.post(`/api/versions/${versionId}`, { change });

export const approvePreview = (versionId, changeType = "minor", comment = "") =>
    axiosClient.post(`/api/versions/${versionId}/approve`, {
        changeType,
        comment
    });

// ==================== CHANGE MANAGEMENT API ====================
export const revertChange = (versionId, changeId) =>
    axiosClient.post(`/api/versions/${versionId}/changeId/${changeId}/revert`);

// ==================== VERSION FLAGS API ====================
export const markEditing = (versionId) =>
    axiosClient.patch(`/api/versions/${versionId}/editing`);

export const markLocked = (versionId) =>
    axiosClient.patch(`/api/versions/${versionId}/locked`);

// ==================== BULK OPERATIONS API ====================
export const bulkDeleteVersions = (versionIds) =>
    axiosClient.post(`/api/versions/bulk/delete`, {
        versionIds
    });

export const bulkExportVersions = (versionIds) =>
    axiosClient.post(`/api/versions/bulk/export`, {
        versionIds
    }, {
        responseType: 'blob'
    });

// ==================== VERSION COMPARISON API ====================
export const compareVersions = (versionId1, versionId2) =>
    axiosClient.get(`/api/versions/compare`, {
        params: { version1: versionId1, version2: versionId2 }
    });

// ==================== VERSION STATISTICS API ====================
export const getVersionStats = (projectId) =>
    axiosClient.get(`/api/versions/project/${projectId}/stats`);

export const getVersionTimeline = (projectId) =>
    axiosClient.get(`/api/versions/project/${projectId}/timeline`);