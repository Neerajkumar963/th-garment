
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'garment_erp'
};

async function checkCutStockSchema() {
    const connection = await mysql.createConnection(config);
    try {
        console.log('Checking cut_stock table schema...');

        // Check if column exists
        const [columns] = await connection.execute(`
      SHOW COLUMNS FROM cut_stock LIKE 'deleted_at'
    `);

        if (columns.length === 0) {
            console.log('❌ Column deleted_at missing in cut_stock.');
        } else {
            console.log('✅ Column deleted_at exists in cut_stock.');
        }

    } catch (error) {
        console.error('Check Failed:', error.message);
    } finally {
        await connection.end();
    }
}

checkCutStockSchema();
