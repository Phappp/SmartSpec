import { NextFunction, Response } from 'express';
import { AsyncHandler, HttpRequest } from '../types';

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
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(400).json({
          status: "Error",
          message: errorMessage,
          error: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
  }
}