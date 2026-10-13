const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  console.log("Checking public.contas_receber:");
  try {
    const cr = await client.query(`
      SELECT DISTINCT cod_cliente, cliente, count(*) 
      FROM public.contas_receber 
      WHERE cod_cliente LIKE '%320%' OR cod_cliente LIKE '%430%'
         OR cod_cliente IN ('320', '430', 'C0320', 'C0430')
      GROUP BY cod_cliente, cliente
    `);
    console.log("contas_receber matches:", cr.rows);
  } catch(e) {
    console.log("CR error:", e.message);
  }

  // Also check all distinct cod_cliente in contas_receber with 32 or 43 or any duplicates
  try {
    const allCr = await client.query(`
      SELECT cod_cliente, cliente, count(*) 
      FROM public.contas_receber 
      GROUP BY cod_cliente, cliente
      ORDER BY count(*) DESC
      LIMIT 30
    `);
    console.log("contas_receber top 30:", allCr.rows);
  } catch(e) {}

  await client.end();
}
run().catch(console.error);
