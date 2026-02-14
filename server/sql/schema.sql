CREATE DATABASE IF NOT EXISTS th_garments 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE th_garments;

-- ============================================
-- SECTION 1: CLOTH/FABRIC INVENTORY
-- ============================================

DROP TABLE IF EXISTS cloth_quantity;
DROP TABLE IF EXISTS cloth_detail;
DROP TABLE IF EXISTS quality;
DROP TABLE IF EXISTS design;
DROP TABLE IF EXISTS colors;
DROP TABLE IF EXISTS cloth_type;

CREATE TABLE cloth_type (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(100) NOT NULL,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE colors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    color_name VARCHAR(50) NOT NULL,
    applicability VARCHAR(255),
    INDEX idx_color_name (color_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE design (
    id INT PRIMARY KEY AUTO_INCREMENT,
    design_name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE quality (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quality_name VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cloth_detail (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cloth_type_id INT NOT NULL,
    color_id INT NOT NULL,
    design_id INT NOT NULL,
    quality_id INT NOT NULL,
    total_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cloth_type_id) REFERENCES cloth_type(id),
    FOREIGN KEY (color_id) REFERENCES colors(id),
    FOREIGN KEY (design_id) REFERENCES design(id),
    FOREIGN KEY (quality_id) REFERENCES quality(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cloth_quantity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cloth_detail_id INT NOT NULL,
    roll_length DECIMAL(10,2) NOT NULL,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cloth_detail_id) REFERENCES cloth_detail(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SECTION 2: EMPLOYEE MANAGEMENT
-- ============================================

DROP TABLE IF EXISTS attendance_log;
DROP TABLE IF EXISTS emp_account;
DROP TABLE IF EXISTS emp_details;
DROP TABLE IF EXISTS emp_roles;

CREATE TABLE emp_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE emp_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    adhaar VARCHAR(12) UNIQUE,
    role_id INT NOT NULL,
    phone VARCHAR(15),
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES emp_roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE emp_account (
    id INT PRIMARY KEY AUTO_INCREMENT,
    emp_id INT NOT NULL,
    transaction ENUM('DR', 'CR') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    mode ENUM('Cash', 'Online', 'Kind') NOT NULL,
    remarks TEXT,
    datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emp_id) REFERENCES emp_details(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE attendance_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    emp_id INT NOT NULL,
    attendance_details VARCHAR(50) NOT NULL,
    day_rate DECIMAL(10,2),
    remarks TEXT,
    created_on DATE NOT NULL,
    FOREIGN KEY (emp_id) REFERENCES emp_details(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SECTION 3: ITEMS/PRODUCTS
-- ============================================

DROP TABLE IF EXISTS items;

CREATE TABLE items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(5) NOT NULL UNIQUE,
    item_type ENUM('tailor_made', 'ready_made') NOT NULL,
    gender ENUM('M', 'F', 'U') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SECTION 4: ORGANIZATION/CLIENT MANAGEMENT
-- ============================================

DROP TABLE IF EXISTS price_list;
DROP TABLE IF EXISTS label_stock;
DROP TABLE IF EXISTS labelling;
DROP TABLE IF EXISTS org_dress_extension;
DROP TABLE IF EXISTS org_dress;
DROP TABLE IF EXISTS org_account;
DROP TABLE IF EXISTS organization;

CREATE TABLE organization (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    org_name VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(100),
    gstin VARCHAR(15),
    adhaar VARCHAR(12),
    branch VARCHAR(100),
    org_type VARCHAR(50),
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE org_account (
    id INT PRIMARY KEY AUTO_INCREMENT,
    org_id INT NOT NULL,
    transaction ENUM('DR', 'CR') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    mode ENUM('Cash', 'Online', 'Supply') NOT NULL,
    remarks TEXT,
    datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organization(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE org_dress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    org_dress_name VARCHAR(255) NOT NULL,
    org_id INT NOT NULL,
    item_id INT NOT NULL,
    color_id INT NOT NULL,
    material_req DECIMAL(10,2) NOT NULL,
    processing_rate DECIMAL(10,2) NOT NULL,
    remarks TEXT,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organization(id),
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (color_id) REFERENCES colors(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE org_dress_extension (
    id INT PRIMARY KEY AUTO_INCREMENT,
    org_dress_id INT NOT NULL,
    color VARCHAR(50) NOT NULL,
    extension_detail TEXT,
    FOREIGN KEY (org_dress_id) REFERENCES org_dress(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE labelling (
    id INT PRIMARY KEY AUTO_INCREMENT,
    org_dress_id INT NOT NULL,
    label_type VARCHAR(100) NOT NULL,
    FOREIGN KEY (org_dress_id) REFERENCES org_dress(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE label_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    labelling_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (labelling_id) REFERENCES labelling(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE price_list (
    id INT PRIMARY KEY AUTO_INCREMENT,
    org_dress_id INT NOT NULL,
    size VARCHAR(10) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (org_dress_id) REFERENCES org_dress(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SECTION 5: ORDER MANAGEMENT
-- ============================================

DROP TABLE IF EXISTS order_details;
DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    org_id INT NOT NULL,
    branch VARCHAR(100),
    date DATE NOT NULL,
    order_type VARCHAR(50),
    advance DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    remarks TEXT,
    eta DATE,
    customer_details TEXT,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organization(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    org_dress_id INT NOT NULL,
    sq JSON NOT NULL,
    customization TEXT,
    remarks TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (org_dress_id) REFERENCES org_dress(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SECTION 6: PRODUCTION - CUTTING
-- ============================================

DROP TABLE IF EXISTS cut_stock;
DROP TABLE IF EXISTS cutting_details;
DROP TABLE IF EXISTS cutting_process;
DROP TABLE IF EXISTS patterns;

CREATE TABLE patterns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pattern_series VARCHAR(50) NOT NULL,
    item_id INT NOT NULL,
    size VARCHAR(10) NOT NULL,
    description TEXT,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cutting_process (
    id INT PRIMARY KEY AUTO_INCREMENT,
    emp_id INT NOT NULL,
    org_dress_id INT NOT NULL,
    order_id INT NOT NULL,
    sq JSON NOT NULL,
    pattern_series VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Pending',
    remarks TEXT,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (emp_id) REFERENCES emp_details(id),
    FOREIGN KEY (org_dress_id) REFERENCES org_dress(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cutting_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cutting_process_id INT NOT NULL,
    cloth_quantity_id INT NOT NULL,
    bal_cloth DECIMAL(10,2) NOT NULL,
    cut_type ENUM('primary', 'secondary', 'pocket', 'kharcha') NOT NULL,
    cut_rate DECIMAL(10,2),
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cutting_process_id) REFERENCES cutting_process(id) ON DELETE CASCADE,
    FOREIGN KEY (cloth_quantity_id) REFERENCES cloth_quantity(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cut_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cutting_process_id INT NOT NULL,
    sq JSON NOT NULL,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cutting_process_id) REFERENCES cutting_process(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SECTION 7: PROCESSING STAGES
-- ============================================

DROP TABLE IF EXISTS processing;
DROP TABLE IF EXISTS process_stage;

CREATE TABLE process_stage (
    id INT PRIMARY KEY,
    stage_name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO process_stage (id, stage_name) VALUES
(0, 'Yet to Process'),
(1, 'Pasting and Elastic'),
(2, 'Stitching'),
(3, 'Overlock'),
(4, 'Kaaj Button'),
(5, 'Thaaga Cutting'),
(6, 'Labelling'),
(7, 'Press & Packing'),
(8, 'Processed');

CREATE TABLE processing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cut_stock_id INT NOT NULL,
    sq JSON NOT NULL,
    emp_id INT NOT NULL,
    stage_id INT NOT NULL,
    status ENUM('in_queue', 'in_process', 'processed') DEFAULT 'in_queue',
    remarks TEXT,
    processing_rate DECIMAL(10,2),
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cut_stock_id) REFERENCES cut_stock(id),
    FOREIGN KEY (emp_id) REFERENCES emp_details(id),
    FOREIGN KEY (stage_id) REFERENCES process_stage(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SECTION 8: SALES
-- ============================================

DROP TABLE IF EXISTS sales_detail;
DROP TABLE IF EXISTS sales_history;
DROP TABLE IF EXISTS selling_stock;

CREATE TABLE selling_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    org_dress_id INT NOT NULL,
    brand VARCHAR(100),
    size VARCHAR(10) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    remarks TEXT,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (org_dress_id) REFERENCES org_dress(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sales_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    barcode_id VARCHAR(50),
    organization VARCHAR(255),
    branch VARCHAR(100),
    supply_type ENUM('inward', 'outward') NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sales_detail (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sales_history_id INT NOT NULL,
    org_dress_id INT NOT NULL,
    barcode_id VARCHAR(50),
    size VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (sales_history_id) REFERENCES sales_history(id) ON DELETE CASCADE,
    FOREIGN KEY (org_dress_id) REFERENCES org_dress(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SECTION 9: RECEIPTS
-- ============================================

DROP TABLE IF EXISTS receipt_logs;
DROP TABLE IF EXISTS receipt_format;

CREATE TABLE receipt_format (
    id INT PRIMARY KEY AUTO_INCREMENT,
    receipt_type VARCHAR(100) NOT NULL,
    format_data TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE receipt_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    receipt_format_id INT NOT NULL,
    receipt_no VARCHAR(50) NOT NULL,
    receipt_details TEXT,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receipt_format_id) REFERENCES receipt_format(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- USERS TABLE FOR AUTHENTICATION
-- ============================================

DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
