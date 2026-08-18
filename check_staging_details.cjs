const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkStaging() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    const jobs = await client.query(`
      SELECT * FROM core_comercial.lead_prospecting_jobs LIMIT 2;
    `);
    console.log("Sample Jobs:");
    console.table(jobs.rows);

    const results = await client.query(`
      SELECT 
        count(*) as total_staging_rows,
        count(DISTINCT LOWER(TRIM(email))) as unique_emails
      FROM core_comercial.lead_prospecting_results;
    `);
    console.table(results.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

checkStaging();
