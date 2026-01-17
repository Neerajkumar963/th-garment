-- =====================================================
-- FABRICATOR JOB WORK SYSTEM MIGRATION
-- Version: 1.0
-- Date: 2026-01-17
-- Description: Adds fabricator job work functionality
-- =====================================================

USE garment_erp;

-- =====================================================
-- 1. FABRICATORS MASTER TABLE
-- =====================================================
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

-- =====================================================
-- 2. JOB WORKS MAIN TABLE
-- =====================================================
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

-- =====================================================
-- 3. JOB WORK SIZE-WISE BREAKDOWN TABLE
-- =====================================================
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

-- =====================================================
-- 4. READY ITEMS MASTER TABLE
-- =====================================================
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

-- =====================================================
-- 5. READY ITEM STOCK TABLE
-- =====================================================
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

-- =====================================================
-- 6. FINISHED GOODS STOCK TABLE
-- =====================================================
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

-- =====================================================
-- 7. UPDATE DEAD STOCK TABLE TO TRACK SOURCE
-- =====================================================
ALTER TABLE dead_stock 
ADD COLUMN source ENUM('self_processing', 'job_work', 'ready_item', 'cutting', 'other') DEFAULT 'other' AFTER reason,
ADD COLUMN source_id INT NULL COMMENT 'Reference to source record' AFTER source,
ADD INDEX idx_source (source);

-- =====================================================
-- 8. CREATE JOB WORK HISTORY TABLE (AUDIT TRAIL)
-- =====================================================
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
-- VERIFY MIGRATION
-- =====================================================

-- Show all tables
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'garment_erp' 
ORDER BY TABLE_NAME;

-- Show foreign key relationships
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'garment_erp' 
AND REFERENCED_TABLE_NAME IS NOT NULL
AND TABLE_NAME IN ('fabricators', 'job_works', 'job_work_sizes', 'ready_items', 'ready_item_stock', 'finished_goods_stock')
ORDER BY TABLE_NAME, COLUMN_NAME;
