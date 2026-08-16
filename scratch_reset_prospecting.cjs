const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function resetJobsAndStaging(dbName, connString) {
  const client = new Client({ connectionString: connString });
  await client.connect();

  console.log(`[${dbName}] Cleaning old hallucinated jobs and raw staging...`);

  // Delete all old prospecting jobs and staging results
  await client.query('DELETE FROM core_comercial.lead_prospecting_results;');
  await client.query('DELETE FROM core_comercial.lead_prospecting_jobs;');

  console.log(`[${dbName}] Reset complete. Ready for official CNAE-based missions!`);
  await client.end();
}

async function run() {
  await resetJobsAndStaging('DEV', devConnectionString);
  await resetJobsAndStaging('PROD', prodConnectionString);
}

run();
