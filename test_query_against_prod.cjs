const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();
    console.log("Connected to PROD database");

    console.log("Testing clients settings join query on PROD...");
    const res = await client.query(`
      SELECT c.*, s.status
      FROM core_common.clients c
      LEFT JOIN core_common.client_company_settings s ON s.client_id = c.id
      LIMIT 1
    `);
    console.log("Query success! Rows:", res.rows.length);

  } catch (e) {
    console.error("Query FAILED on PROD:", e.message);
  } finally {
    await client.end();
  }
}

run();
