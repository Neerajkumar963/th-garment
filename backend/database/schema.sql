-- Garment ERP Database Schema
-- Version: 2.0
-- Updated: 2026-01-17
-- Description: Consolidated schema including Core, Job Work, and Sales modules

-- Drop existing database if needed and create fresh
DROP DATABASE IF EXISTS garment_erp;
CREATE DATABASE garment_erp;
USE garment_erp;

-- =====================================================
-- 1. CORE MASTER TABLES
-- =====================================================

-- Cloth Type Table
CREATE TABLE cloth_type (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fabricators Master Table
CREATE TABLE fabricators (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(200),
    phone VARCHAR(20),
    address TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_status (status),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ready Items Master Table
CREATE TABLE ready_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Processing Stage Reference Table
CREATE TABLE processing_stage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stage_name VARCHAR(100) NOT NULL UNIQUE,
    stage_order INT NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO processing_stage (stage_name, stage_order, description) VALUES
('Design & Cut', 1, 'Initial design and cutting stage'),
('Stitching', 2, 'Sewing and stitching process'),
('Kaj Button', 3, 'Button attachment'),
('Washing', 4, 'Washing process'),
('Thread Cutting', 5, 'Thread trimming'),
('Press & Packing', 6, 'Ironing and packing'),
('Label Tag', 7, 'Label attachment'),
('Fabrication', 8, 'Final fabrication'),
('Processed', 9, 'Completed and ready');

-- =====================================================
-- 2. STOCK & PRODUCTION TABLES
-- =====================================================

-- Cloth Stock Table
CREATE TABLE cloth_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cloth_type_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'meters',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (cloth_type_id) REFERENCES cloth_type(id)
);

-- Cloth Cutting Queue Table
CREATE TABLE cloth_cutting (
    id INT PRIMARY KEY AUTO_INCREMENT,
    org_dress_name VARCHAR(200) NOT NULL,
    design VARCHAR(200) NOT NULL,
    size VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    cloth_type_id INT NOT NULL,
    cloth_used DECIMAL(10,2) NOT NULL,
    status ENUM('queued', 'completed') DEFAULT 'queued',
    queued_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (cloth_type_id) REFERENCES cloth_type(id),
    INDEX idx_status (status)
);

-- Cut Stock Table
CREATE TABLE cut_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cutting_id INT NOT NULL,
    org_dress_name VARCHAR(200) NOT NULL,
    design VARCHAR(200) NOT NULL,
    size VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    status ENUM('available', 'in_processing', 'processed') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (cutting_id) REFERENCES cloth_cutting(id),
    INDEX idx_status (status)
);

-- Processing Table (Self Processing)
CREATE TABLE processing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cut_stock_id INT NOT NULL,
    org_dress_name VARCHAR(200) NOT NULL,
    size VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    current_stage_id INT NOT NULL,
    current_stage_name VARCHAR(100) NOT NULL,
    date_given TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_stage_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (cut_stock_id) REFERENCES cut_stock(id),
    FOREIGN KEY (current_stage_id) REFERENCES processing_stage(id),
    INDEX idx_stage (current_stage_id),
    INDEX idx_completed (is_completed)
);

-- Job Works Main Table (External Processing)
CREATE TABLE job_works (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_number VARCHAR(50) UNIQUE NOT NULL,
    fabricator_id INT NOT NULL,
    cloth_type_id INT NOT NULL,
    org_dress_name VARCHAR(200) NOT NULL,
    design VARCHAR(200) NOT NULL,
    cloth_used_per_piece DECIMAL(10,2) NOT NULL COMMENT 'Cloth in meters used per piece',
    total_issued_qty INT NOT NULL DEFAULT 0 COMMENT 'Total pieces issued across all sizes',
    total_received_qty INT NOT NULL DEFAULT 0 COMMENT 'Total pieces received back',
    total_dead_qty INT NOT NULL DEFAULT 0 COMMENT 'Total pieces marked as dead/loss',
    total_pending_qty INT NOT NULL DEFAULT 0 COMMENT 'Auto-calculated pending quantity',
    status ENUM('issued', 'partially_received', 'completed') DEFAULT 'issued',
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (fabricator_id) REFERENCES fabricators(id),
    FOREIGN KEY (cloth_type_id) REFERENCES cloth_type(id),
    INDEX idx_status (status),
    INDEX idx_fabricator (fabricator_id),
    INDEX idx_job_number (job_number),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Job Work Size-wise Breakdown
CREATE TABLE job_work_sizes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_work_id INT NOT NULL,
    size VARCHAR(50) NOT NULL,
    issued_qty INT NOT NULL DEFAULT 0,
    received_qty INT NOT NULL DEFAULT 0,
    dead_qty INT NOT NULL DEFAULT 0,
    pending_qty INT NOT NULL DEFAULT 0 COMMENT 'Auto-calculated: issued - received - dead',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_work_id) REFERENCES job_works(id) ON DELETE CASCADE,
    INDEX idx_job_work (job_work_id),
    UNIQUE KEY unique_job_size (job_work_id, size)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Job Work History (Audit Trail)
CREATE TABLE job_work_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_work_id INT NOT NULL,
    action ENUM('issued', 'received', 'marked_dead', 'completed') NOT NULL,
    details JSON COMMENT 'Size-wise quantities and other details',
    performed_by VARCHAR(100) COMMENT 'User who performed the action',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_work_id) REFERENCES job_works(id) ON DELETE CASCADE,
    INDEX idx_job_work (job_work_id),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. INVENTORY & SALES TABLES
-- =====================================================

-- Ready Item Stock Table
CREATE TABLE ready_item_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ready_item_id INT NOT NULL,
    size VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    status ENUM('available', 'reserved', 'sold') DEFAULT 'available',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (ready_item_id) REFERENCES ready_items(id),
    INDEX idx_ready_item (ready_item_id),
    INDEX idx_status (status),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Finished Goods Stock Table (Consolidated)
CREATE TABLE finished_goods_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    org_dress_name VARCHAR(200) NOT NULL,
    design VARCHAR(200) NOT NULL,
    size VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    source ENUM('self_processing', 'job_work', 'ready_item') NOT NULL,
    source_id INT NOT NULL COMMENT 'Reference to processing.id, job_work_sizes.id, or ready_item_stock.id',
    status ENUM('available', 'reserved', 'sold') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_status (status),
    INDEX idx_source (source, source_id),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Selling Stock Table (Legacy/Specific Use)
CREATE TABLE selling_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    processing_id INT NOT NULL,
    org_dress_name VARCHAR(200) NOT NULL,
    design VARCHAR(200) NOT NULL,
    size VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    status ENUM('available', 'reserved', 'sold') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (processing_id) REFERENCES processing(id),
    INDEX idx_status (status)
);

-- Dead Stock Table
CREATE TABLE dead_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_name VARCHAR(200) NOT NULL,
    size VARCHAR(50),
    quantity INT NOT NULL,
    reason TEXT,
    source ENUM('self_processing', 'job_work', 'ready_item', 'cutting', 'other') DEFAULT 'other',
    source_id INT NULL COMMENT 'Reference to source record',
    moved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_source (source)
);

-- =====================================================
-- 4. ORDER & SALES TABLES
-- =====================================================

-- Orders Table
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(20),
    customer_address TEXT,
    status ENUM('pending', 'in-process', 'ready', 'delivered') DEFAULT 'pending',
    total_quantity INT NOT NULL DEFAULT 0,
    remarks TEXT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_date TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_status (status)
);

-- Order Details Table
CREATE TABLE order_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    org_dress_name VARCHAR(200) NOT NULL,
    design VARCHAR(200) NOT NULL,
    size VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    selling_stock_id INT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (selling_stock_id) REFERENCES selling_stock(id)
);

-- Barcode Details Table
CREATE TABLE barcode_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    selling_stock_id INT NOT NULL,
    org_dress_name VARCHAR(200) NOT NULL,
    size VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (selling_stock_id) REFERENCES selling_stock(id),
    INDEX idx_barcode (barcode)
);

-- Sales Table
CREATE TABLE sales (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_name VARCHAR(200) DEFAULT 'Walk-in Customer',
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL
);

-- Sale Items Table
CREATE TABLE sale_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sale_id INT NOT NULL,
    stock_type ENUM('selling_stock', 'finished_goods_stock') NOT NULL,
    stock_id INT NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    size VARCHAR(50),
    quantity INT NOT NULL,
    price_per_unit DECIMAL(10,2) DEFAULT 0.00,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);
