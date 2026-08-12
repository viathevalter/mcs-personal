const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
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

async function debugJob() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    const jobRes = await client.query(`
      SELECT * FROM core_comercial.lead_prospecting_jobs 
      WHERE id = '98a16177-03b8-4208-9acc-09ad55eb81d1';
    `);

    const job = jobRes.rows[0];
    console.log('Target Job:', job);

    const prompt = `Act as a real-time web crawler, search engine proxy, and business contact verifier for B2B leads in Spain.
Search for 5 REAL active companies in Spain matching core business activity: "${job.keywords}" strictly located anywhere within the region/province of "${job.location}" (including all its cities, towns, and industrial parks).

CRITICAL INSTRUCTIONS:
1. Include real, active corporate emails.
2. EXPANDED METROPOLITAN & INDUSTRIAL BELT COVERAGE: Include companies physically located ANYWHERE in the metropolitan area, industrial belt (polígonos industriales), and full region/province of "${job.location}".
3. STRICT WEBSITE VERIFICATION & NO DOMAIN GUESSING: ONLY set "website" to a URL if the company HAS an active, verified public website listed on Google Maps or official business registries. Otherwise set "website" strictly to null.

Return ONLY a valid JSON array of objects with the exact schema below, with no markdown codeblocks, no explanations, no commentary:
[
  {
    "company_name": "Exact Legal or Trade Name",
    "website": "https://www.realcompany.es" or null,
    "phone": "+34 976 123 456" or null,
    "address": "Calle Example 123, Polígono Industrial" or null,
    "city": "${job.location}",
    "province": "${job.location}",
    "email": "gerencia@realcompany.es" or null,
    "sector": "${job.keywords}"
  }
]`;

    console.log('\nSending prompt to AIsa API...');
    const response = await fetch(`${AISA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AISA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a real-time web crawler in Spain.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      })
    });

    console.log('AIsa HTTP Status:', response.status);
    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || '[]';
    console.log('Raw Content from AIsa:\n', content);

    const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const rawResults = JSON.parse(cleanJsonStr);
    console.log(`Parsed ${rawResults.length} raw results. Verifying MX records...`);

    for (const item of rawResults) {
      if (item.email) {
        const hasMx = await checkMxRecord(item.email);
        console.log(`Company: "${item.company_name}" | Email: "${item.email}" | MX Valid: ${hasMx}`);
      } else {
        console.log(`Company: "${item.company_name}" | Email: null`);
      }
    }
  } catch (err) {
    console.error('Error debugging job:', err);
  } finally {
    await client.end();
  }
}

debugJob();
