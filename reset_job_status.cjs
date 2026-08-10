const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function resetJobs(name, connStr) {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log(`Connected to ${name} DB.`);

    // Reset job status to pending so user can run capture afresh
    await client.query("UPDATE core_comercial.lead_prospecting_jobs SET status = 'pending', processed_count = 0, found_emails_count = 0, updated_at = NOW();");
    
    console.log(`Successfully reset jobs to pending in ${name} DB!`);
  } catch (err) {
    console.error(`Error on ${name} DB:`, err);
  } finally {
    await client.end();
  }
}

async function main() {
  await resetJobs('DEV', devConnectionString);
  await resetJobs('PROD', prodConnectionString);
}

main();
