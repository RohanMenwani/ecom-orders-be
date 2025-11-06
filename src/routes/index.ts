
import { Router } from 'express';
import productsRoutes from './products.routes';
import ordersRoutes from './orders.routes';

const router = Router();

router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);

export default router;
