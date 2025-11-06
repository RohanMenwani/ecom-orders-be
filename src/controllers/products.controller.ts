import { Request, Response } from 'express';
import { ProductsService } from '../services/products.service';
import { asyncHandler } from '../middleware/errorHandler';

const productsService = new ProductsService();

export const getAllProducts = asyncHandler(async (req: Request, res: Response) => {
  const isActive = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;
  
  const products = await productsService.getAllProducts(isActive);
  
  res.json({
    success: true,
    data: products,
    count: products.length
  });
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const product = await productsService.getProductById(id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found'
    });
  }
  
  res.json({
    success: true,
    data: product
  });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.createProduct(req.body);
  
  res.status(201).json({
    success: true,
    data: product,
    message: 'Product created successfully'
  });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const product = await productsService.updateProduct(id, req.body);
  
  res.json({
    success: true,
    data: product,
    message: 'Product updated successfully'
  });
});

export const adjustProductStock = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { quantity_change, transaction_type, notes } = req.body;
  
  if (!quantity_change || !transaction_type) {
    return res.status(400).json({
      success: false,
      error: 'quantity_change and transaction_type are required'
    });
  }
  
  const product = await productsService.adjustStock(
    id,
    parseInt(quantity_change),
    transaction_type,
    notes
  );
  
  res.json({
    success: true,
    data: product,
    message: 'Stock adjusted successfully'
  });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await productsService.deleteProduct(id);
  
  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
});

export const getProductInventoryHistory = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const transactions = await productsService.getInventoryTransactions(id);
  
  res.json({
    success: true,
    data: transactions,
    count: transactions.length
  });
});
