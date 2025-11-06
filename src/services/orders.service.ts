import { pool } from '../config/database';
import { Order, OrderWithDetails, OrderItem, OrderItemWithProduct, OrderStatus, PaymentStatus } from '../types/models';
import { CreateOrderRequest, BulkCreateOrderRequest, OrderFilterParams } from '../types/requests';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { AppError } from '../middleware/errorHandler';

export class OrdersService {
  
  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${new Date().getFullYear()}-${String(timestamp).slice(-6)}${String(random).padStart(3, '0')}`;
  }
  
  /**
   * Get all orders with advanced filtering and pagination
   */
  async getOrders(filters: OrderFilterParams): Promise<{ orders: OrderWithDetails[], total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;
    
    let whereConditions: string[] = [];
    const params: any[] = [];
    
    if (filters.status) {
      whereConditions.push('o.status = ?');
      params.push(filters.status);
    }
    
    if (filters.payment_status) {
      whereConditions.push('o.payment_status = ?');
      params.push(filters.payment_status);
    }
    
    if (filters.customer_id) {
      whereConditions.push('o.customer_id = ?');
      params.push(filters.customer_id);
    }
    
    if (filters.date_from) {
      whereConditions.push('DATE(o.created_at) >= ?');
      params.push(filters.date_from);
    }
    
    if (filters.date_to) {
      whereConditions.push('DATE(o.created_at) <= ?');
      params.push(filters.date_to);
    }
    
    if (filters.min_amount !== undefined) {
      whereConditions.push('o.total_amount >= ?');
      params.push(filters.min_amount);
    }
    
    if (filters.max_amount !== undefined) {
      whereConditions.push('o.total_amount <= ?');
      params.push(filters.max_amount);
    }
    
    if (filters.search) {
      whereConditions.push('(o.order_number LIKE ? OR c.name LIKE ? OR c.email LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM orders o 
                        JOIN customers c ON o.customer_id = c.id ${whereClause}`;
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, params);
    const total = (countResult[0] as any).count;
    
    // Get paginated results with customer details
    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'DESC';
    
    const query = `
      SELECT 
        o.id, o.customer_id, o.order_number, o.status, o.total_amount,
        o.payment_status, o.payment_method, o.shipping_address, o.notes,
        o.created_at, o.updated_at,
        c.name as customer_name, c.email as customer_email
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY o.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    
    // Fetch order items for each order
    const orders = await Promise.all(
      rows.map(async (row: any) => {
        const items = await this.getOrderItems(row.id);
        return { ...row, items } as OrderWithDetails;
      })
    );
    
    return { orders, total };
  }
  
  /**
   * Get single order with full details
   */
  async getOrderById(id: number): Promise<OrderWithDetails | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        o.id, o.customer_id, o.order_number, o.status, o.total_amount,
        o.payment_status, o.payment_method, o.shipping_address, o.notes,
        o.created_at, o.updated_at,
        c.name as customer_name, c.email as customer_email
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const order = rows[0] as any;
    const items = await this.getOrderItems(id);
    const auditLogs = await this.getAuditLogs(id);
    
    return {
      ...order,
      items,
      audit_logs: auditLogs
    } as OrderWithDetails;
  }
  
  /**
   * Get order items with product details
   */
  private async getOrderItems(orderId: number): Promise<OrderItemWithProduct[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        oi.id, oi.order_id, oi.product_id, oi.quantity,
        oi.unit_price, oi.subtotal, oi.created_at,
        p.name as product_name, p.sku as product_sku
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.created_at ASC`,
      [orderId]
    );
    
    return rows as OrderItemWithProduct[];
  }
  
  /**
   * Get audit logs for order
   */
  private async getAuditLogs(orderId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM audit_logs 
       WHERE order_id = ? 
       ORDER BY created_at ASC`,
      [orderId]
    );
    
    return rows;
  }
  
  /**
   * Create single order with transaction handling
   */
  async createOrder(orderData: CreateOrderRequest): Promise<OrderWithDetails> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Validate customer exists
      const [customerRows] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM customers WHERE id = ?',
        [orderData.customer_id]
      );
      
      if (customerRows.length === 0) {
        throw new AppError('Customer not found', 404);
      }
      
      // Validate products and calculate total
      let totalAmount = 0;
      const orderItems = [];
      
      for (const item of orderData.items) {
        const [productRows] = await connection.query<RowDataPacket[]>(
          'SELECT * FROM products WHERE id = ? FOR UPDATE',
          [item.product_id]
        );
        
        if (productRows.length === 0) {
          throw new AppError(`Product ${item.product_id} not found`, 404);
        }
        
        const product = productRows[0] as any;
        
        if (product.stock_quantity < item.quantity) {
          throw new AppError(
            `Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}`,
            400
          );
        }
        
        const subtotal = product.price * item.quantity;
        totalAmount += subtotal;
        
        orderItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: product.price,
          subtotal
        });
        
        // Deduct stock
        await connection.query(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
        
        // Log inventory transaction
        await connection.query(
          `INSERT INTO inventory_transactions 
           (product_id, transaction_type, quantity_change, stock_after, notes)
           VALUES (?, 'sale', ?, ?, ?)`,
          [
            item.product_id,
            -item.quantity,
            product.stock_quantity - item.quantity,
            `Sold via order creation`
          ]
        );
      }
      
      // Create order
      const orderNumber = this.generateOrderNumber();
      const [orderResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO orders 
         (customer_id, order_number, status, total_amount, payment_status, payment_method, shipping_address, notes)
         VALUES (?, ?, 'pending', ?, 'pending', ?, ?, ?)`,
        [
          orderData.customer_id,
          orderNumber,
          totalAmount,
          orderData.payment_method || null,
          orderData.shipping_address || null,
          orderData.notes || null
        ]
      );
      
      const orderId = orderResult.insertId;
      
      // Insert order items
      for (const item of orderItems) {
        await connection.query(
          `INSERT INTO order_items 
           (order_id, product_id, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, item.product_id, item.quantity, item.unit_price, item.subtotal]
        );
      }
      
      // Log audit trail
      await connection.query(
        `INSERT INTO audit_logs 
         (order_id, action, old_value, new_value, changed_by)
         VALUES (?, 'order_created', NULL, ?, 'system')`,
        [orderId, JSON.stringify({ status: 'pending', items: orderItems.length })]
      );
      
      await connection.commit();
      
      // Fetch and return created order
      const createdOrder = await this.getOrderById(orderId);
      return createdOrder!;
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Create multiple orders (bulk)
   */
  async createBulkOrders(bulkData: BulkCreateOrderRequest): Promise<{ created: number, orders: OrderWithDetails[], errors: any[] }> {
    const results:any = { created: 0, orders: [], errors: [] };
    
    for (let i = 0; i < bulkData.orders.length; i++) {
      try {
        const order = await this.createOrder(bulkData.orders[i]);
        results.orders.push(order);
        results.created++;
      } catch (error: any) {
        results.errors.push({
          index: i,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM orders WHERE order_number = ?',
      [orderNumber]
    );
    
    return rows.length > 0 ? (rows[0] as Order) : null;
  }
}
