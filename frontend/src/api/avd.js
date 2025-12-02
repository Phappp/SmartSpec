// src/api/avd.js
import axiosClient from "@/utils/axiosClient";

// ==================== ACTIVITY DIAGRAM API ====================
export const getActivityDiagrams = (versionId) =>
    axiosClient.get(`/api/activity-diagrams/${versionId}`);

export const getActivityDiagramById = (activityDiagramId) =>
    axiosClient.get(`/api/activity-diagrams/${activityDiagramId}`);

export const generateFromUsecase = (versionId, requirementId, language = 'vi-VN') =>
    axiosClient.post(`/api/activity-diagrams/version/${versionId}/requirements/${requirementId}/generate`, null, {
        params: { language }
    });

export const generateFromActor = (versionId, actor, language = 'vi-VN') =>
    axiosClient.post(`/api/activity-diagrams/version/${versionId}/actors/${actor}/generate`, null, {
        params: { language }
    });

export const validateStructure = (activityDiagramId) =>
    axiosClient.post(`/api/activity-diagrams/${activityDiagramId}/validate`);

export const exportDiagram = (activityDiagramId) =>
    axiosClient.get(`/api/activity-diagrams/${activityDiagramId}/export`, {
        responseType: 'blob'
    });

// ==================== NODE & EDGE MANAGEMENT API ====================
export const addNode = (activityDiagramId, data) =>
    axiosClient.post(`/api/activity-diagrams/${activityDiagramId}/nodes`, data);

export const updateNode = (activityDiagramId, nodeId, data) =>
    axiosClient.put(`/api/activity-diagrams/${activityDiagramId}/nodes/${nodeId}`, data);

export const deleteNode = (activityDiagramId, nodeId) =>
    axiosClient.delete(`/api/activity-diagrams/${activityDiagramId}/nodes/${nodeId}`);

export const addEdge = (activityDiagramId, data) =>
    axiosClient.post(`/api/activity-diagrams/${activityDiagramId}/edges`, data);

export const updateEdge = (activityDiagramId, index, data) =>
    axiosClient.put(`/api/activity-diagrams/${activityDiagramId}/edges/${index}`, data);

export const deleteEdge = (activityDiagramId, index) =>
    axiosClient.delete(`/api/activity-diagrams/${activityDiagramId}/edges/${index}`);

export const updateSvg = (activityDiagramId, svgData) =>
    axiosClient.patch(`/api/activity-diagrams/${activityDiagramId}/svg`, svgData);

// ==================== BULK OPERATIONS API ====================
export const bulkExportDiagrams = (diagramIds) =>
    axiosClient.post(`/api/activity-diagrams/bulk/export`, {
        diagramIds
    }, {
        responseType: 'blob'
    });

export const bulkDeleteDiagrams = (diagramIds) =>
    axiosClient.post(`/api/activity-diagrams/bulk/delete`, {
        diagramIds
    });

export const deleteActivityDiagram = (activityDiagramId) =>
    axiosClient.delete(`/api/activity-diagrams/${activityDiagramId}`);

// ==================== POSITION ADJUSTMENT API ====================
export const updateNodePosition = (activityDiagramId, nodeId, position) =>
    axiosClient.patch(`/api/activity-diagrams/${activityDiagramId}/nodes/${nodeId}/position`, position);

export const updateMultipleNodePositions = (activityDiagramId, nodes) =>
    axiosClient.patch(`/api/activity-diagrams/${activityDiagramId}/nodes/positions`, { nodes });