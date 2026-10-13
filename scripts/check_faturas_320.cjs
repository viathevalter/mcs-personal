const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  console.log("Checking public.pedidos with 320 or 430:");
  const pedidos = await client.query(`
    SELECT id, cod_pedido, cod_cliente, id_cliente, id_empresa, status_pedido, created_sp, created_by
    FROM public.pedidos
    WHERE cod_cliente IN ('320', '430', 'C0320', 'C0430', '0320', '0430')
       OR cod_cliente LIKE '%320%' OR cod_cliente LIKE '%430%'
    LIMIT 20
  `);
  console.log("Pedidos matching 320/430:", pedidos.rows);

  // Check what clients exist in public.pedidos vs core_common.clients
  const sampleCodClientes = await client.query(`
    SELECT DISTINCT cod_cliente FROM public.pedidos WHERE cod_cliente IS NOT NULL LIMIT 20
  `);
  console.log("Sample cod_cliente in public.pedidos:", sampleCodClientes.rows.map(r => r.cod_cliente));

  // Check faturas
  const faturas = await client.query(`
    SELECT f.id, f.client_id, f.fatura_numero, f.status, f.data_emissao, c.codigo, c.trade_name, c.legal_name, c.tax_id
    FROM core_finance.faturas f
    LEFT JOIN core_common.clients c ON c.id = f.client_id
  `);
  console.log("Total faturas:", faturas.rows.length);
  if (faturas.rows.length > 0) {
    console.log("Sample faturas:", faturas.rows.slice(0, 10));
  }

  // Also check if there's any other invoice/faturamento table in public or other schemas
  const faturamentoTables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name ILIKE '%fatur%'
  `);
  console.log("All fatur* tables:", faturamentoTables.rows);

  await client.end();
}

run().catch(console.error);
