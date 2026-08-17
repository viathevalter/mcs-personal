const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function resetDb(envName, connStr) {
  console.log(`\n=== Resetting Rate Limited Queue on ${envName} ===`);
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();

    const res = await client.query(`
      UPDATE core_comercial.marketing_campaign_queue
      SET status = 'pending', error_message = NULL
      WHERE status = 'failed'
        AND (error_message ILIKE '%rate_limit%' OR error_message ILIKE '%Too many requests%' OR error_message ILIKE '%429%');
    `);

    console.log(`Updated ${res.rowCount} items on ${envName} back to 'pending'.`);
  } catch (err) {
    console.error(`Error on ${envName}:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await resetDb('PROD', prodConnectionString);
  await resetDb('DEV', devConnectionString);
}

run();
