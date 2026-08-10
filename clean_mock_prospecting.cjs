const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function cleanDb(name, connStr) {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log(`Connected to ${name} DB.`);

    // 1. Mark all jobs as completed
    await client.query("UPDATE core_comercial.lead_prospecting_jobs SET status = 'completed', updated_at = NOW();");
    
    // 2. Clear old mock test results from staging
    await client.query("DELETE FROM core_comercial.lead_prospecting_results WHERE status = 'raw';");
    
    console.log(`Successfully cleaned test jobs and mock staging in ${name} DB!`);
  } catch (err) {
    console.error(`Error on ${name} DB:`, err);
  } finally {
    await client.end();
  }
}

async function main() {
  await cleanDb('DEV', devConnectionString);
  await cleanDb('PROD', prodConnectionString);
}

main();
