
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'garment_erp'
};

async function fixProcessingSchema() {
    const connection = await mysql.createConnection(config);
    try {
        console.log('Checking processing table schema...');

        // Check if column exists
        const [columns] = await connection.execute(`
      SHOW COLUMNS FROM processing LIKE 'deleted_at'
    `);

        if (columns.length === 0) {
            console.log('Column deleted_at missing. Adding it...');
            await connection.execute(`
        ALTER TABLE processing
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
      `);
            console.log('✅ Added deleted_at column to processing table.');
        } else {
            console.log('✅ Column deleted_at already exists in processing table.');
        }

    } catch (error) {
        console.error('❌ Schema Fix Failed:', error.message);
    } finally {
        await connection.end();
    }
}

fixProcessingSchema();
