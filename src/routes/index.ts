
import { Router } from 'express';
import productsRoutes from './products.routes';
import ordersRoutes from './orders.routes';
import analyticsRoutes from './analytics.routes';
import webhooksRoutes from './webhooks.routes';

const router = Router();

router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/webhooks', webhooksRoutes);

export default router;
