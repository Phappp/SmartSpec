// src/api/sqd.js
import axiosClient from "@/utils/axiosClient";

// ==================== SEQUENCE DIAGRAM API ====================
// ==================== SEQUENCE DIAGRAM API ====================
export const getSequenceDiagrams = (versionId) =>
    axiosClient.get(`/api/sequence-diagram/versions/${versionId}/sequence-diagrams`); // Đổi endpoint

export const getSequenceDiagramById = (ucId) =>
    axiosClient.get(`/api/sequence-diagram/sequence-diagrams/${ucId}`); // Đổi endpoint

// Giữ nguyên generate
export const generateSequenceDiagram = (versionId, usecaseId, language) =>
    axiosClient.post(`/api/sequence-diagram/versions/${versionId}/generate-sequence-diagram`, {
        usecaseId,
        language
    });

// ==================== LIFELINE MANAGEMENT API ====================
export const updateLifeline = (sqdId, lifelineId, data) =>
    axiosClient.patch(`/api/sequence-diagram/${sqdId}/lifelines/${lifelineId}`, data);

export const deleteLifeline = (sqdId, lifelineId) =>
    axiosClient.delete(`/api/sequence-diagram/${sqdId}/lifelines/${lifelineId}`);

// ==================== MESSAGE MANAGEMENT API ====================
export const createMessage = (sqdId, data) =>
    axiosClient.post(`/api/sequence-diagram/${sqdId}/messages`, data);

export const updateMessage = (sqdId, messageId, data) =>
    axiosClient.patch(`/api/sequence-diagram/${sqdId}/messages/${messageId}`, data);

export const deleteMessage = (sqdId, messageId) =>
    axiosClient.delete(`/api/sequence-diagram/${sqdId}/messages/${messageId}`);

// ==================== FRAGMENT MANAGEMENT API ====================
export const createFragment = (sqdId, data) =>
    axiosClient.post(`/api/sequence-diagram/${sqdId}/fragments`, data);

export const updateFragment = (sqdId, fragmentId, data) =>
    axiosClient.patch(`/api/sequence-diagram/${sqdId}/fragments/${fragmentId}`, data);

export const deleteFragment = (sqdId, fragmentId) =>
    axiosClient.delete(`/api/sequence-diagram/${sqdId}/fragments/${fragmentId}`);

// ==================== POSITION & LAYOUT API ====================
export const updateLifelinePosition = (sqdId, lifelineId, position) =>
    axiosClient.patch(`/api/sequence-diagram/${sqdId}/lifelines/${lifelineId}/position`, position);

export const updateMessageOrder = (sqdId, messageId, order) =>
    axiosClient.patch(`/api/sequence-diagram/${sqdId}/messages/${messageId}/order`, { order });

export const updateMultiplePositions = (sqdId, updates) =>
    axiosClient.patch(`/api/sequence-diagram/${sqdId}/positions`, updates);

export const resetPositions = (sqdId) =>
    axiosClient.patch(`/api/sequence-diagram/${sqdId}/reset-positions`);

// ==================== EXPORT & BULK OPERATIONS API ====================
export const exportDiagram = (sqdId, format) =>
    axiosClient.get(`/api/sequence-diagram/${sqdId}/export`, {
        params: { format },
        responseType: 'blob'
    });

export const duplicateDiagram = (sqdId) =>
    axiosClient.post(`/api/sequence-diagram/${sqdId}/duplicate`);

export const bulkExportDiagrams = (diagramIds) =>
    axiosClient.post(`/api/sequence-diagram/bulk/export`, {
        diagramIds
    }, {
        responseType: 'blob'
    });

export const bulkDeleteDiagrams = (diagramIds) =>
    axiosClient.post(`/api/sequence-diagram/bulk/delete`, {
        diagramIds
    });

// SỬA API CLIENT - Dùng route chỉ cần sequenceId
export const deleteSequenceDiagram = (sequenceId) =>
    axiosClient.delete(`/api/sequence-diagram/${sequenceId}`);

// ==================== VALIDATION API ====================
export const validateStructure = (sqdId) =>
    axiosClient.post(`/api/sequence-diagram/${sqdId}/validate`);