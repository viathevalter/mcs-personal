const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const codes = await client.query(`
    SELECT codigo, trade_name, legal_name, tax_id 
    FROM core_common.clients 
    ORDER BY codigo ASC
  `);
  console.log("All codigos count:", codes.rows.length);
  const codesList = codes.rows.map(r => r.codigo);
  console.log("Codes:", codesList.join(', '));

  await client.end();
}

run().catch(console.error);
