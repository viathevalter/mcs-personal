const { Client } = require('pg');

const AISA_BASE_URL = 'https://api.aisa.one/v1';
const DEFAULT_AISA_API_KEY = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const prompt = `Act as a B2B business data assistant for industrial companies in Spain.
Return 10 REAL active companies in Spain specializing in "Calderería industrial, Tuberos, Montajes metálicos" located in "Murcia, Cartagena, Lorca".
MANDATORY: Return ONLY companies with verified corporate email address (gerencia@, compras@, comercial@, info@).

Return ONLY a valid JSON array:
[
  {
    "company_name": "Name",
    "email": "email@domain.es",
    "phone": "+34 968 123 456",
    "city": "Cartagena",
    "province": "Murcia",
    "website": "https://www.domain.es"
  }
]`;

  const res = await fetch(`${AISA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEFAULT_AISA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a B2B business data assistant for industrial companies in Spain. Return ONLY a valid JSON array.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
    }),
  });

  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

run();
