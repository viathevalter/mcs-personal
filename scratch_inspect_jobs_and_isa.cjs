const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    console.log('=== JOBS EM PROD ===');
    const jobs = await client.query(`
      SELECT id, title, status, target_count, processed_count, found_emails_count, search_source, updated_at
      FROM core_comercial.lead_prospecting_jobs
      ORDER BY created_at ASC;
    `);
    console.table(jobs.rows);

    console.log('\n=== RESULTADOS EM STAGING EM PROD ===');
    const results = await client.query(`
      SELECT id, company_name, email, phone, website, city, province, created_at
      FROM core_comercial.lead_prospecting_results
      ORDER BY created_at DESC
      LIMIT 20;
    `);
    console.table(results.rows);

    console.log('\n=== TOTAL STAGING BY EMAIL STATUS ===');
    const totals = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(email) as with_email,
        COUNT(*) - COUNT(email) as without_email
      FROM core_comercial.lead_prospecting_results;
    `);
    console.table(totals.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
