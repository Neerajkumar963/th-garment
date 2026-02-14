const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/database');

async function migrate() {
    try {
        const connection = await db.getConnection();
        console.log("Connected to DB");

        await connection.query(`
            CREATE TABLE IF NOT EXISTS delivery_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                quantity INT NOT NULL,
                packed_at DATETIME,
                delivered_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `);
        console.log("delivery_history table created/verified.");

        // Add delivered_qty to orders if not exists (optional, can calculate from history)
        // Let's stick to calculating from history to avoid sync issues.

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

migrate();
