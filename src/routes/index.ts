import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import apiRoutes from './apiRoutes.js';

const router = Router();

// Mount routes
router.use('/', healthRoutes);
router.use('/api', apiRoutes);

export default router;
