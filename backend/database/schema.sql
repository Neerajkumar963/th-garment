-- Garment ERP Database Schema
-- Drop existing database if needed and create fresh
DROP DATABASE IF EXISTS garment_erp;
CREATE DATABASE garment_erp;
USE garment_erp;

-- 1. Cloth Type Table
CREATE TABLE cloth_type (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Cloth Stock Table
CREATE TABLE cloth_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cloth_type_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'meters',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (cloth_type_id) REFERENCES cloth_type(id)
);

-- 3. Cloth Cutting Queue Table
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

-- 4. Cut Stock Table
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

-- 5. Processing Stage Reference Table
CREATE TABLE processing_stage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stage_name VARCHAR(100) NOT NULL UNIQUE,
    stage_order INT NOT NULL UNIQUE,
    description TEXT
);

-- Insert fixed processing stages
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

-- 6. Processing Table
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

-- 7. Selling Stock Table
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

-- 8. Dead Stock Table
CREATE TABLE dead_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_name VARCHAR(200) NOT NULL,
    size VARCHAR(50),
    quantity INT NOT NULL,
    reason TEXT,
    moved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL
);

-- 9. Orders Table
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

-- 10. Order Details Table
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

-- 11. Barcode Details Table
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
