
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'garment_erp'
};

async function fixSchema() {
    const connection = await mysql.createConnection(config);
    try {
        console.log('Checking cloth_cutting table schema...');

        // Check if column exists
        const [columns] = await connection.execute(`
      SHOW COLUMNS FROM cloth_cutting LIKE 'deleted_at'
    `);

        if (columns.length === 0) {
            console.log('Column deleted_at missing. Adding it...');
            await connection.execute(`
        ALTER TABLE cloth_cutting
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
      `);
            console.log('✅ Added deleted_at column successfully.');
        } else {
            console.log('✅ Column deleted_at already exists.');
        }

    } catch (error) {
        console.error('❌ Schema Fix Failed:', error.message);
    } finally {
        await connection.end();
    }
}

fixSchema();
