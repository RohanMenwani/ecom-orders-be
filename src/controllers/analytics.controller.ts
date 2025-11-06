import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { asyncHandler } from '../middleware/errorHandler';

const analyticsService = new AnalyticsService();

export const getDashboardMetrics = asyncHandler(async (req: Request, res: Response) => {
  const metrics = await analyticsService.getDashboardMetrics();
  
  res.json({
    success: true,
    data: metrics
  });
});

export const getCustomerLifetimeValue = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getCustomerLifetimeValue();
  
  res.json({
    success: true,
    data
  });
});

export const getProductPerformance = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getProductPerformance();
  
  res.json({
    success: true,
    data
  });
});
