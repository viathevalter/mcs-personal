const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    const resTotal = await client.query(`
      SELECT 
        COUNT(*) as total_staging,
        COUNT(email) as total_emails,
        COUNT(CASE WHEN email LIKE '%@gmail.com' OR email LIKE '%@hotmail.com' OR email LIKE '%@yahoo%' THEN 1 END) as free_emails,
        COUNT(CASE WHEN email IS NOT NULL AND email NOT LIKE '%@gmail.com' AND email NOT LIKE '%@hotmail.com' AND email NOT LIKE '%@yahoo%' THEN 1 END) as corporate_domain_emails
      FROM core_comercial.lead_prospecting_results;
    `);
    console.table(resTotal.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
