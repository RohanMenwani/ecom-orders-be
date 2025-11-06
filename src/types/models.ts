export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  sku: string;
  category?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: number;
  customer_id: number;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method?: string;
  shipping_address?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: Date;
}

export interface AuditLog {
  id: number;
  order_id: number;
  action: string;
  old_value?: string;
  new_value?: string;
  changed_by?: string;
  created_at: Date;
}

export interface WebhookEvent {
  id: number;
  event_id: string;
  event_type: string;
  payload: any;
  status: 'pending' | 'processed' | 'failed';
  retry_count: number;
  processed_at?: Date;
  created_at: Date;
}

export interface InventoryTransaction {
  id: number;
  product_id: number;
  order_id?: number;
  transaction_type: 'purchase' | 'sale' | 'return' | 'adjustment';
  quantity_change: number;
  stock_after: number;
  notes?: string;
  created_at: Date;
}

export interface OrderWithDetails extends Order {
  customer_name: string;
  customer_email: string;
  items?: OrderItemWithProduct[];
  audit_logs?: AuditLog[];
}

export interface OrderItemWithProduct extends OrderItem {
  product_name: string;
  product_sku: string;
}
