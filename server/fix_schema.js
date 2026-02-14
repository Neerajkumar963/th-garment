const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/database');

async function fixSchema() {
    try {
        const connection = await db.getConnection();
        console.log("Connected to DB");

        // 1. Fix 'orders' table - Add 'dispatch_status'
        console.log("Checking 'orders' table for 'dispatch_status'...");
        const [columns] = await connection.query(`SHOW COLUMNS FROM orders LIKE 'dispatch_status'`);
        
        if (columns.length === 0) {
            console.log("Adding 'dispatch_status' column...");
            await connection.query(`ALTER TABLE orders ADD COLUMN dispatch_status VARCHAR(50) DEFAULT 'Pending'`);
            console.log("✅ 'dispatch_status' column added.");
        } else {
            console.log("ℹ️ 'dispatch_status' column already exists.");
        }

        process.exit(0);
    } catch (e) {
        console.error("❌ Schema Fix Failed:", e);
        process.exit(1);
    }
}

fixSchema();
