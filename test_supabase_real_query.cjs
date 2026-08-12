const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT 
        c.id as client_id,
        c.codigo as client_code,
        c.legal_name,
        c.trade_name,
        c.city,
        c.province,
        w.id as worker_id,
        w.nome as worker_name,
        w.funcion as worker_role,
        w.status_trabajador as worker_status,
        w.data_baixa as worker_data_baixa,
        SUM(CAST(ht.horas_totais AS NUMERIC)) as total_hours,
        AVG(CAST(ht.tarifa_faturada AS NUMERIC)) as avg_rate
      FROM core_finance.horas_trabalhadas ht
      JOIN core_common.clients c ON c.id = ht.client_id
      JOIN core_personal.workers w ON w.id = ht.worker_id
      WHERE ht.data_trabalho >= '2026-07-01' AND ht.data_trabalho <= '2026-07-31T23:59:59Z'
      GROUP BY c.id, c.codigo, c.legal_name, c.trade_name, c.city, c.province, w.id, w.nome, w.funcion, w.status_trabajador, w.data_baixa
      ORDER BY c.legal_name, w.nome;
    `);

    console.log(`Aggregation successful. Total client-worker pairs in Jul/2026: ${res.rows.length}`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
