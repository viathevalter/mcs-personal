const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function check() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();
  const res = await client.query(`
    SELECT id, title, status, processed_count, found_emails_count, target_count, updated_at
    FROM core_comercial.lead_prospecting_jobs 
    WHERE status = 'processing' OR title ILIKE '%Cartagen%'
    ORDER BY updated_at DESC LIMIT 20;
  `);
  console.table(res.rows);
  await client.end();
}
check();
