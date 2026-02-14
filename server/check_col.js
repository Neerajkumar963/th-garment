const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' }); // Adjust path if needed

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'th_garments'
};

async function checkColumn() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cutting_details' AND COLUMN_NAME = 'fabric_used'
        `, [dbConfig.database]);

        if (columns.length > 0) {
            console.log("EXISTS");
        } else {
            console.log("MISSING");
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        if (connection) await connection.end();
    }
}

checkColumn();
