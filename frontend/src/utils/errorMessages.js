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
    return 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'
  }

  const message = String(errorMessage).toLowerCase()

  // API Key errors - ưu tiên xử lý trước
  if (message.includes('quota') && (message.includes('hết') || message.includes('exceeded'))) {
    return 'API key đã hết quota. Vui lòng kiểm tra và nạp thêm quota hoặc sử dụng API key khác.'
  }
  if (message.includes('rate limit') || message.includes('giới hạn số lượng request')) {
    return 'API key đã vượt quá giới hạn số lượng request. Vui lòng thử lại sau vài phút.'
  }
  if (message.includes('không hợp lệ') || message.includes('invalid api key')) {
    return 'API key không hợp lệ. Vui lòng kiểm tra lại API key.'
  }
  if (message.includes('hết tài nguyên') || message.includes('resource exhausted')) {
    return 'API key đã hết tài nguyên. Vui lòng kiểm tra quota hoặc sử dụng API key khác.'
  }
  if (message.includes('không có quyền') || message.includes('permission')) {
    return 'API key không có quyền thực hiện thao tác này.'
  }
  if (message.includes('thanh toán') || message.includes('billing')) {
    return 'Có vấn đề với thanh toán của API key. Vui lòng kiểm tra tài khoản.'
  }
  if (message.includes('không khả dụng') || message.includes('unavailable')) {
    return 'Dịch vụ API tạm thời không khả dụng. Vui lòng thử lại sau.'
  }

  // Database errors
  if (message.includes('duplicate') || message.includes('already exists')) {
    return 'Mục này đã tồn tại. Vui lòng sử dụng tên hoặc định danh khác.'
  }
  if (message.includes('not found')) {
    return 'Không tìm thấy mục được yêu cầu. Có thể đã bị xóa hoặc di chuyển.'
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Vui lòng kiểm tra dữ liệu đầu vào. Một số trường có thể thiếu hoặc chứa dữ liệu không hợp lệ.'
  }
  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return 'Bạn không có quyền thực hiện thao tác này.'
  }
  if (message.includes('network') || message.includes('timeout')) {
    return 'Vấn đề kết nối. Vui lòng kiểm tra kết nối internet và thử lại.'
  }
  if (message.includes('server error') || message.includes('internal server')) {
    return 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau hoặc liên hệ hỗ trợ nếu vấn đề vẫn tiếp tục.'
  }

  // Specific business logic errors
  if (message.includes('primary key')) {
    return 'Một bản ghi với định danh này đã tồn tại. Vui lòng sử dụng giá trị khác.'
  }
  if (message.includes('foreign key')) {
    return 'Mục này được tham chiếu bởi các mục khác và không thể xóa hoặc sửa đổi.'
  }
  if (message.includes('composite')) {
    return 'Sự kết hợp các giá trị này đã tồn tại. Vui lòng sử dụng các giá trị khác.'
  }
  if (message.includes('nullable')) {
    return 'Trường này là bắt buộc và không thể để trống.'
  }

  // If no specific translation found, return a sanitized version
  // Remove technical details but keep the core message if it's user-friendly
  if (message.length > 100) {
    return 'Đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại hoặc liên hệ hỗ trợ.'
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
    return 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'
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
      message = 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'
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
    return 'Đã xảy ra lỗi với API key. Vui lòng thử lại hoặc liên hệ hỗ trợ.'
  }

  const errorMessages = {
    [API_KEY_ERROR_TYPES.QUOTA_EXCEEDED]: 'API key đã hết quota. Vui lòng kiểm tra và nạp thêm quota hoặc sử dụng API key khác.',
    [API_KEY_ERROR_TYPES.RATE_LIMIT]: 'API key đã vượt quá giới hạn số lượng request. Vui lòng thử lại sau vài phút.',
    [API_KEY_ERROR_TYPES.INVALID_KEY]: 'API key không hợp lệ. Vui lòng kiểm tra lại API key.',
    [API_KEY_ERROR_TYPES.UNAUTHORIZED]: 'API key không có quyền truy cập. Vui lòng kiểm tra quyền của API key.',
    [API_KEY_ERROR_TYPES.RESOURCE_EXHAUSTED]: 'API key đã hết tài nguyên. Vui lòng kiểm tra quota hoặc sử dụng API key khác.',
    [API_KEY_ERROR_TYPES.PERMISSION_DENIED]: 'API key không có quyền thực hiện thao tác này.',
    [API_KEY_ERROR_TYPES.BILLING_ISSUE]: 'Có vấn đề với thanh toán của API key. Vui lòng kiểm tra tài khoản.',
    [API_KEY_ERROR_TYPES.SERVICE_UNAVAILABLE]: 'Dịch vụ API tạm thời không khả dụng. Vui lòng thử lại sau.',
    [API_KEY_ERROR_TYPES.UNKNOWN]: 'Đã xảy ra lỗi không xác định với API key. Vui lòng thử lại hoặc liên hệ hỗ trợ.'
  }

  return errorMessages[errorCode] || errorMessages[API_KEY_ERROR_TYPES.UNKNOWN]
}

/**
 * Formats error for display in toast/notification
 * @param {Error|Object} error - The error object
 * @param {string} defaultMessage - Default message if error cannot be extracted
 * @returns {string} - Formatted error message
 */
export function formatErrorForDisplay(error, defaultMessage = 'Đã xảy ra lỗi') {
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


