-- Soft Delete Migration for Orders
-- Run this in MySQL to add soft delete support

USE garment_erp;

-- Add deleted_at column to orders table
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Add deleted_at column to order_details table (cascade delete)
ALTER TABLE order_details ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Add index for performance
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at);

-- Verify changes
DESCRIBE orders;
DESCRIBE order_details;
