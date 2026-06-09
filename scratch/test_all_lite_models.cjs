const geminiApiKey = 'AIzaSyC8dq9DOXLX9ubNaZYWNi3aFyAbrKAUhHM';

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hello, respond with 1 word.' }] }]
            })
        });
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response: ${text.substring(0, 200)}...`);
    } catch (err) {
        console.error(`Error with ${modelName}:`, err.message);
    }
}

async function run() {
    await testModel('gemini-2.0-flash-lite');
    console.log("-------------------");
    await testModel('gemini-2.5-flash-lite');
    console.log("-------------------");
    await testModel('gemini-flash-latest');
    console.log("-------------------");
    await testModel('gemini-2.5-flash');
}

run();
