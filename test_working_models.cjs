require('dotenv').config();

const k = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const models = ['gemini-pro-latest', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-pro'];

async function testWorkingModels() {
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
      });
      const j = await res.json();
      console.log(m, 'Status:', res.status, j.error ? j.error.message : 'SUCCESS -> Candidate generated: ' + j.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 30));
    } catch (e) {
      console.log(m, 'Error:', e.message);
    }
  }
}

testWorkingModels();
