import { Router } from 'express';
import { HealthController } from '../controllers/HealthController.js';

const router = Router();

// Health check endpoint
router.get('/health', HealthController.healthCheck);

export default router;
