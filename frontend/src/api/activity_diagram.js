import axios from 'axios'

const BASE = '/api/activity-diagrams'

export function generateFromUsecase(requirementId, versionId, language = 'vi-VN', actor = '') {
  return axios.post(`${BASE}/version/${versionId}/requirements/${requirementId}/generate`, null, { params: { language, actor } })
}

export function generateFromActor(versionId, actor, language = 'vi-VN') {
  return axios.post(`${BASE}/version/${versionId}/actors/generate`, null, { params: { actor, language } })
}

export function listRequirements(versionId) {
  return axios.get(`${BASE}/version/${versionId}/requirements`)
}

// Node/Edge CRUD
export function addNode(diagramId, node) {
  return axios.post(`${BASE}/${diagramId}/nodes`, node)
}
export function updateNode(diagramId, nodeId, node) {
  return axios.put(`${BASE}/${diagramId}/nodes/${nodeId}`, node)
}
export function removeNode(diagramId, nodeId) {
  return axios.delete(`${BASE}/${diagramId}/nodes/${nodeId}`)
}
export function addEdge(diagramId, edge) {
  return axios.post(`${BASE}/${diagramId}/edges`, edge)
}
export function updateEdge(diagramId, index, edge) {
  return axios.put(`${BASE}/${diagramId}/edges/${index}`, edge)
}
export function removeEdge(diagramId, index) {
  return axios.delete(`${BASE}/${diagramId}/edges/${index}`)
}
export function updateSvg(diagramId, diagram_svg) {
  return axios.patch(`${BASE}/${diagramId}/svg`, { diagram_svg })
}

export function listActivityDiagrams(params = {}) {
  return axios.get(`${BASE}`, { params })
}

export function getActivityDiagram(id) {
  return axios.get(`${BASE}/${id}`)
}

export function createActivityDiagram(payload) {
  return axios.post(`${BASE}`, payload)
}

export function updateActivityDiagram(id, payload) {
  return axios.put(`${BASE}/${id}`, payload)
}

export function deleteActivityDiagram(id) {
  return axios.delete(`${BASE}/${id}`)
}

export function validateActivityDiagram(id) {
  return axios.post(`${BASE}/${id}/validate`)
}

export function exportActivityDiagramSvg(id) {
  return axios.get(`${BASE}/${id}/export-svg`, { responseType: 'text' })
}

// ==================== POSITION ADJUSTMENT API ====================
export function updateNodePosition(diagramId, nodeId, position) {
  return axios.patch(`${BASE}/${diagramId}/nodes/${nodeId}/position`, position);
}

export function updateMultipleNodePositions(diagramId, nodes) {
  return axios.patch(`${BASE}/${diagramId}/nodes/positions`, { nodes });
}


