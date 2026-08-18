const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== COLUMNS OF lead_prospecting_jobs ===`);
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'core_comercial' AND table_name = 'lead_prospecting_jobs';
    `);
    console.table(cols.rows);

    const jobs = await client.query(`
      SELECT * FROM core_comercial.lead_prospecting_jobs ORDER BY created_at DESC LIMIT 10;
    `);
    console.table(jobs.rows);

    const totalItaly = await client.query(`
      SELECT 
        count(*) as total_italy_crm,
        count(*) FILTER (WHERE email IS NOT NULL AND email != '') as with_email,
        count(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as with_phone
      FROM core_comercial.leads
      WHERE notes ILIKE '%Ital%' 
         OR notes ILIKE '%Veneto%'
         OR notes ILIKE '%Lombardia%'
         OR phone ILIKE '+39%'
         OR 'Itália' = ANY(tags)
         OR 'Italia' = ANY(tags)
         OR sector ILIKE '%(Italia)%'
         OR sector ILIKE '%Ital%';
    `);
    console.table(totalItaly.rows);

    const totalAllLeads = await client.query(`
      SELECT 
        count(*) as total_leads,
        count(*) FILTER (WHERE email IS NOT NULL AND email != '') as total_with_email,
        count(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as total_with_phone
      FROM core_comercial.leads;
    `);
    console.table(totalAllAllLeads = totalAllLeads.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
