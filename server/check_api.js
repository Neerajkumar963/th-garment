const axios = require('axios');

async function verify() {
    try {
        console.log('--- VERIFYING GET STOCK HISTORY API ---');
        // We first need a valid org_dress_id. We can get it from /api/sales/stock
        const stockRes = await axios.get('http://localhost:5000/api/sales/stock');
        const stock = stockRes.data.stock;
        
        if (stock.length === 0) {
            console.log('No stock items available for testing.');
            return;
        }

        const testId = stock[0].org_dress_id;
        console.log(`Testing with org_dress_id: ${testId}`);

        const historyUrl = `http://localhost:5000/api/sales/stock/${testId}/history`;
        const historyRes = await axios.get(historyUrl);

        if (historyRes.data.success) {
            console.log('SUCCESS: API returned history without SQL error.');
            console.log('Metadata:', JSON.stringify(historyRes.data.metadata, null, 2));
            console.log(`Found ${historyRes.data.history.length} batches.`);
        } else {
            console.error('FAILED: API returned success=false');
        }

    } catch (error) {
        if (error.response) {
            console.error('FAILED: API returned error status:', error.response.status);
            console.error('Error Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

verify();
