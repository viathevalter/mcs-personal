const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();
    console.log("Connected to PROD DB");

    const res = await client.query(`
      SELECT LOWER(TRIM(trade_name)) as norm_name, COUNT(*) 
      FROM core_common.clients 
      GROUP BY LOWER(TRIM(trade_name))
      HAVING COUNT(*) > 1
    `);

    console.log("Duplicate client names:");
    for (const row of res.rows) {
      console.log(`- Name: "${row.norm_name}" (Count: ${row.count})`);
    }

  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}

run();
