const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function listJobs() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT id, title, location, status, processed_count, found_emails_count, sector_filter, created_at
      FROM core_comercial.lead_prospecting_jobs
      ORDER BY created_at ASC;
    `);
    console.table(res.rows);
  } finally {
    await client.end();
  }
}

listJobs();
