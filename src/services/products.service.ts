// backend/src/services/products.service.ts
import { pool } from '../config/database';
import { Product, InventoryTransaction } from '../types/models';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { AppError } from '../middleware/errorHandler';

export class ProductsService {
  
  async getAllProducts(isActive?: boolean): Promise<Product[]> {
    let query = 'SELECT * FROM products';
    const params: any[] = [];
    
    if (isActive !== undefined) {
      query += ' WHERE is_active = ?';
      params.push(isActive);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows as Product[];
  }
  
  async getProductById(id: number): Promise<Product | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    
    return rows.length > 0 ? (rows[0] as Product) : null;
  }
  
  async getProductBySku(sku: string): Promise<Product | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM products WHERE sku = ?',
      [sku]
    );
    
    return rows.length > 0 ? (rows[0] as Product) : null;
  }
  
  async createProduct(productData: Partial<Product>): Promise<Product> {
    const { name, description, price, stock_quantity, sku, category, is_active } = productData;
    
    // Check if SKU already exists
    const existing = await this.getProductBySku(sku!);
    if (existing) {
      throw new AppError('Product with this SKU already exists', 400);
    }
    
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO products (name, description, price, stock_quantity, sku, category, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description || null, price, stock_quantity || 0, sku, category || null, is_active !== false]
    );
    
    const product = await this.getProductById(result.insertId);
    return product!;
  }
  
  async updateProduct(id: number, productData: Partial<Product>): Promise<Product> {
    const existing = await this.getProductById(id);
    if (!existing) {
      throw new AppError('Product not found', 404);
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (productData.name !== undefined) {
      updates.push('name = ?');
      values.push(productData.name);
    }
    if (productData.description !== undefined) {
      updates.push('description = ?');
      values.push(productData.description);
    }
    if (productData.price !== undefined) {
      updates.push('price = ?');
      values.push(productData.price);
    }
    if (productData.category !== undefined) {
      updates.push('category = ?');
      values.push(productData.category);
    }
    if (productData.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(productData.is_active);
    }
    
    if (updates.length === 0) {
      return existing;
    }
    
    values.push(id);
    
    await pool.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const updated = await this.getProductById(id);
    return updated!;
  }
  
  async adjustStock(
    id: number,
    quantityChange: number,
    transactionType: 'purchase' | 'adjustment',
    notes?: string
  ): Promise<Product> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM products WHERE id = ? FOR UPDATE',
        [id]
      );
      
      if (rows.length === 0) {
        throw new AppError('Product not found', 404);
      }
      
      const product = rows[0] as Product;
      const newStock = product.stock_quantity + quantityChange;
      
      if (newStock < 0) {
        throw new AppError('Insufficient stock', 400);
      }
      
      // Update stock
      await connection.query(
        'UPDATE products SET stock_quantity = ? WHERE id = ?',
        [newStock, id]
      );
      
      // Log transaction
      await connection.query(
        `INSERT INTO inventory_transactions 
         (product_id, transaction_type, quantity_change, stock_after, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [id, transactionType, quantityChange, newStock, notes || null]
      );
      
      await connection.commit();
      
      const updated = await this.getProductById(id);
      return updated!;
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  async deleteProduct(id: number): Promise<void> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    
    await pool.query(
      'UPDATE products SET is_active = FALSE WHERE id = ?',
      [id]
    );
  }
  
  async getInventoryTransactions(productId: number): Promise<InventoryTransaction[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM inventory_transactions 
       WHERE product_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [productId]
    );
    
    return rows as InventoryTransaction[];
  }
}
