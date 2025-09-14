import { Request, Response } from 'express';
import { ResponseView } from '../views/ResponseView.js';
import { logger, LogCategory, LogLevel } from '../utils/Logger.js';

interface RequestWithId extends Request {
  requestId?: string;
}

export class HealthController {
  /**
   * Health check endpoint with structured logging
   */
  static async healthCheck(req: RequestWithId, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      logger.debug('🏥 Health check requested', {
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        component: 'HealthController',
        category: LogCategory.APP
      });

      const healthResponse = ResponseView.healthCheck();
      const duration = Date.now() - startTime;

      logger.debug('✅ Health check completed successfully', {
        requestId: req.requestId,
        duration,
        component: 'HealthController',
        category: LogCategory.APP
      });

      res.json(healthResponse);
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('❌ Health check failed', {
        requestId: req.requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration,
        component: 'HealthController',
        category: LogCategory.APP
      });

      const errorResponse = ResponseView.error('Health check failed');
      res.status(500).json(errorResponse);
    }
  }
}
