
import { Router } from 'express';
import * as productsController from '../controllers/products.controller';

const router = Router();

router.get('/', productsController.getAllProducts);
router.get('/:id', productsController.getProductById);
router.post('/', productsController.createProduct);
router.put('/:id', productsController.updateProduct);
router.patch('/:id/stock', productsController.adjustProductStock);
router.delete('/:id', productsController.deleteProduct);
router.get('/:id/inventory', productsController.getProductInventoryHistory);

export default router;
