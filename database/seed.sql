USE simple_orders;

-- Insert customers
INSERT INTO customers (name, email, phone, address) VALUES
('John Doe', 'john.doe@example.com', '+1-555-0101', '123 Main St, New York, NY 10001'),
('Jane Smith', 'jane.smith@example.com', '+1-555-0102', '456 Oak Ave, Los Angeles, CA 90001'),
('Bob Johnson', 'bob.johnson@example.com', '+1-555-0103', '789 Pine Rd, Chicago, IL 60601'),
('Alice Williams', 'alice.williams@example.com', '+1-555-0104', '321 Elm St, Houston, TX 77001'),
('Charlie Brown', 'charlie.brown@example.com', '+1-555-0105', '654 Maple Dr, Phoenix, AZ 85001');

-- Insert products
INSERT INTO products (name, description, price, stock_quantity, sku, category, is_active) VALUES
('Laptop Pro 15"', 'High-performance laptop with 16GB RAM', 1299.99, 50, 'LAPTOP-001', 'Electronics', TRUE),
('Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 29.99, 200, 'MOUSE-001', 'Accessories', TRUE),
('USB-C Cable 2m', 'Fast charging USB-C to USB-C cable', 19.99, 500, 'CABLE-001', 'Accessories', TRUE),
('Mechanical Keyboard', 'RGB mechanical keyboard with blue switches', 149.99, 75, 'KEYB-001', 'Accessories', TRUE),
('27" Monitor', '4K UHD monitor with HDR support', 449.99, 30, 'MON-001', 'Electronics', TRUE),
('Webcam HD', '1080p webcam with built-in microphone', 79.99, 120, 'CAM-001', 'Electronics', TRUE),
('Desk Lamp LED', 'Adjustable LED desk lamp with USB charging', 39.99, 150, 'LAMP-001', 'Office', TRUE),
('Notebook Pack', 'Pack of 5 professional notebooks', 24.99, 300, 'NOTE-001', 'Office', TRUE),
('Wireless Headphones', 'Noise-cancelling Bluetooth headphones', 199.99, 60, 'HEAD-001', 'Electronics', TRUE),
('Phone Stand', 'Adjustable aluminum phone stand', 15.99, 250, 'STAND-001', 'Accessories', TRUE);

-- Insert orders
INSERT INTO orders (customer_id, order_number, status, total_amount, payment_status, payment_method, shipping_address) VALUES
(1, 'ORD-2024-0001', 'delivered', 1349.98, 'paid', 'credit_card', '123 Main St, New York, NY 10001'),
(2, 'ORD-2024-0002', 'shipped', 229.98, 'paid', 'paypal', '456 Oak Ave, Los Angeles, CA 90001'),
(3, 'ORD-2024-0003', 'processing', 469.98, 'paid', 'credit_card', '789 Pine Rd, Chicago, IL 60601'),
(1, 'ORD-2024-0004', 'confirmed', 79.99, 'paid', 'credit_card', '123 Main St, New York, NY 10001'),
(4, 'ORD-2024-0005', 'pending', 1749.97, 'pending', 'bank_transfer', '321 Elm St, Houston, TX 77001'),
(5, 'ORD-2024-0006', 'delivered', 64.98, 'paid', 'credit_card', '654 Maple Dr, Phoenix, AZ 85001'),
(2, 'ORD-2024-0007', 'cancelled', 149.99, 'refunded', 'paypal', '456 Oak Ave, Los Angeles, CA 90001'),
(3, 'ORD-2024-0008', 'processing', 199.99, 'paid', 'credit_card', '789 Pine Rd, Chicago, IL 60601');

-- Insert order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
-- Order 1
(1, 1, 1, 1299.99, 1299.99),
(1, 2, 1, 29.99, 29.99),
(1, 3, 1, 19.99, 19.99),
-- Order 2
(2, 4, 1, 149.99, 149.99),
(2, 2, 1, 29.99, 29.99),
(2, 10, 3, 15.99, 47.97),
-- Order 3
(3, 5, 1, 449.99, 449.99),
(3, 3, 1, 19.99, 19.99),
-- Order 4
(4, 6, 1, 79.99, 79.99),
-- Order 5
(5, 1, 1, 1299.99, 1299.99),
(5, 5, 1, 449.99, 449.99),
-- Order 6
(6, 7, 1, 39.99, 39.99),
(6, 8, 1, 24.99, 24.99),
-- Order 7 (cancelled)
(7, 4, 1, 149.99, 149.99),
-- Order 8
(8, 9, 1, 199.99, 199.99);

-- Insert audit logs
INSERT INTO audit_logs (order_id, action, old_value, new_value, changed_by) VALUES
(1, 'status_change', 'pending', 'confirmed', 'system'),
(1, 'status_change', 'confirmed', 'shipped', 'admin'),
(1, 'status_change', 'shipped', 'delivered', 'system'),
(2, 'status_change', 'pending', 'confirmed', 'system'),
(2, 'status_change', 'confirmed', 'shipped', 'admin'),
(7, 'status_change', 'pending', 'cancelled', 'customer'),
(7, 'payment_status_change', 'paid', 'refunded', 'admin');

-- Insert inventory transactions
INSERT INTO inventory_transactions (product_id, order_id, transaction_type, quantity_change, stock_after, notes) VALUES
(1, 1, 'sale', -1, 49, 'Sold via order ORD-2024-0001'),
(2, 1, 'sale', -1, 199, 'Sold via order ORD-2024-0001'),
(4, 2, 'sale', -1, 74, 'Sold via order ORD-2024-0002'),
(5, 3, 'sale', -1, 29, 'Sold via order ORD-2024-0003'),
(4, 7, 'return', 1, 75, 'Returned from cancelled order ORD-2024-0007');
