const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function checkItalyLeads(name, connStr) {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log(`\n================ [${name}] LEADS DA ITÁLIA ================`);

    // 1. In CRM (core_comercial.leads)
    const crmTotal = await client.query(`
      SELECT 
        count(*) as total_crm,
        count(*) FILTER (WHERE email IS NOT NULL AND email != '') as crm_with_email,
        count(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as crm_with_phone
      FROM core_comercial.leads
      WHERE notes ILIKE '%Ital%' 
         OR notes ILIKE '%Itália%'
         OR notes ILIKE '%Veneto%'
         OR notes ILIKE '%Lombardia%'
         OR notes ILIKE '%Piemonte%'
         OR notes ILIKE '%Emilia%'
         OR phone ILIKE '+39%'
         OR 'Itália' = ANY(tags)
         OR 'Italia' = ANY(tags);
    `);
    console.log("CRM Leads (core_comercial.leads):");
    console.table(crmTotal.rows);

    // 2. In Prospecting Staging (core_comercial.lead_prospecting_results)
    const stagingTotal = await client.query(`
      SELECT 
        count(*) as total_staging,
        count(*) FILTER (WHERE email IS NOT NULL AND email != '') as staging_with_email,
        count(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as staging_with_phone,
        count(*) FILTER (WHERE status = 'imported') as staging_imported,
        count(*) FILTER (WHERE status = 'verified' OR status = 'enriched') as staging_verified
      FROM core_comercial.lead_prospecting_results
      WHERE country = 'IT' 
         OR province IN ('Veneto', 'Lombardia', 'Piemonte', 'Emilia-Romagna', 'Toscana', 'Friuli-Venezia Giulia', 'Trentino-Alto Adige', 'Liguria', 'Campania', 'Lazio', 'Sicilia', 'Puglia', 'Abruzzo', 'Marche', 'Umbria', 'Calabria', 'Sardegna', 'Basilicata', 'Molise', 'Valle d''Aosta')
         OR phone ILIKE '+39%'
         OR website ILIKE '%.it'
         OR website ILIKE '%.it/%'
         OR address ILIKE '%Italy%'
         OR address ILIKE '%Italia%';
    `);
    console.log("Staging Leads (core_comercial.lead_prospecting_results):");
    console.table(stagingTotal.rows);

    // 3. Jobs summary for Italy
    const jobs = await client.query(`
      SELECT id, title, target_country, status, total_found, valid_emails_count, created_at
      FROM core_comercial.lead_prospecting_jobs
      WHERE target_country = 'IT' 
         OR title ILIKE '%Ital%'
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    console.log("Jobs de Prospecção Itália:");
    console.table(jobs.rows);

    // 4. Sample leads
    const samples = await client.query(`
      SELECT company_name, email, phone, city, province, website
      FROM core_comercial.leads
      WHERE notes ILIKE '%Ital%' 
         OR phone ILIKE '+39%'
         OR 'Itália' = ANY(tags)
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    console.log("Amostra de Leads da Itália no CRM:");
    console.table(samples.rows);

  } catch (err) {
    console.error(`Error on ${name}:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await checkItalyLeads('PROD', prodConnectionString);
}

run();
