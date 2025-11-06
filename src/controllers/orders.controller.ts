
import { Request, Response } from 'express';
import { OrdersService } from '../services/orders.service';
import { asyncHandler } from '../middleware/errorHandler';
import { OrderFilterParams } from '../types/requests';

const ordersService = new OrdersService();

export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const filters: OrderFilterParams = {
    status: req.query.status as any,
    payment_status: req.query.payment_status as any,
    customer_id: req.query.customer_id ? parseInt(req.query.customer_id as string) : undefined,
    date_from: req.query.date_from as string,
    date_to: req.query.date_to as string,
    min_amount: req.query.min_amount ? parseFloat(req.query.min_amount as string) : undefined,
    max_amount: req.query.max_amount ? parseFloat(req.query.max_amount as string) : undefined,
    search: req.query.search as string,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    sort_by: req.query.sort_by as any,
    sort_order: (req.query.sort_order as string)?.toUpperCase() as 'ASC' | 'DESC'
  };
  
  const { orders, total } = await ordersService.getOrders(filters);
  
  const totalPages = Math.ceil(total / (filters.limit || 10));
  
  res.json({
    success: true,
    data: orders,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: totalPages
    }
  });
});

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const order = await ordersService.getOrderById(id);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found'
    });
  }
  
  res.json({
    success: true,
    data: order
  });
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await ordersService.createOrder(req.body);
  
  res.status(201).json({
    success: true,
    data: order,
    message: 'Order created successfully'
  });
});

export const createBulkOrders = asyncHandler(async (req: Request, res: Response) => {
  const result = await ordersService.createBulkOrders(req.body);
  
  res.status(201).json({
    success: true,
    data: result,
    message: `${result.created} orders created successfully`
  });
});

export const getOrderByNumber = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = req.params.orderNumber;
  const order = await ordersService.getOrderByNumber(orderNumber);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found'
    });
  }
  
  res.json({
    success: true,
    data: order
  });
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { reason } = req.body;
  
  const order = await ordersService.cancelOrder(id, reason);
  
  res.json({
    success: true,
    data: order,
    message: 'Order cancelled successfully'
  });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({
      success: false,
      error: 'status is required'
    });
  }
  
  const order = await ordersService.updateOrderStatus(id, status);
  
  res.json({
    success: true,
    data: order,
    message: 'Order status updated successfully'
  });
});
