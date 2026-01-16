
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'garment_erp'
};

const tablesToCheck = [
    'cloth_stock',
    'selling_stock',
    'orders'
];

async function fixAllSchemas() {
    const connection = await mysql.createConnection(config);
    try {
        console.log('Running comprehensive schema check...');

        for (const table of tablesToCheck) {
            try {
                // Check if table exists first
                const [tables] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
                if (tables.length === 0) {
                    console.log(`⚠️ Table '${table}' does not exist. Skipping.`);
                    continue;
                }

                // Check column
                const [columns] = await connection.execute(`
                SHOW COLUMNS FROM ${table} LIKE 'deleted_at'
            `);

                if (columns.length === 0) {
                    console.log(`🔧 Adding deleted_at to '${table}'...`);
                    await connection.execute(`
                    ALTER TABLE ${table}
                    ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
                `);
                    console.log(`✅ Fixed '${table}'.`);
                } else {
                    console.log(`✅ '${table}' is already correct.`);
                }
            } catch (err) {
                console.error(`❌ Error checking '${table}':`, err.message);
            }
        }

    } catch (error) {
        console.error('Global Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixAllSchemas();
