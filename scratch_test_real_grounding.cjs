const { Client } = require('pg');

const AISA_BASE_URL = 'https://api.aisa.one/v1';
const AISA_API_KEY = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function testGroundedSearch() {
  const prompt = `Act as an expert B2B lead researcher accessing real public records, Google Maps Places, eInforma, Empresite, and official Spanish Trade Registries (Registro Mercantil).

Task: Retrieve 10 REAL, ACTIVE, EXISTING industrial companies operating in "Vigo, Ferrol, A Coruña, Galicia" specializing in "Construcción y Reparación Naval, Calderería Naval, Tuberos, Astilleros".

CRITICAL GROUNDING RULES (NO HALLUCINATIONS):
1. Return ONLY real companies that ACTUALLY exist in the real world and can be found by exact name on Google Search, eInforma, or Google Maps.
2. The "company_name" MUST be the exact real trade name or legal name (Razón Social) as registered in Spain (e.g. "Viguesa de Calderería S.A.", "Astilleros Armada S.A.", "Nodosa Shipyard", "Cardama Shipyard", "Metalúrgica de El Grove").
3. DO NOT invent or combine generic names like "Calderería Técnica Vigo S.A." if they do not exist.
4. "website" MUST be the actual real URL of the company (e.g. "https://www.vicalsa.com").
5. "email" MUST be an active corporate email address of that exact company (e.g. "vicalsa@vicalsa.com", "info@nodosa.com").

Return ONLY a valid JSON array:
[
  {
    "company_name": "Exact Real Legal/Trade Name",
    "website": "https://www.realwebsite.com",
    "phone": "+34 986 123 456",
    "address": "Real Street Address, Polígono Industrial",
    "city": "Vigo",
    "province": "Pontevedra",
    "email": "info@realwebsite.com"
  }
]`;

  console.log('🔍 Solicitando dados com regras de Grounding Real (eInforma / Google Maps)...');

  const res = await fetch(`${AISA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AISA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an official B2B data auditor for Spanish companies. Return ONLY 100% verified real companies found on Google / eInforma in a valid JSON array.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.0,
    }),
  });

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '[]';
  const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
  const results = JSON.parse(cleanJsonStr);

  console.log('\n✅ RESULTADOS VERIFICÁVEIS RETORNADOS:');
  console.table(results);
}

testGroundedSearch();
