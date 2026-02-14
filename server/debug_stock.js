const db = require('./config/database');

async function checkStock() {
    try {
        console.log("Checking Stock #16...");
        const [stock] = await db.query('SELECT * FROM cut_stock WHERE id = 16');
        console.log('Stock Entry:', stock);

        if (stock.length > 0) {
            const [proc] = await db.query('SELECT * FROM processing WHERE cut_stock_id = 16');
            console.log('Processing Entries:', proc);

            const [cuttingProc] = await db.query('SELECT * FROM cutting_process WHERE id = ?', [stock[0].cutting_process_id]);
            // console.log('Origin Cutting Process:', cuttingProc);
            
            if (cuttingProc.length > 0) {
                const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [cuttingProc[0].order_id]);
                const [org] = await db.query('SELECT * FROM organization WHERE id = ?', [orders[0].org_id]);
                console.log('Organization:', org[0].org_name);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkStock();
