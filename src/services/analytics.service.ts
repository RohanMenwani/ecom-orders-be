'use client';

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
  revenue_trend: Array<{ date: string; daily_revenue: number; cumulative_revenue: number }>;
}

export class AnalyticsService {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
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
        revenue_trend: revenueTrend,
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  private async getSummaryMetrics() {
    // Get order metrics
    const [orderRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT id) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_order_value
       FROM orders
       WHERE status != 'cancelled'`
    );

    const orderResult = orderRows[0] as any;

    // Get total items sold - SEPARATE QUERY
    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(quantity), 0) as total_items_sold 
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status != 'cancelled'`
    );

    const itemResult = itemRows[0] as any;

    return {
      total_orders: orderResult.total_orders || 0,
      total_revenue: parseFloat(orderResult.total_revenue) || 0,
      average_order_value: parseFloat(orderResult.average_order_value) || 0,
      total_items_sold: itemResult.total_items_sold || 0,
    };
  }

  private async getStatusBreakdown() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE status != 'cancelled'
       GROUP BY status
       ORDER BY count DESC`
    );

    return (rows as any[]).map(row => ({
      status: row.status,
      count: row.count,
      revenue: parseFloat(row.revenue) || 0,
    }));
  }

  private async getPaymentBreakdown() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        payment_status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE status != 'cancelled'
       GROUP BY payment_status
       ORDER BY count DESC`
    );

    return (rows as any[]).map(row => ({
      payment_status: row.payment_status,
      count: row.count,
      revenue: parseFloat(row.revenue) || 0,
    }));
  }

  private async getDailyRevenue() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as order_count
       FROM orders
       WHERE status != 'cancelled' 
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    return (rows as any[]).map(row => ({
      date: row.date,
      revenue: parseFloat(row.revenue) || 0,
      order_count: row.order_count || 0,
    }));
  }

  private async getTopProducts() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        p.id as product_id,
        p.name,
        COALESCE(SUM(oi.quantity), 0) as quantity_sold,
        COALESCE(SUM(oi.subtotal), 0) as revenue
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
       GROUP BY p.id, p.name
       HAVING quantity_sold > 0
       ORDER BY quantity_sold DESC
       LIMIT 10`
    );

    return (rows as any[]).map(row => ({
      product_id: row.product_id,
      name: row.name,
      quantity_sold: row.quantity_sold || 0,
      revenue: parseFloat(row.revenue) || 0,
    }));
  }

  private async getTopCustomers() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        c.id as customer_id,
        c.name,
        c.email,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COUNT(o.id) as order_count
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'cancelled'
       GROUP BY c.id, c.name, c.email
       HAVING order_count > 0
       ORDER BY total_spent DESC
       LIMIT 10`
    );

    return (rows as any[]).map(row => ({
      customer_id: row.customer_id,
      name: row.name,
      email: row.email,
      total_spent: parseFloat(row.total_spent) || 0,
      order_count: row.order_count || 0,
    }));
  }

  private async getRevenueTrend() {
    // Get daily revenue for last 30 days
    const [dailyRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total_amount), 0) as daily_revenue
       FROM orders
       WHERE status != 'cancelled' 
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // Calculate cumulative revenue in TypeScript
    let cumulativeRevenue = 0;
    return (dailyRows as any[]).map(row => {
      cumulativeRevenue += parseFloat(row.daily_revenue) || 0;
      return {
        date: row.date,
        daily_revenue: parseFloat(row.daily_revenue) || 0,
        cumulative_revenue: parseFloat(cumulativeRevenue.toFixed(2)),
      };
    });
  }
}