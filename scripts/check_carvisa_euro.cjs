const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const lumId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS ALLEY

  console.log("=== WORKERS IN get_hours_control_workers FOR LUMINOUS IN OCT 2026 (CARVISA / EUROCONTAINER) ===");
  const octWorkers = await client.query(`
    SELECT * FROM core_personal.get_hours_control_workers($1, 2026, 10, NULL, NULL)
    WHERE cliente_nombre ILIKE '%CARVISA%' OR cliente_nombre ILIKE '%EUROCONTAINER%'
  `, [lumId]);
  console.log(`Found ${octWorkers.rows.length} workers in Oct 2026:`);
  for (const w of octWorkers.rows) {
    console.log(`  - ${w.cod_colab} ${w.nome} | cliente_nombre="${w.cliente_nombre}" | status=${w.status_trabajador}`);
  }

  console.log("\n=== WORKERS IN get_hours_control_workers FOR LUMINOUS IN SEP 2026 (CARVISA / EUROCONTAINER) ===");
  const sepWorkers = await client.query(`
    SELECT * FROM core_personal.get_hours_control_workers($1, 2026, 9, NULL, NULL)
    WHERE cliente_nombre ILIKE '%CARVISA%' OR cliente_nombre ILIKE '%EUROCONTAINER%'
  `, [lumId]);
  console.log(`Found ${sepWorkers.rows.length} workers in Sep 2026:`);
  for (const w of sepWorkers.rows) {
    console.log(`  - ${w.cod_colab} ${w.nome} | cliente_nombre="${w.cliente_nombre}" | status=${w.status_trabajador}`);
  }

  // Check horas_trabalhadas for these workers in Sep & Oct 2026
  const workerIds = Array.from(new Set([...octWorkers.rows, ...sepWorkers.rows].map(w => w.id)));
  if (workerIds.length > 0) {
    const ht = await client.query(`
      SELECT ht.worker_id, w.cod_colab, w.nome, ht.client_id, c.codigo, c.trade_name,
             min(ht.data_trabalho) as min_d, max(ht.data_trabalho) as max_d, count(*) as cnt, sum(ht.horas_totais) as total_h
      FROM core_finance.horas_trabalhadas ht
      JOIN core_personal.workers w ON w.id = ht.worker_id
      LEFT JOIN core_common.clients c ON c.id = ht.client_id
      WHERE ht.worker_id = ANY($1::uuid[])
        AND ht.data_trabalho >= '2026-09-01'
      GROUP BY ht.worker_id, w.cod_colab, w.nome, ht.client_id, c.codigo, c.trade_name
    `, [workerIds]);
    console.log("\n=== horas_trabalhadas SINCE 2026-09-01 FOR THESE WORKERS ===");
    console.log(ht.rows);

    const wh = await client.query(`
      SELECT wh.worker_id, w.cod_colab, w.nome, wh.period_year, wh.period_month, wh.cliente_nombre, wh.status, wh.horas_totais
      FROM core_personal.worker_hours wh
      JOIN core_personal.workers w ON w.id = wh.worker_id
      WHERE wh.worker_id = ANY($1::uuid[])
        AND wh.period_year = 2026 AND wh.period_month IN (9, 10)
    `, [workerIds]);
    console.log("\n=== worker_hours IN SEP/OCT 2026 FOR THESE WORKERS ===");
    console.log(wh.rows);
  }

  await client.end();
}
run().catch(console.error);
