import { Request, Response, NextFunction } from 'express';
import { ValidationUtils } from '../utils/ValidationUtils.js';
import { ResponseView } from '../views/ResponseView.js';

export class ValidationMiddleware {
  /**
   * Validate architecture data in request body
   */
  static validateArchitectureData(req: Request, res: Response, next: NextFunction): void {
    const { architectureData } = req.body;

    const validation = ValidationUtils.validateArchitectureData(architectureData);

    if (!validation.isValid) {
      const errorResponse = ResponseView.error(
        'Invalid architecture data',
        validation.errors.join(', ')
      );
      res.status(400).json(errorResponse);
      return;
    }

    next();
  }

  /**
   * Validate file name parameter
   */
  static validateFileName(req: Request, res: Response, next: NextFunction): void {
    const { filename } = req.params;

    if (!filename) {
      const errorResponse = ResponseView.error('Filename is required');
      res.status(400).json(errorResponse);
      return;
    }

    if (!filename.endsWith('.tf')) {
      const errorResponse = ResponseView.error('Invalid file type. Only .tf files are allowed');
      res.status(400).json(errorResponse);
      return;
    }

    // Prevent path traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      const errorResponse = ResponseView.error('Invalid filename');
      res.status(400).json(errorResponse);
      return;
    }

    next();
  }
}
