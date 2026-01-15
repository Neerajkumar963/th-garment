-- Sample Seed Data for Garment ERP
USE garment_erp;

-- Seed Cloth Types
INSERT INTO cloth_type (name, description) VALUES
('Cotton', 'Pure cotton fabric'),
('Silk', 'Premium silk fabric'),
('Polyester', 'Synthetic polyester fabric'),
('Linen', 'Natural linen fabric'),
('Denim', 'Heavy denim fabric');

-- Seed Cloth Stock
INSERT INTO cloth_stock (cloth_type_id, quantity, unit) VALUES
(1, 500.00, 'meters'),
(2, 200.00, 'meters'),
(3, 350.00, 'meters'),
(4, 150.00, 'meters'),
(5, 400.00, 'meters');

-- Seed Cutting Queue (some completed, some pending)
INSERT INTO cloth_cutting (org_dress_name, design, size, quantity, cloth_type_id, cloth_used, status, queued_date, completed_date) VALUES
('Shirt A', 'Casual Check', 'M', 20, 1, 30.00, 'completed', '2026-01-10 10:00:00', '2026-01-10 15:00:00'),
('Shirt A', 'Casual Check', 'L', 15, 1, 25.00, 'completed', '2026-01-10 10:00:00', '2026-01-10 15:00:00'),
('Dress B', 'Floral Print', 'S', 10, 2, 20.00, 'completed', '2026-01-11 09:00:00', '2026-01-11 14:00:00'),
('Pants C', 'Formal Black', 'M', 25, 5, 40.00, 'queued', '2026-01-14 11:00:00', NULL),
('Shirt D', 'Striped Blue', 'L', 18, 3, 28.00, 'queued', '2026-01-15 08:00:00', NULL);

-- Seed Cut Stock (from completed cuttings)
INSERT INTO cut_stock (cutting_id, org_dress_name, design, size, quantity, status, created_at) VALUES
(1, 'Shirt A', 'Casual Check', 'M', 20, 'in_processing', '2026-01-10 15:00:00'),
(2, 'Shirt A', 'Casual Check', 'L', 15, 'available', '2026-01-10 15:00:00'),
(3, 'Dress B', 'Floral Print', 'S', 10, 'processed', '2026-01-11 14:00:00');

-- Seed Processing (active items)
INSERT INTO processing (cut_stock_id, org_dress_name, size, quantity, current_stage_id, current_stage_name, date_given, is_completed) VALUES
(1, 'Shirt A', 'M', 20, 3, 'Kaj Button', '2026-01-11 09:00:00', FALSE);

-- Seed Selling Stock (processed items)
INSERT INTO selling_stock (processing_id, org_dress_name, design, size, quantity, status, created_at) VALUES
(1, 'Shirt A', 'Casual Check', 'M', 20, 'available', '2026-01-13 10:00:00');

-- Seed Orders
INSERT INTO orders (customer_name, customer_phone, customer_address, status, total_quantity, remarks, order_date, delivery_date) VALUES
('John Doe', '9876543210', '123 Main St, City', 'pending', 5, 'Urgent delivery needed', '2026-01-14 10:00:00', NULL),
('Jane Smith', '9876543211', '456 Oak Ave, Town', 'in-process', 10, 'Regular customer', '2026-01-13 14:00:00', NULL),
('Mike Johnson', '9876543212', '789 Pine Rd, Village', 'delivered', 8, 'Paid in advance', '2026-01-10 09:00:00', '2026-01-12 16:00:00');

-- Seed Order Details
INSERT INTO order_details (order_id, org_dress_name, design, size, quantity, selling_stock_id) VALUES
(1, 'Shirt A', 'Casual Check', 'M', 5, 1),
(2, 'Shirt A', 'Casual Check', 'L', 10, NULL),
(3, 'Dress B', 'Floral Print', 'S', 8, NULL);

-- Seed Dead Stock
INSERT INTO dead_stock (item_name, size, quantity, reason, moved_date) VALUES
('Shirt X', 'XL', 5, 'Defective stitching', '2026-01-12 11:00:00'),
('Dress Y', 'M', 3, 'Color fading issue', '2026-01-11 15:00:00');
