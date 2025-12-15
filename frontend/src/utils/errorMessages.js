/**
 * Utility functions for translating backend error messages to user-friendly messages
 */

/**
 * API Key Error Types từ backend
 */
export const API_KEY_ERROR_TYPES = {
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_KEY: 'INVALID_KEY',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  BILLING_ISSUE: 'BILLING_ISSUE',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNKNOWN: 'UNKNOWN'
}

/**
 * Translates technical error messages to user-friendly messages
 * @param {string} errorMessage - The error message from backend
 * @returns {string} - User-friendly error message
 */
export function translateErrorMessage(errorMessage) {
  if (!errorMessage) {
    return 'An unexpected error occurred. Please try again.'
  }

  const message = String(errorMessage).toLowerCase()

  // API Key errors - prioritize handling first
  if (message.includes('all gemini api keys failed') || message.includes('api keys failed')) {
    return 'LLM service is temporarily unavailable. Please check your API key or try again later.'
  }
  if (message.includes('googlegenerativeai error') || message.includes('404 not found')) {
    return 'LLM service is unavailable. Please try again later or contact support.'
  }

  // ✅ LLM Generation errors - check BEFORE generic "invalid" check
  if (message.includes('failed to generate') && (message.includes('gemini') || message.includes('ai') || message.includes('diagram'))) {
    return 'LLM service failed to generate the requested content. Please try again later.'
  }
  if (message.includes('invalid') && (message.includes('gemini') || message.includes('ai response') || message.includes('diagram json'))) {
    return 'LLM service returned invalid data. Please try again later.'
  }
  if (message.includes('empty response') && (message.includes('gemini') || message.includes('ai'))) {
    return 'LLM service returned an empty response. Please try again later.'
  }
  if (message.includes('failed to parse ai response') || message.includes('failed to parse json')) {
    return 'LLM service returned invalid data format. Please try again later.'
  }
  if (message.includes('no nodes') && message.includes('generated')) {
    return 'LLM service failed to generate diagram content. Please try again later.'
  }

  if (message.includes('quota') && (message.includes('exceeded') || message.includes('hết'))) {
    return 'API key quota has been exceeded. Please check and add more quota or use a different API key.'
  }
  if (message.includes('rate limit') || message.includes('giới hạn số lượng request')) {
    return 'API key has exceeded the rate limit. Please try again in a few minutes.'
  }
  if (message.includes('invalid api key') || message.includes('không hợp lệ')) {
    return 'Invalid API key. Please check your API key.'
  }
  if (message.includes('resource exhausted') || message.includes('hết tài nguyên')) {
    return 'API key resources have been exhausted. Please check quota or use a different API key.'
  }
  if (message.includes('permission') || message.includes('không có quyền')) {
    return 'API key does not have permission to perform this operation.'
  }
  if (message.includes('billing') || message.includes('thanh toán')) {
    return 'There is an issue with the API key billing. Please check your account.'
  }
  if (message.includes('unavailable') || message.includes('không khả dụng')) {
    return 'API service is temporarily unavailable. Please try again later.'
  }
  // Chunk errors - format more friendly
  if (message.includes('all database schema generation chunks failed') || message.includes('all chunks failed')) {
    return 'Failed to generate database schema. Please try again later.'
  }
  if (message.includes('chunk') && message.includes('failed')) {
    return 'Some parts of the database generation process encountered errors. Please try again.'
  }

  // Database errors
  if (message.includes('duplicate') || message.includes('already exists')) {
    return 'This item already exists. Please use a different name or identifier.'
  }
  if (message.includes('not found')) {
    return 'The requested item was not found. It may have been deleted or moved.'
  }
  // ✅ Generic "invalid" check - only after LLM-specific checks
  if (message.includes('validation') || (message.includes('invalid') && !message.includes('api key'))) {
    return 'Please check your input data. Some fields may be missing or contain invalid data.'
  }
  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return 'You do not have permission to perform this operation.'
  }
  if (message.includes('network') || message.includes('timeout')) {
    return 'Connection issue. Please check your internet connection and try again.'
  }
  if (message.includes('server error') || message.includes('internal server')) {
    return 'A server error occurred. Please try again later or contact support if the issue persists.'
  }

  // Specific business logic errors
  if (message.includes('primary key')) {
    return 'A record with this identifier already exists. Please use a different value.'
  }
  if (message.includes('foreign key')) {
    return 'This item is referenced by other items and cannot be deleted or modified.'
  }
  if (message.includes('composite')) {
    return 'This combination of values already exists. Please use different values.'
  }
  if (message.includes('nullable')) {
    return 'This field is required and cannot be empty.'
  }

  // If no specific translation found, return a sanitized version
  // Remove technical details but keep the core message if it's user-friendly
  if (message.length > 100) {
    return 'An error occurred while processing your request. Please try again or contact support.'
  }

  // Capitalize first letter and return
  return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
}

/**
 * Extracts user-friendly error message from error object
 * @param {Error|Object} error - The error object
 * @returns {string} - User-friendly error message
 */
export function extractErrorMessage(error) {
  if (!error) {
    return 'An unexpected error occurred. Please try again.'
  }

  // Kiểm tra xem có phải lỗi API key không (từ backend response)
  const responseData = error.response?.data
  if (responseData?.errorType === 'API_KEY_ERROR' || responseData?.errorCode) {
    // Backend đã trả về message thân thiện, sử dụng trực tiếp
    if (responseData.message) {
      return responseData.message
    }

    // Nếu không có message, dịch theo errorCode
    const errorCode = responseData.errorCode || responseData.error
    return getApiKeyErrorMessage(errorCode)
  }

  // Try to get message from different possible locations
  let message =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    error.toString()

  // If message is an object, try to extract meaningful text
  if (typeof message === 'object') {
    if (message.message) {
      message = message.message
    } else if (message.error) {
      message = message.error
    } else {
      message = 'An unexpected error occurred. Please try again.'
    }
  }

  return translateErrorMessage(message)
}

/**
 * Lấy message lỗi API key theo error code
 * @param {string} errorCode - Error code từ backend
 * @returns {string} - User-friendly error message
 */
export function getApiKeyErrorMessage(errorCode) {
  if (!errorCode) {
    return 'An error occurred with the API key. Please try again or contact support.'
  }

  const errorMessages = {
    [API_KEY_ERROR_TYPES.QUOTA_EXCEEDED]: 'API key quota has been exceeded. Please check and add more quota or use a different API key.',
    [API_KEY_ERROR_TYPES.RATE_LIMIT]: 'API key has exceeded the rate limit. Please try again in a few minutes.',
    [API_KEY_ERROR_TYPES.INVALID_KEY]: 'Invalid API key. Please check your API key.',
    [API_KEY_ERROR_TYPES.UNAUTHORIZED]: 'API key does not have access permission. Please check the API key permissions.',
    [API_KEY_ERROR_TYPES.RESOURCE_EXHAUSTED]: 'API key resources have been exhausted. Please check quota or use a different API key.',
    [API_KEY_ERROR_TYPES.PERMISSION_DENIED]: 'API key does not have permission to perform this operation.',
    [API_KEY_ERROR_TYPES.BILLING_ISSUE]: 'There is an issue with the API key billing. Please check your account.',
    [API_KEY_ERROR_TYPES.SERVICE_UNAVAILABLE]: 'API service is temporarily unavailable. Please try again later.',
    [API_KEY_ERROR_TYPES.UNKNOWN]: 'An unknown error occurred with the API key. Please try again or contact support.'
  }

  return errorMessages[errorCode] || errorMessages[API_KEY_ERROR_TYPES.UNKNOWN]
}

/**
 * Formats error for display in toast/notification
 * @param {Error|Object} error - The error object
 * @param {string} defaultMessage - Default message if error cannot be extracted
 * @returns {string} - Formatted error message
 */
export function formatErrorForDisplay(error, defaultMessage = 'An error occurred') {
  if (!error) {
    return defaultMessage
  }

  const message = extractErrorMessage(error)
  return message || defaultMessage
}

/**
 * Kiểm tra xem lỗi có phải là lỗi API key không
 * @param {Error|Object} error - The error object
 * @returns {boolean} - True nếu là lỗi API key
 */
export function isApiKeyError(error) {
  if (!error) return false

  const responseData = error.response?.data
  return responseData?.errorType === 'API_KEY_ERROR' ||
    (responseData?.errorCode && Object.values(API_KEY_ERROR_TYPES).includes(responseData.errorCode))
}

/**
 * Kiểm tra xem lỗi có thể retry được không
 * @param {Error|Object} error - The error object
 * @returns {boolean} - True nếu có thể retry
 */
export function isRetryableError(error) {
  if (!error) return false

  const responseData = error.response?.data
  if (responseData?.retryable !== undefined) {
    return responseData.retryable
  }

  // Mặc định: rate limit và service unavailable có thể retry
  const errorCode = responseData?.errorCode
  return errorCode === API_KEY_ERROR_TYPES.RATE_LIMIT ||
    errorCode === API_KEY_ERROR_TYPES.SERVICE_UNAVAILABLE
}


