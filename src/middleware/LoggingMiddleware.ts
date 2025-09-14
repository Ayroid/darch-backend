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

    // Log incoming request with structured data
    logger.logRequest(
      req.method,
      req.path,
      req.ip || 'unknown',
      req.get('User-Agent'),
      {
        requestId,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        bodySize: req.get('Content-Length') || undefined,
        contentType: req.get('Content-Type') || undefined,
        referer: req.get('Referer') || undefined
      }
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
        {
          requestId,
          responseSize: chunk ? Buffer.byteLength(chunk) : undefined,
          contentType: res.get('Content-Type') || undefined
        }
      );

      // Log slow requests
      if (duration > 1000) {
        logger.logPerformance(`HTTP ${req.method} ${req.path}`, duration, {
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
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error.message,
      stack: error.stack,
      category: LogCategory.HTTP
    });
    next(error);
  }
}
