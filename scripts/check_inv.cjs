const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();
  const res = await client.query(`
    SELECT f.fatura_numero, f.client_id, c.codigo, c.trade_name, c.legal_name, c.tax_id
    FROM core_finance.faturas f
    JOIN core_common.clients c ON c.id = f.client_id
    WHERE f.fatura_numero LIKE '%320%' OR f.fatura_numero LIKE '%430%'
  `);
  console.log('Matches by invoice number:', res.rows);

  // Also check if any client has code 320 in any field, or if there's any other table!
  const any320 = await client.query(`
    SELECT table_schema, table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema IN ('core_common', 'core_finance', 'core_operacoes', 'core_comercial', 'public')
      AND column_name ILIKE '%cliente%'
  `);
  console.log('All client reference columns in DB:', any320.rows);

  await client.end();
}
run().catch(console.error);
