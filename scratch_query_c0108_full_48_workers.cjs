const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT 
        w.id as worker_id,
        w.nome as worker_name,
        w.status_trabajador,
        w.data_baixa,
        w.funcion as worker_role,
        SUM(CAST(ht.horas_totais AS NUMERIC)) as total_hours,
        AVG(CAST(ht.tarifa_faturada AS NUMERIC)) as avg_rate
      FROM core_finance.horas_trabalhadas ht
      JOIN core_personal.workers w ON w.id = ht.worker_id
      WHERE ht.client_id = '8a040637-d8c8-f52a-52ad-c24e2fc9dda2'
        AND ht.data_trabalho >= '2026-07-01' AND ht.data_trabalho <= '2026-07-31T23:59:59Z'
      GROUP BY w.id, w.nome, w.status_trabajador, w.data_baixa, w.funcion
      ORDER BY w.nome;
    `);

    console.log(`Total Workers Found for C0108 (Jul/2026): ${res.rows.length}`);
    
    let activeCount = 0;
    let inactiveCount = 0;

    const list = res.rows.map(r => {
      const isBaixa = Boolean(r.data_baixa);
      const isStatusInactive = r.status_trabajador && (
        r.status_trabajador.toLowerCase().includes('inativ') ||
        r.status_trabajador.toLowerCase().includes('baixa') ||
        r.status_trabajador.toLowerCase().includes('deslig')
      );

      const isInactive = isBaixa || isStatusInactive;
      if (isInactive) inactiveCount++;
      else activeCount++;

      return {
        id: r.worker_id,
        name: r.worker_name,
        role: r.worker_role || 'Trabalhador Especializado',
        hours: Number(r.total_hours || 0),
        hourlyRateClient: Number(r.avg_rate || 25),
        status: isInactive ? 'Inativo' : 'Ativo',
        statusRaw: r.status_trabajador,
        dataBaixa: r.data_baixa
      };
    });

    console.log(`Active: ${activeCount} | Inactive: ${inactiveCount}`);
    console.log('\nFull 48 Workers List:\n', JSON.stringify(list, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
