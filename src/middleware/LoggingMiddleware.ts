import { Request, Response, NextFunction } from 'express';
import { logger, LogCategory } from '../utils/Logger.js';

interface RequestWithId extends Request {
  requestId?: string;
}

export class LoggingMiddleware {
  /**
   * Request logging middleware with structured logging
   */
  static log(req: RequestWithId, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = LoggingMiddleware.generateRequestId();

    // Add request ID to request object for downstream use
    req.requestId = requestId;

    // Log incoming request
    logger.logRequest(
      req.method,
      req.path,
      req.ip || 'unknown',
      req.get('User-Agent'),
      { requestId }
    );

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): any {
      const duration = Date.now() - startTime;

      logger.logResponse(
        req.method,
        req.path,
        res.statusCode,
        duration,
        { requestId }
      );

      // Log slow requests (only warn if > 5s)
      if (duration > 5000) {
        logger.logPerformance(`${req.method} ${req.path}`, duration, {
          requestId,
          category: LogCategory.HTTP
        });
      }

      return originalEnd.call(res, chunk, encoding);
    };

    next();
  }

  /**
   * Generate a unique request ID for tracing
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Middleware to add request timing
   */
  static addTiming(req: Request, res: Response, next: NextFunction): void {
    (req as any).startTime = Date.now();
    next();
  }

  /**
   * Error-specific logging middleware
   */
  static logError(error: Error, req: RequestWithId, res: Response, next: NextFunction): void {
    logger.error('HTTP request error', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      error: error.message,
      category: LogCategory.HTTP
    });
    next(error);
  }
}
