const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const mm = await client.query(`
    SELECT id, codigo, trade_name, legal_name, tax_id, vies_status, vies_valid
    FROM core_common.clients
    WHERE trade_name ILIKE '%METALMANT%' OR legal_name ILIKE '%METALMANT%'
       OR trade_name ILIKE '%METALLIC%' OR legal_name ILIKE '%METALLIC%'
  `);
  console.log("METALMANT / METALLIC clients:", mm.rows);

  // Check E1532 JORGE EDUARDO VARGAS CASTAÑEDA
  const e1532 = await client.query(`
    SELECT * FROM core_personal.vw_worker_allocations WHERE cod_colab = 'E1532'
  `);
  console.log("E1532 allocations:", e1532.rows);
  const w1532 = await client.query(`
    SELECT cod_colab, nome, status_trabajador, data_baixa, cliente, cod_cliente FROM core_personal.workers WHERE cod_colab = 'E1532'
  `);
  console.log("E1532 worker:", w1532.rows);

  // Check E1701, E0447, E0446 (METALLIC SOLUTIONS)
  const metWorkers = await client.query(`
    SELECT * FROM core_personal.vw_worker_allocations WHERE cod_colab IN ('E1701', 'E0447', 'E0446')
  `);
  console.log("METALLIC SOLUTIONS allocations:", metWorkers.rows);

  await client.end();
}
run().catch(console.error);
