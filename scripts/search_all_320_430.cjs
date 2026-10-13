const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  console.log("Searching faturas for 320 and 430:");
  const faturas = await client.query(`
    SELECT f.*, c.codigo, c.trade_name, c.legal_name, c.tax_id
    FROM core_finance.faturas f
    LEFT JOIN core_common.clients c ON c.id = f.client_id
    WHERE f.fatura_numero LIKE '%320%' OR f.fatura_numero LIKE '%430%'
       OR f.ajustes_json::text LIKE '%320%' OR f.ajustes_json::text LIKE '%430%'
       OR c.trade_name ILIKE '%320%' OR c.trade_name ILIKE '%430%'
  `);
  console.log("Faturas with 320/430:", faturas.rows.map(r => ({
    fatura_numero: r.fatura_numero,
    codigo: r.codigo,
    trade_name: r.trade_name,
    tax_id: r.tax_id
  })));

  // Could the client code be in another table?
  // Let's check core_operacoes.pedidos and core_comercial.pedidos
  console.log("\nChecking core_operacoes.pedidos:");
  const opPedidos = await client.query(`
    SELECT p.id, p.codigo, p.client_id, p.client_name, p.client_legal_name, c.codigo as client_codigo
    FROM core_operacoes.pedidos p
    LEFT JOIN core_common.clients c ON c.id = p.client_id
    WHERE p.codigo LIKE '%320%' OR p.codigo LIKE '%430%'
       OR c.codigo LIKE '%320%' OR c.codigo LIKE '%430%'
  `);
  console.log("Op Pedidos matching 320/430:", opPedidos.rows);

  console.log("\nChecking core_comercial.pedidos:");
  const comPedidos = await client.query(`
    SELECT p.id, p.codigo, p.client_id, c.codigo as client_codigo, c.trade_name
    FROM core_comercial.pedidos p
    LEFT JOIN core_common.clients c ON c.id = p.client_id
    WHERE p.codigo LIKE '%320%' OR p.codigo LIKE '%430%'
       OR c.codigo LIKE '%320%' OR c.codigo LIKE '%430%'
  `);
  console.log("Com Pedidos matching 320/430:", comPedidos.rows);

  // What about any table where a column value equals '320' or '430'?
  // Let's check public.clientes if it exists or sharepoint data!
  const hasPublicClientes = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clientes'
  `);
  console.log("public.clientes exists?", hasPublicClientes.rows);

  // What about dados_sharepoint directory in the repo?
  await client.end();
}

run().catch(console.error);
