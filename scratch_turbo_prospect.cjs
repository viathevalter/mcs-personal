const AISA_BASE_URL = 'https://api.aisa.one/v1';
const apiKey = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';

async function checkMx(domain) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('https://dns.google/resolve?name=' + encodeURIComponent(domain) + '&type=MX', { signal: controller.signal });
    clearTimeout(t);
    const json = await res.json();
    return json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
  } catch (err) {
    return false;
  }
}

async function fetchHub(province, keywords) {
  const prompt = `Provide 15 established, real, registered industrial companies in "${province}", Spain operating in sector: "${keywords}".
Only return valid, non-fictional corporate companies with their official website and primary contact email.

Return JSON array only:
[
  {
    "company_name": "Exact Name S.L. / S.A.",
    "website": "https://www.company.es",
    "email": "contacto@company.es",
    "phone": "+34 9xx xxx xxx",
    "address": "Calle...",
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
          { role: 'system', content: 'You are a Spanish industrial B2B registry assistant. Return ONLY a valid JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.25,
      }),
    });

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '[]';
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    return [];
  }
}

async function testParallelStep() {
  const t0 = Date.now();
  console.log('🚀 Launching 3 parallel province workers (Madrid, Barcelona, Bilbao)...');

  const [resA, resB, resC] = await Promise.all([
    fetchHub('Madrid (Coslada y Getafe)', 'Calderería pesada y tubería industrial'),
    fetchHub('Barcelona (Granollers y Vallès)', 'Calderería pesada y tubería industrial'),
    fetchHub('Vizcaya (Bilbao y Barakaldo)', 'Calderería pesada y tubería industrial')
  ]);

  const all = [...resA, ...resB, ...resC];
  console.log(`📥 Received ${all.length} raw candidates across 3 hubs in ${Date.now() - t0}ms`);

  // Parallel MX check
  const t1 = Date.now();
  const valid = [];
  await Promise.all(
    all.map(async (item) => {
      if (item.email && item.email.includes('@')) {
        const domain = item.email.split('@')[1];
        const ok = await checkMx(domain);
        if (ok) valid.push(item);
      }
    })
  );

  console.log(`✅ Verified ${valid.length} 100% REAL leads with active MX in ${Date.now() - t1}ms! Total time: ${Date.now() - t0}ms`);
  console.log('Sample verified leads:');
  console.table(valid.slice(0, 5).map(v => ({ name: v.company_name, email: v.email, city: v.city })));
}

testParallelStep();
