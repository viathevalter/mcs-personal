const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const count = await client.query('SELECT count(*) FROM core_common.clients');
  console.log("Total clients in core_common.clients:", count.rows[0].count);

  const sample = await client.query('SELECT id, codigo, trade_name, legal_name, tax_id FROM core_common.clients LIMIT 10');
  console.log("Sample clients:", sample.rows);

  const all320 = await client.query(`
    SELECT id, codigo, trade_name, legal_name, tax_id 
    FROM core_common.clients 
    WHERE codigo ILIKE '%32%' OR trade_name ILIKE '%320%' OR trade_name ILIKE '%430%' OR codigo ILIKE '%43%'
  `);
  console.log("Clients matching 32 / 43:", all320.rows);

  await client.end();
}

run().catch(console.error);
