const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();
  try {
    const jobs = await client.query(`
      SELECT id, title, keywords, location, status, processed_count, found_emails_count, updated_at, created_at 
      FROM core_comercial.lead_prospecting_jobs 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
    console.log('Ultimas 5 Missoes em PROD:', jobs.rows);

    const results = await client.query(`
      SELECT id, job_id, company_name, email, created_at 
      FROM core_comercial.lead_prospecting_results 
      ORDER BY created_at DESC 
      LIMIT 10;
    `);
    console.log('\nUltimos 10 Resultados em Staging:', results.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
