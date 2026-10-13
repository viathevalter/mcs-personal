const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  console.log("Searching for B46127080 or CALDERAS RCB:");
  const pubMatch = await client.query(`
    SELECT id, cod_cliente, nombre_comercial, razon_social, cif_dni, telefono 
    FROM public.clientes 
    WHERE cif_dni ILIKE '%B46127080%' OR nombre_comercial ILIKE '%CALDERAS RCB%' OR razon_social ILIKE '%CUBELLS%'
  `);
  console.log("public.clientes matches:", pubMatch.rows);

  const coreMatch = await client.query(`
    SELECT id, codigo, trade_name, legal_name, tax_id, phone, legacy_id
    FROM core_common.clients
    WHERE tax_id ILIKE '%B46127080%' OR trade_name ILIKE '%CALDERAS RCB%' OR legal_name ILIKE '%CUBELLS%'
  `);
  console.log("core_common.clients matches:", coreMatch.rows);

  // Now let's check id 430 or sp_id 430 or legacy_id 430 in both tables:
  const p430 = await client.query(`
    SELECT id, sp_id, cod_cliente, nombre_comercial, razon_social, cif_dni 
    FROM public.clientes 
    WHERE id::text = '430' OR sp_id = 430 OR cod_cliente LIKE '%430%'
  `);
  console.log("p430 matches:", p430.rows);

  const c430 = await client.query(`
    SELECT id, legacy_id, codigo, trade_name, legal_name, tax_id 
    FROM core_common.clients 
    WHERE legacy_id = '430' OR codigo LIKE '%430%'
  `);
  console.log("c430 matches:", c430.rows);

  // What about pedidos or faturamento with CALDERAS RCB / C0033?
  const faturasRcb = await client.query(`
    SELECT f.*, c.codigo, c.trade_name
    FROM core_finance.faturas f
    JOIN core_common.clients c ON c.id = f.client_id
    WHERE c.tax_id ILIKE '%B46127080%' OR c.codigo = 'C0033'
  `);
  console.log("Faturas for RCB/C0033:", faturasRcb.rows);

  await client.end();
}

run().catch(console.error);
