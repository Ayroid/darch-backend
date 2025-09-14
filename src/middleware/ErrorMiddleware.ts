import { Request, Response, NextFunction } from 'express';
import { ResponseView } from '../views/ResponseView.js';
import { logger, LogCategory } from '../utils/Logger.js';

interface RequestWithId extends Request {
  requestId?: string;
}

export class ErrorMiddleware {
  /**
   * Global error handling middleware with structured logging
   */
  static handle(err: any, req: RequestWithId, res: Response, next: NextFunction): void {
    // Determine error severity and log accordingly
    const isOperationalError = err.statusCode && err.statusCode < 500;
    const errorLevel = isOperationalError ? 'warn' : 'error';

    // Extract useful error information
    const errorInfo = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: err.statusCode || 500,
      errorType: err.constructor.name,
      message: err.message,
      stack: err.stack,
      category: LogCategory.APP,
      component: 'ErrorHandler'
    };

    // Log the error with appropriate level
    if (errorLevel === 'error') {
      logger.error('🚨 Unhandled server error', errorInfo);
    } else {
      logger.warn('⚠️ Client error occurred', errorInfo);
    }

    // Log additional context for debugging
    if (req.body && Object.keys(req.body).length > 0) {
      logger.debug('Request body context', {
        requestId: req.requestId,
        body: req.body,
        category: LogCategory.HTTP
      });
    }

    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = isDevelopment
      ? err.message
      : (isOperationalError ? err.message : 'Internal server error');

    const errorResponse = ResponseView.error(errorMessage);
    const statusCode = err.statusCode || 500;

    res.status(statusCode).json(errorResponse);
  }

  /**
   * 404 Not Found middleware with structured logging
   */
  static notFound(req: RequestWithId, res: Response): void {
    logger.warn('📭 Route not found', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      category: LogCategory.HTTP,
      component: 'Router'
    });

    const errorResponse = ResponseView.error(`Route not found: ${req.method} ${req.path}`);
    res.status(404).json(errorResponse);
  }

  /**
   * Validation error middleware
   */
  static validationError(err: any, req: RequestWithId, res: Response, next: NextFunction): void {
    if (err.type === 'validation') {
      logger.warn('📝 Validation error', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        validationErrors: err.details,
        category: LogCategory.VALIDATION,
        component: 'Validation'
      });

      const errorResponse = ResponseView.error('Validation failed', err.details);
      res.status(400).json(errorResponse);
      return;
    }

    next(err);
  }

  /**
   * Rate limiting error middleware
   */
  static rateLimitError(req: RequestWithId, res: Response): void {
    logger.warn('🛡️ Rate limit exceeded', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      category: LogCategory.AUTH,
      component: 'RateLimit'
    });

    const errorResponse = ResponseView.error('Too many requests. Please try again later.');
    res.status(429).json(errorResponse);
  }
}
