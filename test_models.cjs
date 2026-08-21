require('dotenv').config();

const k = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro-latest', 'gemini-2.0-flash-exp', 'gemini-2.5-pro', 'gemini-1.5-pro'];

async function testModels() {
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
      });
      const j = await res.json();
      console.log(m, res.status, j.error ? j.error.message.slice(0, 120) : 'OK');
    } catch (e) {
      console.log(m, 'Error', e.message);
    }
  }
}

testModels();
