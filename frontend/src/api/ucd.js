// src/api/ucd.js
import axiosClient from "@/utils/axiosClient";

// ==================== USE CASE DIAGRAM API ====================
export const getUsecaseDiagrams = (versionId) =>
    axiosClient.get(`/api/usecase-diagram/versions/${versionId}/`);

export const getUsecaseDiagramById = (ucId) =>
    axiosClient.get(`/api/usecase-diagram/${ucId}`);

export const generateUsecaseDiagram = (versionId, language) =>
    axiosClient.post(`/api/usecase-diagram/versions/${versionId}/generate-usecase-diagram`, {
        language
    });

export const createActor = (ucId, data) =>
    axiosClient.post(`/api/usecase-diagram/${ucId}/actors`, data);

export const updateActor = (ucId, actorId, data) =>
    axiosClient.patch(`/api/usecase-diagram/${ucId}/actors/${actorId}`, data);

export const deleteActor = (ucId, actorId) =>
    axiosClient.delete(`/api/usecase-diagram/${ucId}/actors/${actorId}`);

export const createUsecase = (ucId, data) =>
    axiosClient.post(`/api/usecase-diagram/${ucId}/usecases`, data);

export const updateUsecase = (ucId, usecaseId, data) =>
    axiosClient.patch(`/api/usecase-diagram/${ucId}/usecases/${usecaseId}`, data);

export const deleteUsecase = (ucId, usecaseId) =>
    axiosClient.delete(`/api/usecase-diagram/${ucId}/usecases/${usecaseId}`);

export const createRelationship = (ucId, data) =>
    axiosClient.post(`/api/usecase-diagram/${ucId}/relationship`, data);

export const updateRelationship = (ucId, relationshipId, data) =>
    axiosClient.patch(`/api/usecase-diagram/${ucId}/relationships/${relationshipId}`, data);

export const deleteRelationship = (ucId, relationshipId) =>
    axiosClient.delete(`/api/usecase-diagram/${ucId}/relationships/${relationshipId}`);

export const createAssociation = (ucId, data) =>
    axiosClient.post(`/api/usecase-diagram/${ucId}/associations`, data);

export const updateAssociation = (ucId, associationId, data) =>
    axiosClient.patch(`/api/usecase-diagram/${ucId}/associations/${associationId}`, data);

export const deleteAssociation = (ucId, associationId) =>
    axiosClient.delete(`/api/usecase-diagram/${ucId}/associations/${associationId}`);

// ==================== POSITION ADJUSTMENT API ====================
export const updateActorPosition = (ucId, actorId, position) =>
    axiosClient.patch(`/api/usecase-diagram/${ucId}/actors/${actorId}/position`, position);

export const updateUsecasePosition = (ucId, usecaseId, position) =>
    axiosClient.patch(`/api/usecase-diagram/${ucId}/usecases/${usecaseId}/position`, position);

export const updateMultiplePositions = (ucId, updates) =>
    axiosClient.patch(`/api/usecase-diagram/${ucId}/positions`, updates);

export const resetPositions = (ucId) =>
    axiosClient.patch(`/api/usecase-diagram/${ucId}/reset-positions`);

export const exportDiagram = (ucId, format) =>
    axiosClient.get(`/api/usecase-diagram/${ucId}/export`, {
        params: { format },
        responseType: 'blob'
    });

export const duplicateDiagram = (ucId) =>
    axiosClient.post(`/api/usecase-diagram/${ucId}/duplicate`);

export const bulkExportDiagrams = (diagramIds) =>
    axiosClient.post(`/api/usecase-diagram/bulk/export`, {
        diagramIds
    }, {
        responseType: 'blob'
    });

export const bulkDeleteDiagrams = (diagramIds) =>
    axiosClient.post(`/api/usecase-diagram/bulk/delete`, {
        diagramIds
    });

export const deleteUsecaseDiagram = (ucId) =>
    axiosClient.delete(`/api/usecase-diagram/${ucId}`);