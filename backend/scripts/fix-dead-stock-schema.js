
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'garment_erp'
};

async function fixDeadStockSchema() {
    const connection = await mysql.createConnection(config);
    try {
        console.log('Checking dead_stock table schema...');

        // Check if table exists
        const [tables] = await connection.execute("SHOW TABLES LIKE 'dead_stock'");
        if (tables.length === 0) {
            console.error("❌ Table 'dead_stock' not found!");
            return;
        }

        // Check if column exists
        const [columns] = await connection.execute(`
      SHOW COLUMNS FROM dead_stock LIKE 'deleted_at'
    `);

        if (columns.length === 0) {
            console.log('Column deleted_at missing. Adding it...');
            await connection.execute(`
        ALTER TABLE dead_stock
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
      `);
            console.log('✅ Added deleted_at column to dead_stock.');
        } else {
            console.log('✅ Column deleted_at already exists.');
        }

    } catch (error) {
        console.error('❌ Schema Fix Failed:', error.message);
    } finally {
        await connection.end();
    }
}

fixDeadStockSchema();
