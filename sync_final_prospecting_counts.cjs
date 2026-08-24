require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function syncCounts() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const jobs = await client.query('SELECT id, title, target_count FROM core_comercial.lead_prospecting_jobs ORDER BY title ASC;');

  for (const j of jobs.rows) {
    const resCount = await client.query(`
      SELECT count(*) as total, count(email) as with_email 
      FROM core_comercial.lead_prospecting_results 
      WHERE job_id = $1;
    `, [j.id]);

    const total = parseInt(resCount.rows[0]?.total || '0', 10);
    const withEmail = parseInt(resCount.rows[0]?.with_email || '0', 10);

    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET processed_count = $1,
          found_emails_count = $2,
          status = 'completed',
          updated_at = NOW()
      WHERE id = $3;
    `, [total, withEmail, j.id]);
  }

  const jobsUpdated = await client.query(`
    SELECT id, title, status, processed_count, found_emails_count, target_count 
    FROM core_comercial.lead_prospecting_jobs 
    ORDER BY title ASC;
  `);
  console.table(jobsUpdated.rows);

  const stagingTotal = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
  const crmTotal = await client.query('SELECT count(*) FROM core_comercial.leads;');

  console.log(`\n✅ Staging Total: ${stagingTotal.rows[0].count}`);
  console.log(`✅ CRM Leads Total: ${crmTotal.rows[0].count}`);

  await client.end();
}

syncCounts();
