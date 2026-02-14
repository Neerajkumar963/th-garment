const db = require('./config/database');

async function diagnose() {
    try {
        console.log("--- Diagnosing Cutting Processes 51 & 52 ---");
        
        const [processes] = await db.query('SELECT id, status, order_id, org_dress_id FROM cutting_process WHERE id IN (51, 52)');
        console.log('Cutting Processes:', processes);

        if (processes.length === 0) {
            console.log('No cutting processes found with these IDs.');
            return;
        }

        const [cutStock] = await db.query('SELECT * FROM cut_stock WHERE cutting_process_id IN (51, 52)');
        console.log('Linked Cut Stock Entries:', cutStock);

        if (cutStock.length > 0) {
            const stockIds = cutStock.map(cs => cs.id);
            console.log('Stock IDs:', stockIds);

            const [processing] = await db.query('SELECT * FROM processing WHERE cut_stock_id IN (?)', [stockIds]);
            console.log('Processing Entries for these Stock IDs:', processing);

            // Check if they would be returned by getAvailableStock
             const [available] = await db.query(`
                SELECT cs.id 
                FROM cut_stock cs
                WHERE cs.id IN (?)
                AND cs.id NOT IN (
                    SELECT cut_stock_id 
                    FROM processing 
                    WHERE status != 'processed' OR stage_id = 8 OR (status = 'processed' AND stage_id IS NOT NULL)
                )
            `, [stockIds]);
            console.log('Would appear in Available Stock?', available);
        } else {
            console.log('!!! NO CUT STOCK ENTRIES FOUND FOR THESE PROCESSES !!!');
            console.log('This implies compelteCutting did not insert them, or they were merged into another stock ID?');
            
            // Check for potential merge targets (same order, dress, pattern)
            for (const p of processes) {
                console.log(`Checking merge candidates for Process ${p.id} (Order ${p.order_id}, Dress ${p.org_dress_id})...`);
                const [candidates] = await db.query(`
                    SELECT cs.id, cs.cutting_process_id, cp.order_id 
                    FROM cut_stock cs
                    JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                    WHERE cp.order_id = ? AND cp.org_dress_id = ?
                `, [p.order_id, p.org_dress_id]);
                console.log('Merge Candidates:', candidates);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

diagnose();
