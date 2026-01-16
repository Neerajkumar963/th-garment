
const API_URL = 'http://localhost:5001/api/processing/active';
const TOKEN = Buffer.from('admin@garment.com:123456789').toString('base64');

async function testApi() {
    try {
        console.log(`Testing API: ${API_URL}`);
        console.log(`Token: Bearer ${TOKEN}`);

        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        });

        console.log('Status code:', response.status);

        if (!response.ok) {
            const text = await response.text();
            console.error('❌ Error testing API:');
            console.error('Status:', response.status);
            console.error('Body:', text);
        } else {
            const data = await response.json();
            console.log('✅ Success! Data received:', data.length, 'items');
        }

    } catch (error) {
        console.error('❌ Network Error:', error.message);
    }
}

testApi();
