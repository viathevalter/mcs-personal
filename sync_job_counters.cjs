require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function syncAllJobCounters() {
  console.log('==================================================================================');
  console.log('🔄 SINCRONIZANDO CONTADORES DAS MISSÕES COM O BANCO REAL');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const jobs = await client.query('SELECT id, title FROM core_comercial.lead_prospecting_jobs;');

  for (const j of jobs.rows) {
    const countRes = await client.query(`
      SELECT count(*) as total, count(email) as emails
      FROM core_comercial.lead_prospecting_results
      WHERE job_id = $1;
    `, [j.id]);

    const total = parseInt(countRes.rows[0].total) || 0;
    const emails = parseInt(countRes.rows[0].emails) || 0;

    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET found_emails_count = $1,
          processed_count = $2,
          target_count = 2000,
          updated_at = NOW()
      WHERE id = $3;
    `, [emails, total, j.id]);
  }

  const jobsAfter = await client.query('SELECT title, found_emails_count, processed_count FROM core_comercial.lead_prospecting_jobs ORDER BY title ASC;');
  console.table(jobsAfter.rows);

  const stagingTotal = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
  const sumJobs = await client.query('SELECT sum(found_emails_count) as total_emails FROM core_comercial.lead_prospecting_jobs;');

  console.log(`\n✅ Staging Total Real: ${stagingTotal.rows[0].count}`);
  console.log(`✅ Soma das Missões: ${sumJobs.rows[0].total_emails}`);

  await client.end();
}

syncAllJobCounters();
