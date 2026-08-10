const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function cleanDb(name, connStr) {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log(`Connected to ${name} DB.`);

    // 1. Delete all un-imported staging results
    await client.query("DELETE FROM core_comercial.lead_prospecting_results WHERE status = 'raw';");
    
    // 2. Reset jobs processed counts
    await client.query("UPDATE core_comercial.lead_prospecting_jobs SET processed_count = 0, found_emails_count = 0, status = 'completed', updated_at = NOW();");
    
    console.log(`Successfully cleaned unverified staging results in ${name} DB!`);
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
