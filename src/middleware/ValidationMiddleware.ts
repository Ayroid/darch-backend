import { Request, Response, NextFunction } from 'express';
import { ValidationUtils } from '../utils/ValidationUtils.js';
import { ResponseView } from '../views/ResponseView.js';

export class ValidationMiddleware {
  /**
   * Validate architecture data in request body
   */
  static validateArchitectureData(req: Request, res: Response, next: NextFunction): void {
    console.log('\n🔍 [VALIDATION MIDDLEWARE] Checking architecture data');
    console.log('[VALIDATION MIDDLEWARE] Request body keys:', Object.keys(req.body));
    console.log('[VALIDATION MIDDLEWARE] Has architectureData:', !!req.body.architectureData);
    
    const { architectureData } = req.body;

    console.log('[VALIDATION MIDDLEWARE] Architecture data details:', {
      exists: !!architectureData,
      type: typeof architectureData,
      hasMetadata: !!architectureData?.metadata,
      hasResources: !!architectureData?.resources
    });

    const validation = ValidationUtils.validateArchitectureData(architectureData);

    console.log('[VALIDATION MIDDLEWARE] Validation result:', {
      isValid: validation.isValid,
      errorsCount: validation.errors.length,
      errors: validation.errors
    });

    if (!validation.isValid) {
      console.log('❌ [VALIDATION MIDDLEWARE] VALIDATION FAILED - Returning 400');
      console.log('[VALIDATION MIDDLEWARE] Errors:', validation.errors);
      
      const errorResponse = ResponseView.error(
        'Invalid architecture data',
        validation.errors.join(', ')
      );
      res.status(400).json(errorResponse);
      return;
    }

    console.log('✓ [VALIDATION MIDDLEWARE] Validation passed, proceeding to controller');
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
