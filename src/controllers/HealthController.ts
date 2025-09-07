import { Request, Response } from 'express';
import { ResponseView } from '../views/ResponseView.js';

export class HealthController {
  /**
   * Health check endpoint
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthResponse = ResponseView.healthCheck();
      res.json(healthResponse);
    } catch (error) {
      console.error('❌ Health check error:', error);
      const errorResponse = ResponseView.error('Health check failed');
      res.status(500).json(errorResponse);
    }
  }
}
