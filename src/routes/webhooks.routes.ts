import { Router } from 'express';
import * as webhooksController from '../controllers/webhooks.controller';

const router = Router();

// Production webhook 
router.post('/payment', webhooksController.receivePaymentWebhook);

// Admin endpoints
router.get('/events', webhooksController.getWebhookEvents);
router.get('/events/:eventId', webhooksController.getWebhookEvent);
router.post('/retry', webhooksController.retryFailedWebhooks);

// Testing endpoint
router.post('/simulate-payment', webhooksController.simulatePaymentWebhook);

export default router;