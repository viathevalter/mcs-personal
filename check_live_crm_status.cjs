const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkLiveStatus() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== LIVE LEADS STATUS IN PROD ===`);
    const totalRes = await client.query(`
      SELECT 
        count(*) as total_crm_leads,
        count(DISTINCT LOWER(TRIM(email))) as unique_emails,
        count(*) FILTER (WHERE 'Espanha' = ANY(tags) OR notes ILIKE '%Espanha%' OR origen_lead ILIKE '%Espanha%' OR phone ILIKE '+34%') as spain_leads,
        count(*) FILTER (WHERE 'Itália' = ANY(tags) OR 'Italia' = ANY(tags) OR notes ILIKE '%Ital%' OR phone ILIKE '+39%') as italy_leads,
        count(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as added_last_hour
      FROM core_comercial.leads;
    `);
    console.table(totalRes.rows);

    const recentSample = await client.query(`
      SELECT company_name, email, phone, city, province, sector, origen_lead, created_at
      FROM core_comercial.leads
      ORDER BY created_at DESC
      LIMIT 6;
    `);
    console.log("\nÚltimos Leads Inseridos no CRM:");
    console.table(recentSample.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

checkLiveStatus();
