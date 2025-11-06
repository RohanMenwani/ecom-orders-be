import { Request, Response } from 'express';
import { WebhooksService } from '../services/webhooks.service';
import { asyncHandler } from '../middleware/errorHandler';
import crypto from 'crypto';

const webhooksService = new WebhooksService();

export const receivePaymentWebhook = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body;

  // const signature = req.headers['x-webhook-signature'];
  // const isValid = verifyWebhookSignature(payload, signature);
  
  const result = await webhooksService.processPaymentWebhook(payload);
  
  res.status(200).json({
    success: true,
    data: result
  });
});

export const getWebhookEvent = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const event = await webhooksService.getWebhookEvent(eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      error: 'Webhook event not found'
    });
  }
  
  res.json({
    success: true,
    data: event
  });
});

export const getWebhookEvents = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string;
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  
  const events = await webhooksService.getWebhookEvents(status, limit, offset);
  
  res.json({
    success: true,
    data: events,
    pagination: { page, limit, count: events.length }
  });
});

export const retryFailedWebhooks = asyncHandler(async (req: Request, res: Response) => {
  const result = await webhooksService.retryFailedWebhooks();
  
  res.json({
    success: true,
    data: result,
    message: `Retried ${result.retried} failed webhooks`
  });
});

/**
 * Simulate incoming payment webhook (for testing)
 */
export const simulatePaymentWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { order_number, event_type, amount, payment_method } = req.body;
  
  if (!order_number || !event_type) {
    return res.status(400).json({
      success: false,
      error: 'order_number and event_type are required'
    });
  }
  
  // Generate unique event ID
  const eventId = `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  
  const payload = {
    event_id: eventId,
    event_type,
    order_number,
    amount: amount || 0,
    payment_method: payment_method || 'simulated',
    transaction_id: `txn_${crypto.randomBytes(8).toString('hex')}`,
    timestamp: new Date().toISOString()
  };
  
  try {
    const result = await webhooksService.processPaymentWebhook(payload);
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Webhook simulated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});
