const db = require('./config/database');

async function debugJobs() {
    try {
        console.log("Connecting to DB...");
        // Removed org_name which is not in processing table
        const [jobs] = await db.query(`
            SELECT id, stage_id, cut_stock_id, sq, status, created_on 
            FROM processing 
            WHERE stage_id = 1 AND status = 'processed'
        `);
        console.log("Stage 1 Processed Jobs:", JSON.stringify(jobs, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugJobs();
