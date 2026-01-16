
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'garment_erp'
};

async function fixCutStockSchema() {
    const connection = await mysql.createConnection(config);
    try {
        console.log('Fixing cut_stock table schema...');

        await connection.execute(`
      ALTER TABLE cut_stock
      ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
    `);
        console.log('✅ Added deleted_at column to cut_stock table.');

    } catch (error) {
        // Ignore if duplicate column
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('✅ Column already exists.');
        } else {
            console.error('❌ Schema Fix Failed:', error.message);
        }
    } finally {
        await connection.end();
    }
}

fixCutStockSchema();
