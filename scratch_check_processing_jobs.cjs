const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    const jobs = await client.query(`
      SELECT id, title, status, target_count, processed_count, found_emails_count, search_source, updated_at
      FROM core_comercial.lead_prospecting_jobs
      ORDER BY created_at ASC;
    `);
    console.table(jobs.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
