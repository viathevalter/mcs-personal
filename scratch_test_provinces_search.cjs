const AISA_BASE_URL = 'https://api.aisa.one/v1';
const apiKey = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';

async function checkMx(domain) {
  try {
    const res = await fetch('https://dns.google/resolve?name=' + encodeURIComponent(domain) + '&type=MX');
    const json = await res.json();
    return json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
  } catch (err) {
    return false;
  }
}

async function searchProvince(sector, province) {
  const prompt = `Provide 10 established, well-known industrial companies in "${province}", Spain operating in sector: "${sector}".
Only return valid, non-fictional corporate companies with their official website and primary contact email.

Return JSON array only:
[
  {
    "company_name": "Company S.A. / S.L.",
    "website": "https://www.company.es",
    "email": "info@company.es",
    "phone": "+34 9xx xxx xxx",
    "address": "Industrial address",
    "city": "${province}",
    "province": "${province}"
  }
]`;

  try {
    const res = await fetch(`${AISA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a Spanish industrial B2B registry dataset assistant. Return ONLY valid JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
      }),
    });

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '[]';
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const items = JSON.parse(clean);

    console.log(`\n=== Found ${items.length} candidates in ${province} ===`);
    for (const item of items) {
      const email = item.email;
      if (email && email.includes('@')) {
        const domain = email.split('@')[1];
        const isValid = await checkMx(domain);
        console.log(`- ${item.company_name} | ${email} -> DNS MX: ${isValid ? 'VALID ✅' : 'INVALID ❌'}`);
      }
    }
  } catch (err) {
    console.error(`Error in ${province}:`, err.message);
  }
}

async function run() {
  await searchProvince('Calderería pesada y tubería industrial', 'País Vasco (Vizcaya)');
  await searchProvince('Calderería pesada y tanques', 'Cataluña (Barcelona)');
  await searchProvince('Calderería y montajes industriales', 'Galicia (Vigo y Ferrol)');
}

run();
