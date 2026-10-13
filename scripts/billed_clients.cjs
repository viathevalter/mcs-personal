const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const billedClients = await client.query(`
    SELECT 
      c.id, c.codigo, c.trade_name, c.legal_name, c.tax_id, c.vies_status, c.vies_valid,
      COUNT(f.id) as faturas_count,
      array_agg(f.fatura_numero) as faturas
    FROM core_finance.faturas f
    JOIN core_common.clients c ON c.id = f.client_id
    GROUP BY c.id, c.codigo, c.trade_name, c.legal_name, c.tax_id, c.vies_status, c.vies_valid
    ORDER BY c.codigo ASC
  `);

  console.log(`Found ${billedClients.rows.length} clients with invoices in core_finance.faturas:`);
  for (const r of billedClients.rows) {
    console.log(`Client ${r.codigo} | ${r.trade_name} (${r.tax_id}) | VIES: ${r.vies_status} (valid: ${r.vies_valid}) | ${r.faturas_count} faturas`);
  }

  // Also check faturas_proforma!
  const proformaClients = await client.query(`
    SELECT DISTINCT empresa_id, count(*) FROM core_finance.faturas_proforma GROUP BY empresa_id
  `);
  console.log("Proforma counts:", proformaClients.rows);

  await client.end();
}

run().catch(console.error);
