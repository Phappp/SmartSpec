import { NextFunction, Response } from 'express';
import { AsyncHandler, HttpRequest } from '../types';
import { ApiKeyError, analyzeApiKeyError } from './apiKeyErrorHandler';

export class BaseController {
  async execWithTryCatchBlock(
    req: HttpRequest,
    res: Response,
    next: NextFunction,
    handler: AsyncHandler
  ) {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error("❌ Error in execWithTryCatchBlock:", error);
      if (!res.headersSent) {
        // Xử lý ApiKeyError đặc biệt
        if (error instanceof ApiKeyError) {
          const errorInfo = error.errorInfo;
          const language = req.headers['accept-language']?.includes('vi') ? 'vi' : 'en';
          
          res.status(this.getHttpStatusForApiKeyError(errorInfo.type)).json({
            status: "Error",
            message: errorInfo.userFriendlyMessage[language],
            error: errorInfo.type,
            errorCode: errorInfo.type,
            errorType: 'API_KEY_ERROR',
            retryable: errorInfo.retryable,
            shouldDisableKey: errorInfo.shouldDisableKey,
          });
          return;
        }

        // Xử lý lỗi thông thường
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Thử phân tích xem có phải lỗi API key không
        const apiKeyErrorInfo = analyzeApiKeyError(error);
        if (apiKeyErrorInfo.type !== 'UNKNOWN') {
          const language = req.headers['accept-language']?.includes('vi') ? 'vi' : 'en';
          res.status(this.getHttpStatusForApiKeyError(apiKeyErrorInfo.type)).json({
            status: "Error",
            message: apiKeyErrorInfo.userFriendlyMessage[language],
            error: apiKeyErrorInfo.type,
            errorCode: apiKeyErrorInfo.type,
            errorType: 'API_KEY_ERROR',
            retryable: apiKeyErrorInfo.retryable,
            shouldDisableKey: apiKeyErrorInfo.shouldDisableKey,
          });
          return;
        }

        res.status(400).json({
          status: "Error",
          message: errorMessage,
          error: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
  }

  private getHttpStatusForApiKeyError(errorType: string): number {
    switch (errorType) {
      case 'QUOTA_EXCEEDED':
      case 'RESOURCE_EXHAUSTED':
        return 402; // Payment Required
      case 'RATE_LIMIT':
        return 429; // Too Many Requests
      case 'INVALID_KEY':
      case 'UNAUTHORIZED':
        return 401; // Unauthorized
      case 'PERMISSION_DENIED':
        return 403; // Forbidden
      case 'SERVICE_UNAVAILABLE':
        return 503; // Service Unavailable
      case 'BILLING_ISSUE':
        return 402; // Payment Required
      default:
        return 400; // Bad Request
    }
  }
}