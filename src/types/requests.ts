import { OrderStatus, PaymentStatus } from './models';

export interface CreateOrderItemRequest {
  product_id: number;
  quantity: number;
}

export interface CreateOrderRequest {
  customer_id: number;
  items: CreateOrderItemRequest[];
  payment_method?: string;
  shipping_address?: string;
  notes?: string;
}

export interface BulkCreateOrderRequest {
  orders: CreateOrderRequest[];
}

export interface UpdateProductStockRequest {
  quantity_change: number;
  transaction_type: 'purchase' | 'adjustment';
  notes?: string;
}

export interface OrderFilterParams {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  customer_id?: number;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'total_amount' | 'order_number';
  sort_order?: 'ASC' | 'DESC';
}

export interface PaymentWebhookPayload {
  event_id: string;
  event_type: 'payment.success' | 'payment.failed';
  order_number: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  timestamp: string;
}
