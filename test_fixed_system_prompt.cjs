const AISA_BASE_URL = 'https://api.aisa.one/v1';
const AISA_API_KEY = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';

async function checkMxRecord(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].trim().toLowerCase();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    return false;
  }
}

async function testFixedSystemPrompt() {
  const prompt = `Generate a structured B2B list of 5 active industrial companies operating in Spain in the sector of "Calderería industrial y Estructuras Metálicas" located in "Provincia de Barcelona (Sabadell, Terrassa, Granollers)".

Return ONLY a valid JSON array with schema:
[
  {
    "company_name": "Company Name",
    "website": "https://www.company.es" or null,
    "phone": "+34 93...",
    "email": "contact@company.es" or null,
    "city": "Sabadell",
    "province": "Barcelona"
  }
]`;

  console.log('Sending fixed prompt to AIsa API...');
  const res = await fetch(`${AISA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AISA_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a B2B business data proxy for industrial companies in Spain. Return ONLY a raw JSON array.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  });

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '[]';
  console.log('Raw Content:\n', content);

  const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
  const rawResults = JSON.parse(cleanJsonStr);

  console.log(`\nParsed ${rawResults.length} results. Testing MX records:`);
  for (const item of rawResults) {
    const mxValid = item.email ? await checkMxRecord(item.email) : false;
    console.log(`Company: "${item.company_name}" | Email: "${item.email}" | MX Valid: ${mxValid}`);
  }
}

testFixedSystemPrompt();
