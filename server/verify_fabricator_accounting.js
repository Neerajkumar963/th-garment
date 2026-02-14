const axios = require('axios');

async function verify() {
    try {
        console.log('--- VERIFYING FABRICATOR ACCOUNTING ---');
        
        // 1. Get a fabricator job
        const jobsRes = await axios.get('http://localhost:5000/api/processing/fabricator');
        const jobs = jobsRes.data.jobs;
        
        if (jobs.length === 0) {
            console.log('No fabricator jobs available for testing.');
            return;
        }

        const testJob = jobs[0];
        const initialBalRes = await axios.get(`http://localhost:5000/api/employees/${testJob.emp_id}/account`);
        const initialLedger = initialBalRes.data.ledger;
        const initialBal = initialLedger.length > 0 ? initialLedger[0].balance : 0;
        
        console.log(`Testing with Job ID: ${testJob.id}, Emp ID: ${testJob.emp_id}`);
        console.log(`Initial Balance: ₹${initialBal}`);

        // 2. Receive 1 unit (if possible)
        // Find a size that has quantity
        let sq = testJob.sq;
        if (typeof sq === 'string') sq = JSON.parse(sq);
        
        const testSize = Object.keys(sq).find(k => k !== '_meta' && Number(sq[k]) > 0);
        if (!testSize) {
             console.log('No quantity available to receive in this job.');
             return;
        }

        const receivedQty = { [testSize]: 1 };
        console.log(`Receiving pieces:`, receivedQty);

        const receiveRes = await axios.post(`http://localhost:5000/api/processing/${testJob.id}/receive`, { receivedQty });
        console.log('Receive Status:', receiveRes.data.success ? 'SUCCESS' : 'FAILED');

        // 3. Check new balance
        const finalBalRes = await axios.get(`http://localhost:5000/api/employees/${testJob.emp_id}/account`);
        const finalLedger = finalBalRes.data.ledger;
        const finalBal = finalLedger.length > 0 ? finalLedger[0].balance : 0;
        
        console.log(`Final Balance: ₹${finalBal}`);
        
        const expectedInc = 1 * Number(testJob.processing_rate);
        console.log(`Expected increase: ₹${expectedInc}`);
        console.log(`Actual increase: ₹${Number(finalBal) - Number(initialBal)}`);

        if (Math.abs((Number(finalBal) - Number(initialBal)) - expectedInc) < 0.01) {
            console.log('VERIFICATION SUCCESS: Ledger correctly updated.');
        } else {
            console.error('VERIFICATION FAILED: Ledger balance mismatch.');
        }

    } catch (error) {
        if (error.response) {
            console.error('API Error:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

verify();
