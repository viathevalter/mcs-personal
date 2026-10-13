const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'clientes'
  `);
  console.log("Columns of public.clientes:", cols.rows.map(r => r.column_name).join(', '));

  const count = await client.query('SELECT count(*) FROM public.clientes');
  console.log("Total in public.clientes:", count.rows[0].count);

  const res320 = await client.query(`
    SELECT * FROM public.clientes WHERE id::text IN ('320', '430') OR cod_cliente IN ('320', '430') OR id IN (320, 430)
  `);
  console.log("Found in public.clientes 320/430:", res320.rows);

  await client.end();
}

run().catch(console.error);
