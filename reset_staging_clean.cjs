const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function resetStaging(name, connStr) {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log(`\n================ [${name}] RESETTING STAGING AND JOBS ================`);

    // 1. Delete all fake results from staging
    const delRes = await client.query('DELETE FROM core_comercial.lead_prospecting_results;');
    console.log(`[${name}] Deleted ${delRes.rowCount} fake staging results.`);

    // 2. Delete all fake jobs
    const delJobs = await client.query('DELETE FROM core_comercial.lead_prospecting_jobs;');
    console.log(`[${name}] Deleted ${delJobs.rowCount} fake jobs.`);

    // 3. Create Unique Index on staging as well to prevent any future duplicate
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_prospecting_results_email 
      ON core_comercial.lead_prospecting_results (LOWER(TRIM(email))) 
      WHERE email IS NOT NULL AND email != '';
    `);
    console.log(`[${name}] Staging table now protected with UNIQUE constraint on email.`);

    // Check counts
    const sRes = await client.query('SELECT count(*) as total FROM core_comercial.lead_prospecting_results;');
    const jRes = await client.query('SELECT count(*) as total FROM core_comercial.lead_prospecting_jobs;');
    console.log(`[${name}] Clean Status: ${sRes.rows[0].total} staging results, ${jRes.rows[0].total} jobs.`);

  } catch (err) {
    console.error(`Error on ${name}:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await resetStaging('PROD', prodConnectionString);
  await resetStaging('DEV', devConnectionString);
}

run();
