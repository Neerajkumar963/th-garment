-- Soft Delete Migration Phase 2
-- Add deleted_at column to all remaining tables

USE garment_erp;

-- Stock Tables
ALTER TABLE cloth_stock ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE cut_stock ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE selling_stock ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE dead_stock ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Workflow Tables
ALTER TABLE cloth_cutting ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE processing ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Indexes for performance
CREATE INDEX idx_cloth_stock_deleted_at ON cloth_stock(deleted_at);
CREATE INDEX idx_cut_stock_deleted_at ON cut_stock(deleted_at);
CREATE INDEX idx_selling_stock_deleted_at ON selling_stock(deleted_at);
CREATE INDEX idx_dead_stock_deleted_at ON dead_stock(deleted_at);
CREATE INDEX idx_cloth_cutting_deleted_at ON cloth_cutting(deleted_at);
CREATE INDEX idx_processing_deleted_at ON processing(deleted_at);

-- Describe to verify
DESCRIBE cloth_stock;
