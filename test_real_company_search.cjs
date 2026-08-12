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

async function testRealSearch() {
  const prompt = `Search for 10 REAL, TRULY EXISTING industrial calderería and metalworking companies in the province of Barcelona, Spain (Sabadell, Terrassa, Granollers, Rubí).
You MUST ONLY return real companies registered in Spain with authentic published contact info.

Return ONLY a JSON array:
[
  {
    "company_name": "Exact Legal Name",
    "website": "https://www.realcompany.es" or null,
    "phone": "+34 937...",
    "email": "real_contact@realdomain.es" or null
  }
]`;

  console.log('Sending prompt for REAL companies...');
  const res = await fetch(`${AISA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AISA_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0
    })
  });

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '[]';
  const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
  const rawResults = JSON.parse(cleanJsonStr);

  console.log(`Received ${rawResults.length} companies from AIsa:`);
  for (const item of rawResults) {
    const mxValid = item.email ? await checkMxRecord(item.email) : false;
    console.log(`Company: "${item.company_name}" | Email: "${item.email}" | MX Valid: ${mxValid}`);
  }
}

testRealSearch();
