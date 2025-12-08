/**
 * Utility functions for translating backend error messages to user-friendly messages
 */

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

  // Database errors
  if (message.includes('duplicate') || message.includes('already exists')) {
    return 'This item already exists. Please use a different name or identifier.'
  }
  if (message.includes('not found')) {
    return 'The requested item could not be found. It may have been deleted or moved.'
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Please check your input. Some fields may be missing or contain invalid data.'
  }
  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return 'You do not have permission to perform this action.'
  }
  if (message.includes('network') || message.includes('timeout')) {
    return 'Connection problem. Please check your internet connection and try again.'
  }
  if (message.includes('server error') || message.includes('internal server')) {
    return 'A server error occurred. Please try again later or contact support if the problem persists.'
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


