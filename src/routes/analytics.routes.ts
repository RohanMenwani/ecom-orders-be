import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

router.get('/dashboard', analyticsController.getDashboardMetrics);
// router.get('/customers/lifetime-value', analyticsController.getCustomerLifetimeValue);
// router.get('/products/performance', analyticsController.getProductPerformance);

export default router;
