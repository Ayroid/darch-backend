import { Request, Response, NextFunction } from 'express';

export class LoggingMiddleware {
  /**
   * Request logging middleware
   */
  static log(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Log request
    console.log(`📥 ${req.method} ${req.path} - ${req.ip}`);

    // Override res.end to log response time
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): any {
      const duration = Date.now() - startTime;
      console.log(`📤 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      return originalEnd.call(res, chunk, encoding);
    };

    next();
  }
}
