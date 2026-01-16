import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

async function verifyDatabase() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'garment_erp'
    };

    try {
        const connection = await mysql.createConnection(config);
        console.log(`✅ Connected to database: ${config.database}`);

        const [clothTypes] = await connection.execute('SELECT COUNT(*) as count FROM cloth_type');
        console.log(`✅ Table 'cloth_type' exists. Row count: ${clothTypes[0].count}`);

        const [orders] = await connection.execute('SELECT COUNT(*) as count FROM orders');
        console.log(`✅ Table 'orders' exists. Row count: ${orders[0].count}`);

        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`✅ Total tables found: ${tables.length}`);

        await connection.end();
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

verifyDatabase();
