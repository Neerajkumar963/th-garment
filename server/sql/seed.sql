-- Seed Data
USE th_garments;

-- Cloth Types
INSERT INTO cloth_type (type) VALUES 
('Cotton'),
('Linen'),
('Polyester'),
('Silk'),
('Wool');

-- Colors
INSERT INTO colors (color_name, applicability) VALUES 
('Red', 'Universal'),
('Blue', 'Universal'),
('Green', 'Universal'),
('Black', 'Universal'),
('White', 'Universal');

-- Design
INSERT INTO design (design_name) VALUES 
('Plain'),
('Striped'),
('Checked'),
('Printed');

-- Quality
INSERT INTO quality (quality_name) VALUES 
('Premium'),
('Standard'),
('Economy');

-- Items
INSERT INTO items (name, symbol, item_type, gender) VALUES 
('Shirt', 'SH', 'ready_made', 'M'),
('Pant', 'PT', 'ready_made', 'M'),
('Kurta', 'KT', 'tailor_made', 'F'),
('Suit', 'ST', 'tailor_made', 'M');

-- Employee Roles
INSERT INTO emp_roles (role) VALUES 
('Manager'),
('Cutter'),
('Stitcher'),
('Helper'),
('Fabricator');

-- Default Admin User
-- Password: 'admin123'
-- Hash generated via bcryptjs
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@thgarments.com', '$2a$10$Tvw8sS1taGoUY7eru/1/Ne0gqnO1p93OR0Xzrc6m2HntF3qfSU/Tu', 'admin');
-- Updated Hash for 'admin123': $2a$10$0167cle4R1QXD58Af9W3TelYoUTPsq076spaTnQvwnyOK6Kfos.vm
UPDATE users SET password = '$2a$10$0167cle4R1QXD58Af9W3TelYoUTPsq076spaTnQvwnyOK6Kfos.vm' WHERE email = 'admin@thgarments.com';
