const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function heal(dbName, conn) {
  const client = new Client({ connectionString: conn });
  await client.connect();

  // Mark all jobs that reached target as completed
  const res = await client.query(`
    UPDATE core_comercial.lead_prospecting_jobs
    SET status = 'completed', updated_at = NOW()
    WHERE (processed_count >= target_count OR found_emails_count >= target_count)
      AND status != 'completed'
    RETURNING id, title, processed_count, found_emails_count, target_count;
  `);

  console.log(`[${dbName}] Updated ${res.rowCount} completed jobs.`);
  console.table(res.rows);

  await client.end();
}

async function run() {
  await heal('DEV', devConnectionString);
  await heal('PROD', prodConnectionString);
}
run();
