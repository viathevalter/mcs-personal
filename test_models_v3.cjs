require('dotenv').config();

const k = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const models = ['gemini-3.6-flash', 'gemini-3.1-pro', 'gemini-3.0-flash', 'gemini-3.5-flash-lite', 'gemini-3.0-flash-lite'];

async function testModels() {
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
      });
      const j = await res.json();
      console.log(m, res.status, j.error ? j.error.message.slice(0, 120) : 'OK');
    } catch (e) {
      console.log(m, 'Error', e.message);
    }
  }
}

testModels();
