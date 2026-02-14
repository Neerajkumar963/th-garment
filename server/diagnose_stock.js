const db = require('./config/database');
require('dotenv').config();

async function check() {
    try {
        console.log('--- DATABASE CHECK ---');
        const [stock] = await db.query('SELECT org_dress_id, size, price, COUNT(*) as count FROM selling_stock GROUP BY org_dress_id, size, price');
        console.log('--- CURRENT STOCK RECORDS ---');
        console.dir(stock);

        const [sales] = await db.query('SELECT * FROM sales_history ORDER BY id DESC LIMIT 5');
        console.log('--- RECENT SALES ---');
        console.dir(sales);

        if (sales.length > 0) {
            const [details] = await db.query('SELECT * FROM sales_detail WHERE sales_history_id = ?', [sales[0].id]);
            console.log('--- LATEST SALE DETAILS ---');
            console.dir(details);
        }
        
        const [dresses] = await db.query('SELECT id, org_dress_name FROM org_dress');
        console.log('--- DRESSES ---');
        console.dir(dresses);

    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();
