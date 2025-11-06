import { Router } from 'express';
import * as ordersController from '../controllers/orders.controller';

const router = Router();

router.get('/', ordersController.getOrders);
router.get('/number/:orderNumber', ordersController.getOrderByNumber);
router.get('/:id', ordersController.getOrderById);
router.post('/', ordersController.createOrder);
router.post('/bulk', ordersController.createBulkOrders);
router.put('/:id/status', ordersController.updateOrderStatus);
router.post('/:id/cancel', ordersController.cancelOrder);

export default router;