const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' }); // Adjust path if needed

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'th_garments'
};

async function migrate() {
    let connection;
    try {
        console.log("Connecting to database...");
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected.");

        console.log("Checking if fabric_used column exists in cutting_details...");
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cutting_details' AND COLUMN_NAME = 'fabric_used'
        `, [dbConfig.database]);

        if (columns.length > 0) {
            console.log("Column 'fabric_used' already exists.");
        } else {
            console.log("Adding 'fabric_used' column...");
            await connection.query(`
                ALTER TABLE cutting_details
                ADD COLUMN fabric_used DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER bal_cloth
            `);
            console.log("Column added successfully.");
        }

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
