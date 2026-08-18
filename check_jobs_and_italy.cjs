const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== PROSPECTING JOBS IN PROD ===`);
    const jobs = await client.query(`
      SELECT id, title, target_count, status, total_found, valid_emails_count, created_at
      FROM core_comercial.lead_prospecting_jobs
      ORDER BY created_at DESC;
    `);
    console.table(jobs.rows);

    console.log(`\n=== LEADS BREAKDOWN BY SECTOR / ORIGIN IN CRM (PROD) ===`);
    const sectors = await client.query(`
      SELECT 
        sector,
        origen_lead,
        count(*) as total_leads,
        count(*) FILTER (WHERE email IS NOT NULL AND email != '') as with_email,
        count(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as with_phone
      FROM core_comercial.leads
      GROUP BY sector, origen_lead
      ORDER BY total_leads DESC;
    `);
    console.table(sectors.rows);

    console.log(`\n=== ITALIAN LEADS IN CRM (PROD) ===`);
    const italyLeads = await client.query(`
      SELECT 
        id, company_name, email, phone, city, province, sector, origen_lead, created_at
      FROM core_comercial.leads
      WHERE notes ILIKE '%Ital%' 
         OR notes ILIKE '%Veneto%'
         OR notes ILIKE '%Lombardia%'
         OR phone ILIKE '+39%'
         OR 'Itália' = ANY(tags)
         OR 'Italia' = ANY(tags)
         OR sector ILIKE '%(Italia)%'
         OR sector ILIKE '%Ital%'
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    console.table(italyLeads.rows);

    const totalItaly = await client.query(`
      SELECT count(*) as total_italy_crm
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
    console.log("Total Leads da Itália no CRM:", totalItaly.rows[0].total_italy_crm);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
