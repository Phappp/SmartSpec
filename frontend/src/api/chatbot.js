import axiosClient from '@/utils/axiosClient'

const BASE_PATH = '/api/chatbot'

const chatbotApi = {
    getProjects() {
        return axiosClient.get(`${BASE_PATH}/projects`)
    },
    getKnowledgeBase(projectId, versionId) {
        const params = versionId ? { versionId } : undefined
        return axiosClient.get(`${BASE_PATH}/projects/${projectId}/knowledge-base`, { params })
    },
    getConversations(projectId, versionId) {
        const params = { projectId }
        if (versionId) {
            params.versionId = versionId
        }
        return axiosClient.get(`${BASE_PATH}/conversations`, { params })
    },
    createConversation(payload) {
        return axiosClient.post(`${BASE_PATH}/conversations`, payload)
    },
    deleteConversation(conversationId) {
        return axiosClient.delete(`${BASE_PATH}/conversations/${conversationId}`)
    },
    sendMessage(conversationId, message) {
        return axiosClient.post(`${BASE_PATH}/conversations/${conversationId}/messages`, { message })
    },
    addContext(conversationId, contextPayload) {
        return axiosClient.post(`${BASE_PATH}/conversations/${conversationId}/contexts`, contextPayload)
    },
    removeContext(conversationId, contextId) {
        return axiosClient.delete(`${BASE_PATH}/conversations/${conversationId}/contexts/${contextId}`)
    },
    clearContexts(conversationId) {
        return axiosClient.delete(`${BASE_PATH}/conversations/${conversationId}/contexts`)
    },
    getPendingOperations(conversationId) {
        return axiosClient.get(`${BASE_PATH}/conversations/${conversationId}/operations`)
    },
    undoOperation(operationId) {
        return axiosClient.post(`${BASE_PATH}/operations/${operationId}/undo`)
    },
    keepOperation(operationId) {
        return axiosClient.post(`${BASE_PATH}/operations/${operationId}/keep`)
    },
}

export default chatbotApi

