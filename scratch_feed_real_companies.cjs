const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkDomainMx(domain) {
  if (!domain || !domain.includes('.')) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: controller.signal });
    clearTimeout(timer);
    const json = await res.json();
    return json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
  } catch (err) {
    return false;
  }
}

async function feed() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  // Get active empresa_id and job
  const jobRes = await client.query(`
    SELECT id, empresa_id, title, location, sector_filter
    FROM core_comercial.lead_prospecting_jobs
    ORDER BY created_at DESC
    LIMIT 1;
  `);

  if (jobRes.rows.length === 0) {
    console.log('No jobs found.');
    await client.end();
    return;
  }

  const defaultJob = jobRes.rows[0];
  console.log(`Using Job: ${defaultJob.title} (${defaultJob.id})`);

  // Query existing names
  const existingRes = await client.query(`
    SELECT LOWER(TRIM(company_name)) as name, LOWER(TRIM(email)) as email
    FROM core_comercial.lead_prospecting_results;
  `);

  const existingNames = new Set(existingRes.rows.map(r => r.name).filter(Boolean));
  const existingEmails = new Set(existingRes.rows.map(r => r.email).filter(Boolean));

  console.log(`Existing real results in DB: ${existingNames.size}`);

  await client.end();
}

feed();
