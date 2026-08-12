const AISA_BASE_URL = 'https://api.aisa.one/v1';
const AISA_API_KEY = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';

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
        messages: [{ role: 'user', content: 'Say hello in JSON: {"status": "ok"}' }]
      })
    });
    console.log(`Status for ${modelName}: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text.substring(0, 300)}`);
  } catch (err) {
    console.error(`Error:`, err.message);
  }
}

async function run() {
  await testModel('aisa-one');
  await testModel('gpt-4o');
  await testModel('gpt-4');
  await testModel('gpt-3.5-turbo');
}

run();
