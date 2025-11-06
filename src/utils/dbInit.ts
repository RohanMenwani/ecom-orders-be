import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

export const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');
    
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    
    console.log('✅ Schema created successfully');
    
    // Read seed file
    const seedPath = path.join(__dirname, '../../database/seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf-8');
    
    const seedStatements = seed.split(';').filter(stmt => stmt.trim());
    
    for (const statement of seedStatements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    
    console.log('✅ Seed data inserted successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};
