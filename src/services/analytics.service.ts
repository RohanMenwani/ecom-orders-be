import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2';

export interface DashboardMetrics {
  summary: {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    total_items_sold: number;
  };
  status_breakdown: Array<{ status: string; count: number; revenue: number }>;
  payment_breakdown: Array<{ payment_status: string; count: number; revenue: number }>;
  daily_revenue: Array<{ date: string; revenue: number; order_count: number }>;
  top_products: Array<{ product_id: number; name: string; quantity_sold: number; revenue: number }>;
  top_customers: Array<{ customer_id: number; name: string; email: string; total_spent: number; order_count: number }>;
  revenue_trend: Array<{ date: string; cumulative_revenue: number; daily_revenue: number }>;
}

export class AnalyticsService {
  
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    
    const summary = await this.getSummaryMetrics();
    
    
    const statusBreakdown = await this.getStatusBreakdown();
    
    
    const paymentBreakdown = await this.getPaymentBreakdown();
    

    const dailyRevenue = await this.getDailyRevenue();
    
    const topProducts = await this.getTopProducts();

    const topCustomers = await this.getTopCustomers();
    
    const revenueTrend = await this.getRevenueTrend();
    
    return {
      summary,
      status_breakdown: statusBreakdown,
      payment_breakdown: paymentBreakdown,
      daily_revenue: dailyRevenue,
      top_products: topProducts,
      top_customers: topCustomers,
      revenue_trend: revenueTrend
    };
  }
  
  private async getSummaryMetrics() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT id) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        SUM(
          SELECT SUM(quantity) FROM order_items oi 
          WHERE oi.order_id = orders.id
        ) as total_items_sold
       FROM orders
       WHERE status != 'cancelled'`
    );
    
    const result = rows[0] as any;
    
    // Get total items sold separately since subquery in SUM doesn't work well
    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT SUM(oi.quantity) as total_items_sold 
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status != 'cancelled'`
    );
    
    return {
      total_orders: result.total_orders || 0,
      total_revenue: result.total_revenue || 0,
      average_order_value: result.average_order_value || 0,
      total_items_sold: (itemRows[0] as any).total_items_sold || 0
    };
  }
  
  private async getStatusBreakdown() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as revenue
       FROM orders
       GROUP BY status
       ORDER BY count DESC`
    );
    
    return rows.map((row: any) => ({
      status: row.status,
      count: row.count,
      revenue: row.revenue || 0
    }));
  }
  
  private async getPaymentBreakdown() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        payment_status,
        COUNT(*) as count,
        SUM(total_amount) as revenue
       FROM orders
       GROUP BY payment_status
       ORDER BY count DESC`
    );
    
    return rows.map((row: any) => ({
      payment_status: row.payment_status,
      count: row.count,
      revenue: row.revenue || 0
    }));
  }
  
  private async getDailyRevenue() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as revenue,
        COUNT(*) as order_count
       FROM orders
       WHERE status != 'cancelled' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );
    
    return rows.map((row: any) => ({
      date: row.date,
      revenue: row.revenue || 0,
      order_count: row.order_count || 0
    }));
  }
  
  private async getTopProducts() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        p.id as product_id,
        p.name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.subtotal) as revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status != 'cancelled'
       GROUP BY p.id, p.name
       ORDER BY quantity_sold DESC
       LIMIT 10`
    );
    
    return rows.map((row: any) => ({
      product_id: row.product_id,
      name: row.name,
      quantity_sold: row.quantity_sold || 0,
      revenue: row.revenue || 0
    }));
  }
  
  private async getTopCustomers() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        c.id as customer_id,
        c.name,
        c.email,
        SUM(o.total_amount) as total_spent,
        COUNT(o.id) as order_count
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'cancelled'
       GROUP BY c.id, c.name, c.email
       HAVING order_count > 0
       ORDER BY total_spent DESC
       LIMIT 10`
    );
    
    return rows.map((row: any) => ({
      customer_id: row.customer_id,
      name: row.name,
      email: row.email,
      total_spent: row.total_spent || 0,
      order_count: row.order_count || 0
    }));
  }
  
  /**
   * Revenue trend with window function for cumulative sum
   * Uses SUM() OVER (ORDER BY ...) for running total
   */
  private async getRevenueTrend() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as daily_revenue,
        SUM(SUM(total_amount)) OVER (ORDER BY DATE(created_at)) as cumulative_revenue
       FROM orders
       WHERE status != 'cancelled' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );
    
    return rows.map((row: any) => ({
      date: row.date,
      daily_revenue: row.daily_revenue || 0,
      cumulative_revenue: row.cumulative_revenue || 0
    }));
  }
  
  /**
   * Advanced analytics: Customer lifetime value with rank
   */
  async getCustomerLifetimeValue() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        c.id,
        c.name,
        c.email,
        SUM(o.total_amount) as lifetime_value,
        COUNT(o.id) as total_orders,
        AVG(o.total_amount) as avg_order_value,
        MAX(o.created_at) as last_order_date,
        ROW_NUMBER() OVER (ORDER BY SUM(o.total_amount) DESC) as rank
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'cancelled'
       GROUP BY c.id, c.name, c.email
       HAVING total_orders > 0
       ORDER BY lifetime_value DESC`
    );
    
    return rows;
  }
  
  /**
   * Product performance ranking with window functions
   */
  async getProductPerformance() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        p.id,
        p.name,
        p.sku,
        SUM(oi.quantity) as units_sold,
        SUM(oi.subtotal) as total_revenue,
        AVG(oi.subtotal) as avg_order_value,
        RANK() OVER (ORDER BY SUM(oi.quantity) DESC) as sales_rank,
        PERCENT_RANK() OVER (ORDER BY SUM(oi.subtotal) DESC) as revenue_percentile
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
       GROUP BY p.id, p.name, p.sku
       HAVING units_sold > 0
       ORDER BY units_sold DESC`
    );
    
    return rows;
  }
}
