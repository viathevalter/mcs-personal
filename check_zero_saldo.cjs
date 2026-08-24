const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkZeroBalance(conn, label) {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    console.log(`\n=== Checking zero balance with non-Pago status in ${label} ===`);
    const res = await client.query(`
      SELECT id, sp_id, empresa, cliente, num_doc, periodo_fat, data_emissao, dt_venc, valot_total, saldo_a_pagar, status, hist_valor_parcial, form_receb, dt_recebimento
      FROM public.contas_receber
      WHERE (saldo_a_pagar IS NOT NULL AND TRIM(saldo_a_pagar) != '' AND saldo_a_pagar::numeric <= 0)
        AND status != 'Pago';
    `);
    console.log(`Found ${res.rows.length} rows in ${label}:`);
    console.table(res.rows);

    const llanos = await client.query(`
      SELECT id, sp_id, empresa, cliente, num_doc, periodo_fat, data_emissao, dt_venc, valot_total, saldo_a_pagar, status, hist_valor_parcial, dt_recebimento
      FROM public.contas_receber
      WHERE num_doc = '0567' OR (cliente ILIKE '%MECANIZADOS LLANOS%' AND periodo_fat ILIKE '%diciembre%2025%');
    `);
    console.log(`\n--- MECANIZADOS LLANOS doc 0567 in ${label} ---`);
    console.table(llanos.rows);

  } finally {
    await client.end();
  }
}

async function run() {
  await checkZeroBalance(devConnectionString, 'DEV');
  await checkZeroBalance(prodConnectionString, 'PROD');
}

run();
