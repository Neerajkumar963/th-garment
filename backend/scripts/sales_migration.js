import db from '../config/database.js';

async function runMigration() {
  const connection = await db.getConnection();
  
  try {
    console.log('Starting Sales tables migration...');
    await connection.beginTransaction();

    // 1. Create Sales Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales (
          id INT PRIMARY KEY AUTO_INCREMENT,
          sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          customer_name VARCHAR(200) DEFAULT 'Walk-in Customer',
          total_amount DECIMAL(10,2) DEFAULT 0.00,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP NULL DEFAULT NULL
      )
    `);
    console.log('Created sales table');

    // 2. Create Sale Items Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
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
      )
    `);
    console.log('Created sale_items table');

    await connection.commit();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    await connection.rollback();
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
}

runMigration();
