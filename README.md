# 📦 Simple Orders Backend - README

## Overview

**Simple Orders** is a production-ready e-commerce order management system backend built with **Node.js**, **Express**, **TypeScript**, and **MySQL**. It provides REST APIs for managing orders, products, customers, and analytics.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MySQL 5.7+
- npm or yarn

### Installation

```bash
# 1. Clone repository
git clone https://github.com/RohanMenwani/ecom-orders-be
cd simple-orders-backend

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env

# 4. Configure database
Edit .env with your MySQL credentials:
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=simple_orders

# 5. Run migrations
npm run migrate

# 6. Start development server
npm run dev

# 7. Start production server
npm start
```

### Access API
```
http://localhost:4000/api
```

---

## 📋 Environment Variables

```env
# Server
NODE_ENV=development
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=simple_orders

# JWT (optional)
JWT_SECRET=your_secret_key

# CORS
CORS_ORIGIN=http://localhost:3000,https://ecom-orders-fe.vercel.app
```

---

## 🗄️ Database Schema

### Tables

#### `customers`
```sql
id (INT) - Primary Key
name (VARCHAR)
email (VARCHAR) - Unique
phone (VARCHAR)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### `products`
```sql
id (INT) - Primary Key
name (VARCHAR)
description (TEXT)
price (DECIMAL 10,2)
stock_quantity (INT)
sku (VARCHAR) - Unique
category (VARCHAR)
is_active (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### `orders`
```sql
id (INT) - Primary Key
customer_id (INT) - Foreign Key
order_number (VARCHAR) - Unique
status (ENUM: pending, confirmed, processing, shipped, delivered, cancelled)
total_amount (DECIMAL 10,2)
payment_status (ENUM: pending, paid, failed, refunded)
payment_method (VARCHAR)
shipping_address (TEXT)
notes (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### `order_items`
```sql
id (INT) - Primary Key
order_id (INT) - Foreign Key
product_id (INT) - Foreign Key
quantity (INT)
unit_price (DECIMAL 10,2)
subtotal (DECIMAL 10,2)
created_at (TIMESTAMP)
```

#### `audit_logs`
```sql
id (INT) - Primary Key
order_id (INT) - Foreign Key
action (VARCHAR)
old_value (TEXT)
new_value (TEXT)
changed_by (VARCHAR)
created_at (TIMESTAMP)
```

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:4000/api
```

---

## 📦 ORDERS API

### Get All Orders
```
GET /orders
```

**Query Parameters:**
```
page=1
limit=10
status=pending|confirmed|processing|shipped|delivered|cancelled
payment_status=pending|paid|failed|refunded
search=order_number_or_customer_name
date_from=YYYY-MM-DD
date_to=YYYY-MM-DD
min_amount=100
max_amount=1000
sort_by=created_at|total_amount|order_number
sort_order=ASC|DESC
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_number": "ORD-001",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "total_amount": 299.99,
      "status": "delivered",
      "payment_status": "paid",
      "created_at": "2025-11-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "total_pages": 10
  }
}
```

---

### Get Order by ID
```
GET /orders/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "ORD-001",
    "customer_id": 5,
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "status": "delivered",
    "total_amount": 299.99,
    "payment_status": "paid",
    "payment_method": "credit_card",
    "shipping_address": "123 Main St, City, State 12345",
    "notes": "Please deliver after 5pm",
    "items": [
      {
        "id": 10,
        "product_id": 3,
        "product_name": "Laptop",
        "product_sku": "LAPTOP-001",
        "quantity": 1,
        "unit_price": 999.99,
        "subtotal": 999.99
      }
    ],
    "audit_logs": [
      {
        "id": 1,
        "action": "status_changed",
        "old_value": "pending",
        "new_value": "confirmed",
        "changed_by": "admin",
        "created_at": "2025-11-01T10:05:00Z"
      }
    ],
    "created_at": "2025-11-01T10:00:00Z",
    "updated_at": "2025-11-06T15:30:00Z"
  }
}
```

---

### Create Order
```
POST /orders
Content-Type: application/json
```

**Request Body:**
```json
{
  "customer_id": 5,
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "total_amount": 299.99,
  "payment_status": "pending",
  "status": "pending",
  "payment_method": "credit_card",
  "shipping_address": "123 Main St, City, State 12345",
  "notes": "Please deliver after 5pm",
  "items": [
    {
      "product_id": 3,
      "quantity": 1,
      "unit_price": 999.99,
      "subtotal": 999.99
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "ORD-001",
    "status": "pending",
    "total_amount": 299.99
  }
}
```

---

### Update Order Status
```
PUT /orders/:id/status
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "confirmed",
    "message": "Order status updated successfully"
  }
}
```

---

### Cancel Order
```
POST /orders/:id/cancel
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "cancelled",
    "message": "Order cancelled successfully"
  }
}
```

---

## 🛍️ PRODUCTS API

### Get All Products
```
GET /products
```

**Query Parameters:**
```
active=true|false
search=product_name
page=1
limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Laptop",
      "description": "High-performance laptop",
      "price": 999.99,
      "stock_quantity": 50,
      "sku": "LAPTOP-001",
      "category": "Electronics",
      "is_active": true,
      "created_at": "2025-11-01T10:00:00Z"
    }
  ]
}
```

---

### Get Product by ID
```
GET /products/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": 999.99,
    "stock_quantity": 50,
    "sku": "LAPTOP-001",
    "category": "Electronics",
    "is_active": true
  }
}
```

---

### Create Product
```
POST /products
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": 999.99,
  "stock_quantity": 50,
  "sku": "LAPTOP-001",
  "category": "Electronics",
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Laptop",
    "price": 999.99,
    "sku": "LAPTOP-001"
  }
}
```

---

### Update Product
```
PUT /products/:id
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Laptop Pro",
  "price": 1299.99,
  "stock_quantity": 45
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Laptop Pro",
    "price": 1299.99
  }
}
```

---

### Delete Product
```
DELETE /products/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## 📊 ANALYTICS API

### Get Dashboard Metrics
```
GET /analytics/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_orders": 150,
      "total_revenue": 45000.00,
      "average_order_value": 300.00,
      "total_items_sold": 450
    },
    "status_breakdown": [
      {
        "status": "delivered",
        "count": 100,
        "revenue": 30000.00
      },
      {
        "status": "pending",
        "count": 30,
        "revenue": 9000.00
      }
    ],
    "payment_breakdown": [
      {
        "payment_status": "paid",
        "count": 130,
        "revenue": 39000.00
      }
    ],
    "daily_revenue": [
      {
        "date": "2025-11-01",
        "revenue": 1500.00,
        "order_count": 5
      }
    ],
    "top_products": [
      {
        "product_id": 1,
        "name": "Laptop",
        "quantity_sold": 50,
        "revenue": 49999.50
      }
    ],
    "top_customers": [
      {
        "customer_id": 5,
        "name": "John Doe",
        "email": "john@example.com",
        "total_spent": 5000.00,
        "order_count": 5
      }
    ],
    "revenue_trend": [
      {
        "date": "2025-11-01",
        "daily_revenue": 1500.00,
        "cumulative_revenue": 1500.00
      }
    ]
  }
}
```

---

## 📂 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   └── server.ts
│   ├── controllers/
│   │   ├── orders.controller.ts
│   │   ├── products.controller.ts
│   │   └── analytics.controller.ts
│   ├── services/
│   │   ├── orders.service.ts
│   │   ├── products.service.ts
│   │   └── analytics.service.ts
│   ├── routes/
│   │   ├── orders.routes.ts
│   │   ├── products.routes.ts
│   │   └── analytics.routes.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── validation.ts
│   └── server.ts
├── dist/
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Development

### Scripts
```bash
npm run dev      # Start development server with hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Start production server
npm run migrate  # Run database migrations
npm run lint     # Run ESLint
```

---

## 🚀 Deployment

### Railway.app (Recommended)
```bash
1. Push code to GitHub
2. Connect GitHub repo to Railway
3. Add MySQL database
4. Set environment variables
5. Deploy
```

See [DEPLOYMENT-FREE-GUIDE.md](./DEPLOYMENT-FREE-GUIDE.md) for detailed instructions.

---

## 📝 API Error Codes

| Code | Message | Meaning |
|------|---------|---------|
| 400 | Bad Request | Invalid parameters |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

---

## 🔐 Security

- ✅ Input validation
- ✅ Error handling
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS configured
- ✅ Environment variables for secrets

---

## 📞 Support

For issues or questions:
1. Check API documentation
2. Review error messages
3. Check backend logs
4. Contact development team

---

## 📄 License

MIT License - See LICENSE file

---

## 👨‍💻 Author

Built with ❤️ using Node.js + Express + TypeScript
