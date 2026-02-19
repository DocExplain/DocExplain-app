
async function testAPI() {
    const url = 'https://documate.vercel.app/api/analyze';
    const body = {
        contextAndText: "Test content to verify API is working.",
        fileName: "test.txt"
    };

    console.log(`Testing API at: ${url}...`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const data = await response.json();
        console.log('Response Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

testAPI();
