const AISA_BASE_URL = 'https://api.aisa.one/v1';
const AISA_API_KEY = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';

async function testBroad(province, sectorKeywords) {
  const prompt = `You are an expert Spanish industrial B2B registry assistant.
List 30 REAL, REGISTERED, SME industrial workshops and fabricators (Pymes, Talleres y Empresas de calderería, tubería industrial, carpintería metálica, estructuras, mecanizado CNC, montajes industriales o caldereros soldadores) located in the province of "${province}", Spain matching: "${sectorKeywords}".
Target real industrial companies with 10 to 200 workers.
Only return REAL companies with their official domain (.es or .com) and standard contact email.

Return JSON array only:
[
  {
    "company_name": "Official Name S.L. / S.A.",
    "website": "https://www.domain.es",
    "phone": "+34 9xx xxx xxx",
    "city": "Municipality / Polígono",
    "province": "${province}",
    "email": "info@domain.es"
  }
]`;

  try {
    const res = await fetch(`${AISA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AISA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a Spanish industrial B2B directory expert. Return ONLY valid JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
      }),
    });

    const json = await res.json();
    const clean = (json.choices?.[0]?.message?.content || '[]').replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(clean);
    console.log(`Province ${province}: found ${data.length} companies!`);
    console.log(data.slice(0, 3));
    return data;
  } catch (err) {
    console.error(`Error on ${province}:`, err.message);
    return [];
  }
}

testBroad('Valencia', 'talleres de calderería, tubería industrial, estructuras metálicas, mecanizado CNC');
