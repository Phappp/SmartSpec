/**
 * Utility để phân loại và xử lý lỗi từ API Key (Gemini, OpenAI, etc.)
 */

export enum ApiKeyErrorType {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_KEY = 'INVALID_KEY',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  BILLING_ISSUE = 'BILLING_ISSUE',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN'
}

export interface ApiKeyErrorInfo {
  type: ApiKeyErrorType;
  message: string;
  userFriendlyMessage: {
    vi: string;
    en: string;
  };
  shouldDisableKey: boolean;
  retryable: boolean;
}

/**
 * Phân tích lỗi từ API và trả về thông tin chi tiết
 */
export function analyzeApiKeyError(error: any): ApiKeyErrorInfo {
  if (!error) {
    return getUnknownError();
  }

  // Lấy toàn bộ thông tin lỗi từ nhiều nguồn
  const errorMessage = (error?.message || error?.toString() || '').toLowerCase();
  const statusCode = error?.status || error?.statusCode || error?.code;
  const errorDetails = error?.errorDetails || error?.details || '';
  const errorCause = error?.cause?.message || '';
  const fullErrorText = error?.toString() || '';
  
  // Kết hợp tất cả thông tin lỗi để phân tích
  const combinedMessage = `${errorMessage} ${errorDetails} ${errorCause} ${fullErrorText}`.toLowerCase();

  // Kiểm tra status code 503/502 trước
  if (statusCode === 503 || statusCode === 502) {
    return {
      type: ApiKeyErrorType.SERVICE_UNAVAILABLE,
      message: errorMessage || 'Service unavailable',
      userFriendlyMessage: {
        vi: 'Dịch vụ API tạm thời không khả dụng. Vui lòng thử lại sau.',
        en: 'API service is temporarily unavailable. Please try again later.'
      },
      shouldDisableKey: false,
      retryable: true
    };
  }

  // QUAN TRỌNG: Kiểm tra quota exceeded TRƯỚC rate limit
  // Vì status 429 có thể là cả rate limit hoặc quota exceeded
  // Cần kiểm tra message để phân biệt
  
  // Quota exceeded - các pattern cụ thể từ Gemini API
  if (
    combinedMessage.includes('exceeded your current quota') ||
    combinedMessage.includes('exceeded your quota') ||
    combinedMessage.includes('quota exceeded for metric') ||
    combinedMessage.includes('you exceeded your current quota') ||
    combinedMessage.includes('check your plan and billing') ||
    combinedMessage.includes('free_tier') ||
    combinedMessage.includes('generativelanguage.googleapis.com') ||
    combinedMessage.includes('limit: 0') ||
    (combinedMessage.includes('quota') && combinedMessage.includes('exceeded')) ||
    (combinedMessage.includes('quota') && combinedMessage.includes('limit')) ||
    combinedMessage.includes('billing limit') ||
    combinedMessage.includes('usage limit') ||
    combinedMessage.includes('monthly limit') ||
    combinedMessage.includes('daily limit') ||
    statusCode === 402
  ) {
    return {
      type: ApiKeyErrorType.QUOTA_EXCEEDED,
      message: errorMessage || 'Quota exceeded',
      userFriendlyMessage: {
        vi: 'API key đã hết quota. Vui lòng kiểm tra tài khoản và nạp thêm quota, hoặc sử dụng API key khác.',
        en: 'API key quota has been exceeded. Please check your account and add more quota, or use a different API key.'
      },
      shouldDisableKey: false,
      retryable: false
    };
  }

  // Rate limit - chỉ khi status 429 và KHÔNG phải quota
  if (
    statusCode === 429 ||
    combinedMessage.includes('rate limit') ||
    combinedMessage.includes('too many requests') ||
    combinedMessage.includes('request rate')
  ) {
    return {
      type: ApiKeyErrorType.RATE_LIMIT,
      message: errorMessage || 'Rate limit exceeded',
      userFriendlyMessage: {
        vi: 'API key đã vượt quá giới hạn số lượng request. Vui lòng thử lại sau vài phút.',
        en: 'API key has exceeded the rate limit. Please try again in a few minutes.'
      },
      shouldDisableKey: false,
      retryable: true
    };
  }

  // Resource exhausted
  if (
    combinedMessage.includes('resource exhausted') ||
    combinedMessage.includes('resource limit') ||
    combinedMessage.includes('out of quota')
  ) {
    return {
      type: ApiKeyErrorType.RESOURCE_EXHAUSTED,
      message: errorMessage || 'Resource exhausted',
      userFriendlyMessage: {
        vi: 'API key đã hết tài nguyên. Vui lòng kiểm tra quota hoặc sử dụng API key khác.',
        en: 'API key resources have been exhausted. Please check quota or use a different API key.'
      },
      shouldDisableKey: false,
      retryable: false
    };
  }

  // Rate limit
  if (
    combinedMessage.includes('rate limit') ||
    combinedMessage.includes('too many requests') ||
    combinedMessage.includes('request rate') ||
    statusCode === 429
  ) {
    return {
      type: ApiKeyErrorType.RATE_LIMIT,
      message: errorMessage || 'Rate limit exceeded',
      userFriendlyMessage: {
        vi: 'API key đã vượt quá giới hạn số lượng request. Vui lòng thử lại sau vài phút.',
        en: 'API key has exceeded the rate limit. Please try again in a few minutes.'
      },
      shouldDisableKey: false,
      retryable: true
    };
  }

  // Invalid key
  if (
    combinedMessage.includes('invalid api key') ||
    combinedMessage.includes('invalid key') ||
    combinedMessage.includes('api key not found') ||
    combinedMessage.includes('authentication failed') ||
    statusCode === 401
  ) {
    return {
      type: ApiKeyErrorType.INVALID_KEY,
      message: errorMessage || 'Invalid API key',
      userFriendlyMessage: {
        vi: 'API key không hợp lệ. Vui lòng kiểm tra lại API key.',
        en: 'Invalid API key. Please check your API key.'
      },
      shouldDisableKey: true,
      retryable: false
    };
  }

  // Unauthorized
  if (
    combinedMessage.includes('unauthorized') ||
    combinedMessage.includes('forbidden') ||
    statusCode === 403
  ) {
    return {
      type: ApiKeyErrorType.UNAUTHORIZED,
      message: errorMessage || 'Unauthorized',
      userFriendlyMessage: {
        vi: 'API key không có quyền truy cập. Vui lòng kiểm tra quyền của API key.',
        en: 'API key does not have permission. Please check API key permissions.'
      },
      shouldDisableKey: true,
      retryable: false
    };
  }

  // Permission denied
  if (
    combinedMessage.includes('permission denied') ||
    combinedMessage.includes('access denied')
  ) {
    return {
      type: ApiKeyErrorType.PERMISSION_DENIED,
      message: errorMessage || 'Permission denied',
      userFriendlyMessage: {
        vi: 'API key không có quyền thực hiện thao tác này.',
        en: 'API key does not have permission to perform this action.'
      },
      shouldDisableKey: false,
      retryable: false
    };
  }

  // Billing issue
  if (
    combinedMessage.includes('billing') ||
    combinedMessage.includes('payment') ||
    combinedMessage.includes('subscription')
  ) {
    return {
      type: ApiKeyErrorType.BILLING_ISSUE,
      message: errorMessage || 'Billing issue',
      userFriendlyMessage: {
        vi: 'Có vấn đề với thanh toán của API key. Vui lòng kiểm tra tài khoản.',
        en: 'There is a billing issue with the API key. Please check your account.'
      },
      shouldDisableKey: false,
      retryable: false
    };
  }

  // Unknown error
  return getUnknownError();
}

/**
 * Tạo error object với thông tin chi tiết
 */
export class ApiKeyError extends Error {
  public readonly errorInfo: ApiKeyErrorInfo;
  public readonly originalError: any;

  constructor(error: any, language: 'vi' | 'en' = 'vi') {
    const errorInfo = analyzeApiKeyError(error);
    const userMessage = errorInfo.userFriendlyMessage[language];
    
    super(userMessage);
    this.name = 'ApiKeyError';
    this.errorInfo = errorInfo;
    this.originalError = error;
  }

  getErrorCode(): string {
    return this.errorInfo.type;
  }

  shouldDisableKey(): boolean {
    return this.errorInfo.shouldDisableKey;
  }

  isRetryable(): boolean {
    return this.errorInfo.retryable;
  }
}

function getUnknownError(): ApiKeyErrorInfo {
  return {
    type: ApiKeyErrorType.UNKNOWN,
    message: 'Unknown API error',
    userFriendlyMessage: {
      vi: 'Đã xảy ra lỗi không xác định với API key. Vui lòng thử lại hoặc liên hệ hỗ trợ.',
      en: 'An unknown error occurred with the API key. Please try again or contact support.'
    },
    shouldDisableKey: false,
    retryable: true
  };
}

