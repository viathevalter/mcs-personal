const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();
  const res = await client.query(`
    SELECT f.id, f.fatura_numero, c.codigo, c.trade_name 
    FROM core_finance.faturas f 
    JOIN core_common.clients c ON c.id = f.client_id 
    WHERE f.fatura_numero ILIKE '%320%' OR f.fatura_numero ILIKE '%/320%'
  `);
  console.log('Faturas with 320:', res.rows);

  // Check C0203 invoices
  const res203 = await client.query(`
    SELECT f.id, f.fatura_numero, c.codigo, c.trade_name 
    FROM core_finance.faturas f 
    JOIN core_common.clients c ON c.id = f.client_id 
    WHERE c.codigo = 'C0203'
  `);
  console.log('C0203 invoices:', res203.rows);

  await client.end();
}
run().catch(console.error);
