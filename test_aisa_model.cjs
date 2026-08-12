const AISA_BASE_URL = 'https://api.aisa.one/v1';
const AISA_API_KEY = 'ak-3d7f9a2b5e8c1d4f6a0b8c2e4f6a8b0c';

async function testModel(modelName) {
  console.log(`Testing model "${modelName}" on ${AISA_BASE_URL}...`);
  try {
    const res = await fetch(`${AISA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AISA_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Say hello in JSON' }]
      })
    });
    console.log(`Status for ${modelName}: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text.substring(0, 150)}`);
  } catch (err) {
    console.error(`Error:`, err.message);
  }
}

async function run() {
  await testModel('aisa-one');
  await testModel('gpt-4o');
}

run();
