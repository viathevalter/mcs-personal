const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkStaging() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    console.log("=== JOBS IN DB ===");
    const jobs = await client.query(`SELECT id, title, processed_count, found_emails_count FROM core_comercial.lead_prospecting_jobs;`);
    console.table(jobs.rows);

    console.log("\n=== STAGING RESULTS IN DB ===");
    const staging = await client.query(`
      SELECT job_id, count(*) as staging_count 
      FROM core_comercial.lead_prospecting_results 
      GROUP BY job_id;
    `);
    console.table(staging.rows);

    console.log("\n=== RECENT LEADS IN CRM LINKED TO JOBS ===");
    const crm = await client.query(`
      SELECT prospecting_job_id, count(*) as count 
      FROM core_comercial.leads 
      WHERE prospecting_job_id IS NOT NULL 
      GROUP BY prospecting_job_id;
    `);
    console.table(crm.rows);

  } finally {
    await client.end();
  }
}

checkStaging();
