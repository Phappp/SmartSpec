import axiosClient from '../utils/axiosClient'

/**
 * Chat with AI Copilot (non-streaming)
 */
export const chatWithAI = (data) => {
  return axiosClient.post(`/api/ai-copilot/projects/${data.projectId}/chat`, {
    versionId: data.versionId,
    message: data.message,
    context: data.context || [],
    conversationHistory: data.conversationHistory || [],
    stream: false
  })
}

/**
 * Chat with AI Copilot (streaming)
 */
export const chatWithAIStream = (data, onChunk, onComplete, onError) => {
  // Validate required fields
  if (!data || !data.projectId) {
    onError?.(new Error('Project ID is required'))
    return Promise.reject(new Error('Project ID is required'))
  }
  
  // Validate message first
  if (!data.message || typeof data.message !== 'string' || !data.message.trim()) {
    console.error('Invalid message in chatWithAIStream:', {
      message: data.message,
      type: typeof data.message,
      data: data
    })
    onError?.(new Error('Message is required'))
    return Promise.reject(new Error('Message is required'))
  }

  // Use fetch with streaming
  const baseURL = axiosClient.defaults.baseURL || 'http://localhost:8000'
  const token = localStorage.getItem('accessToken')
  const userId = localStorage.getItem('userId')
  
  // Ensure message is a valid string
  const messageValue = String(data.message).trim()
  if (!messageValue) {
    console.error('Message is empty after trim:', data.message)
    onError?.(new Error('Message cannot be empty'))
    return Promise.reject(new Error('Message cannot be empty'))
  }
  
  const requestBody = {
    versionId: data.versionId || null,
    message: messageValue,
    context: Array.isArray(data.context) ? data.context : [],
    conversationHistory: Array.isArray(data.conversationHistory) ? data.conversationHistory : [],
    stream: true
  }
  
  console.log('Sending chat request:', {
    url: `${baseURL}/api/ai-copilot/projects/${data.projectId}/chat`,
    messageLength: requestBody.message.length,
    messagePreview: requestBody.message.substring(0, 50),
    message: requestBody.message, // Full message for debugging
    hasVersionId: !!requestBody.versionId,
    contextLength: requestBody.context.length,
    conversationHistoryLength: requestBody.conversationHistory.length,
    requestBody: JSON.stringify(requestBody, null, 2)
  })
  
  const requestBodyString = JSON.stringify(requestBody)
  console.log('Request body string:', requestBodyString)
  
  // Ensure headers are clean
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  if (userId) {
    headers['x-user-id'] = userId
  }
  
  // Only add common headers if they exist and are strings
  if (axiosClient.defaults.headers?.common) {
    Object.keys(axiosClient.defaults.headers.common).forEach(key => {
      const value = axiosClient.defaults.headers.common[key]
      if (typeof value === 'string') {
        headers[key] = value
      }
    })
  }
  
  console.log('Request headers:', headers)
  console.log('Request body (final):', requestBodyString)
  
  return fetch(`${baseURL}/api/ai-copilot/projects/${data.projectId}/chat`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: requestBodyString
  }).then(async (response) => {
    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      throw new Error(errorMessage)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // Process remaining buffer
          if (buffer.trim()) {
            const lines = buffer.split('\n')
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.error) {
                    onError?.(new Error(data.error))
                    return
                  }
                  if (data.done) {
                    onComplete?.()
                    return
                  }
                  if (data.content) {
                    onChunk?.(data.content)
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e, line)
                }
              }
            }
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.error) {
                onError?.(new Error(data.error))
                return
              }
              if (data.done) {
                onComplete?.()
                return
              }
              if (data.content) {
                onChunk?.(data.content)
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e, line)
            }
          }
        }
      }

      onComplete?.()
    } catch (error) {
      console.error('Streaming error:', error)
      onError?.(error)
    }
  }).catch((error) => {
    onError?.(error)
  })
}

/**
 * Apply AI action (Create/Update/Delete)
 */
export const applyAIAction = (data) => {
  return axiosClient.post(`/api/ai-copilot/projects/${data.projectId}/apply-action`, {
    versionId: data.versionId,
    action: data.action
  })
}

/**
 * Get project data summary for AI context
 */
export const getProjectDataSummary = (projectId, versionId) => {
  const params = versionId ? { versionId } : {}
  return axiosClient.get(`/api/ai-copilot/projects/${projectId}/summary`, { params })
}

/**
 * Analyze project for inconsistencies
 */
export const analyzeProject = (projectId, versionId, options = {}) => {
  return axiosClient.post(`/api/ai-copilot/projects/${projectId}/analyze`, {
    versionId,
    ...options
  })
}

export default {
  chatWithAI,
  applyAIAction,
  getProjectDataSummary,
  analyzeProject
}
