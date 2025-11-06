import { pool } from '../config/database';
import { WebhookEvent, Order } from '../types/models';
import { PaymentWebhookPayload } from '../types/requests';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { AppError } from '../middleware/errorHandler';
import { PoolConnection } from 'mysql2/promise';

export class WebhooksService {
  
  /**
   * Process payment webhook with idempotency
   */
  async processPaymentWebhook(payload: PaymentWebhookPayload): Promise<{ processed: boolean; message: string }> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Check if webhook already processed (idempotency)
      const [existingEvents] = await connection.query<RowDataPacket[]>(
        `SELECT id, status FROM webhook_events 
         WHERE event_id = ? FOR UPDATE`,
        [payload.event_id]
      );
      
      if (existingEvents.length > 0) {
        const event = existingEvents[0] as any;
        
        if (event.status === 'processed') {
          return {
            processed: false,
            message: 'Webhook already processed'
          };
        }
        
        if (event.status === 'failed') {
          // Retry failed webhook
          console.log(`Retrying webhook ${payload.event_id}`);
        }
      }
      
      // Find order by order number
      const [orderRows] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM orders WHERE order_number = ? FOR UPDATE',
        [payload.order_number]
      );
      
      if (orderRows.length === 0) {
        throw new AppError(`Order ${payload.order_number} not found`, 404);
      }
      
      const orderId = (orderRows[0] as any).id;
      
      // Create or update webhook event record
      if (existingEvents.length === 0) {
        await connection.query<ResultSetHeader>(
          `INSERT INTO webhook_events 
           (event_id, event_type, payload, status)
           VALUES (?, ?, ?, 'pending')`,
          [payload.event_id, payload.event_type, JSON.stringify(payload)]
        );
      }
      
      // Process based on event type
      if (payload.event_type === 'payment.success') {
        await this.handlePaymentSuccess(connection, orderId, payload);
      } else if (payload.event_type === 'payment.failed') {
        await this.handlePaymentFailed(connection, orderId, payload);
      }
      
      // Mark webhook as processed
      await connection.query(
        `UPDATE webhook_events 
         SET status = 'processed', processed_at = NOW()
         WHERE event_id = ?`,
        [payload.event_id]
      );
      
      await connection.commit();
      
      return {
        processed: true,
        message: `Payment webhook for order ${payload.order_number} processed successfully`
      };
      
    } catch (error) {
      await connection.rollback();
      
      // Log failed webhook
      try {
        await pool.query(
          `UPDATE webhook_events 
           SET status = 'failed', retry_count = retry_count + 1
           WHERE event_id = ?`,
          [payload.event_id]
        );
      } catch (e) {
        console.error('Failed to update webhook status:', e);
      }
      
      throw error;
    } finally {
      connection.release();
    }
  }
  
  private async handlePaymentSuccess(
    connection: PoolConnection,
    orderId: number,
    payload: PaymentWebhookPayload
  ) {

    // Get current order
    const [orderRows] = await connection.query<RowDataPacket[]>( 'SELECT * FROM orders WHERE id = ?', [orderId] );
    
    const order = orderRows[0] as any;
    
    // Verify amount matches
    if (Math.abs(order.total_amount - payload.amount) > 0.01) {
      throw new AppError(
        `Amount mismatch: expected ${order.total_amount}, got ${payload.amount}`,
        400
      );
    }
    
    // Update order payment status
    await connection.query(
      `UPDATE orders 
       SET payment_status = 'paid', payment_method = ?
       WHERE id = ?`,
      [payload.payment_method, orderId]
    );
    
    // Update order status to confirmed
    await connection.query(
      `UPDATE orders 
       SET status = 'confirmed'
       WHERE id = ? AND status = 'pending'`,
      [orderId]
    );
    
    // Log audit trail
    await connection.query(
      `INSERT INTO audit_logs 
       (order_id, action, old_value, new_value, changed_by)
       VALUES (?, 'payment_status_change', 'pending', 'paid', ?)`,
      [orderId, `webhook-${payload.event_id}`]
    );
  }
  
  private async handlePaymentFailed(
    connection: any,
    orderId: number,
    payload: PaymentWebhookPayload
  ) {
    // Update payment status
    await connection.query(
      `UPDATE orders 
       SET payment_status = 'failed'
       WHERE id = ?`,
      [orderId]
    );
    
    // Log audit trail
    await connection.query(
      `INSERT INTO audit_logs 
       (order_id, action, old_value, new_value, changed_by)
       VALUES (?, 'payment_status_change', 'pending', 'failed', ?)`,
      [orderId, `webhook-${payload.event_id}`]
    );
  }
  
  /**
   * Get webhook event by ID
   */
  async getWebhookEvent(eventId: string): Promise<WebhookEvent | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM webhook_events WHERE event_id = ?',
      [eventId]
    );
    
    return rows.length > 0 ? (rows[0] as WebhookEvent) : null;
  }
  
  /**
   * Get all webhook events with pagination
   */
  async getWebhookEvents(status?: string, limit = 50, offset = 0) {
    let query = 'SELECT * FROM webhook_events';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    
    return rows;
  }
  
  /**
   * Simulate sending webhook to external system
   */
  async sendOutboundWebhook(
    webhookUrl: string,
    eventType: string,
    payload: any
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
      // In real scenario, would use axios/fetch
      // For demo, we'll simulate with a console log
      console.log(`📤 Sending webhook to ${webhookUrl}`);
      console.log(`Event: ${eventType}`, payload);
      
      // Simulated successful response
      return {
        success: true,
        statusCode: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Retry failed webhooks
   */
  async retryFailedWebhooks() {
    const [failedEvents] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM webhook_events 
       WHERE status = 'failed' AND retry_count < 3
       ORDER BY created_at ASC
       LIMIT 10`
    );
    
    let retried = 0;
    
    for (const event of failedEvents as any[]) {
      try {
        const payload = event.payload;
        await this.processPaymentWebhook(payload);
        retried++;
      } catch (error) {
        console.error(`Failed to retry webhook ${event.event_id}:`, error);
      }
    }
    
    return { retried, total_failed: failedEvents.length };
  }
}
