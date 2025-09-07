import { Request, Response, NextFunction } from 'express';
import { ResponseView } from '../views/ResponseView.js';

export class ErrorMiddleware {
  /**
   * Global error handling middleware
   */
  static handle(err: any, req: Request, res: Response, next: NextFunction): void {
    console.error('Unhandled error:', err);
    
    const errorResponse = ResponseView.error('Internal server error');
    res.status(500).json(errorResponse);
  }

  /**
   * 404 Not Found middleware
   */
  static notFound(req: Request, res: Response): void {
    const errorResponse = ResponseView.error(`Route not found: ${req.method} ${req.path}`);
    res.status(404).json(errorResponse);
  }
}
