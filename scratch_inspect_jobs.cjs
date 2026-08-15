const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function check(dbName, conn) {
  const client = new Client({ connectionString: conn });
  await client.connect();
  const res = await client.query(`
    SELECT id, title, status, processed_count, found_emails_count, target_count 
    FROM core_comercial.lead_prospecting_jobs 
    ORDER BY updated_at DESC LIMIT 15;
  `);
  console.log('--- ' + dbName + ' ---');
  console.table(res.rows);

  const totalResults = await client.query(`SELECT count(*) FROM core_comercial.lead_prospecting_results;`);
  console.log('Total Staging Results in ' + dbName + ':', totalResults.rows[0].count);

  const statusCount = await client.query(`
    SELECT status, count(*) FROM core_comercial.lead_prospecting_jobs GROUP BY status;
  `);
  console.log('Job status counts in ' + dbName + ':');
  console.table(statusCount.rows);

  await client.end();
}

async function run() {
  await check('PROD', prodConnectionString);
}
run();
