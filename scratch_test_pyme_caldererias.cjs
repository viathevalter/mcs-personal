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

async function fetchPymeHub(province, keywords) {
  const prompt = `Provide 20 real, active small/medium industrial workshops and fabricators (Pymes / Talleres de calderería, tubería industrial, cerrajería pesada, soldadura TIG/MIG, montajes mecánicos) located in polígonos industriales across "${province}", Spain.
Target medium/small workshops (10-50 workers) that use subcontracted welders and tuberos.
Only return valid, non-fictional registered companies with their official website and primary contact email.

Return JSON array only:
[
  {
    "company_name": "Exact Name S.L. / S.A.",
    "website": "https://www.company.es",
    "email": "info@company.es",
    "phone": "+34 9xx xxx xxx",
    "address": "Polígono Industrial...",
    "city": "Town",
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
          { role: 'system', content: 'You are a Spanish industrial B2B registry assistant specializing in industrial parks and SME workshops. Return ONLY a valid JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
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

async function test() {
  console.log('🔍 Testing SME / Workshop Calderería extraction across 3 industrial provinces...');
  const [res1, res2, res3] = await Promise.all([
    fetchPymeHub('Vizcaya (Polígonos de Asua, Erandio, Trapagaran, Durango)', 'Talleres de Calderería y Soldadura'),
    fetchPymeHub('Zaragoza (Polígonos Malpica, Plaza, Centrovía, Utebo)', 'Talleres de Calderería y Estructuras'),
    fetchPymeHub('Barcelona (Polígonos de Sabadell, Terrassa, Granollers, Martorell)', 'Talleres de Calderería y Tubería')
  ]);

  const all = [...res1, ...res2, ...res3];
  console.log(`📥 Received ${all.length} SME workshop candidates!`);

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

  console.log(`✅ Verified ${valid.length} real SME workshops with active DNS MX!`);
  console.log('Sample SME Caldererías:');
  console.table(valid.slice(0, 10).map(v => ({
    name: v.company_name,
    address: v.address,
    city: v.city,
    province: v.province,
    email: v.email,
  })));
}

test();
