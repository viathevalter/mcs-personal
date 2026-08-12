const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    console.log('=== CALCULANDO DADOS REAIS DE TODOS OS CLIENTES E TRABALHADORES EM 2026-07 ===');

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

    console.log(`Linhas agregadas encontradas (${res.rows.length}):`);

    // Group by client
    const clientMap = new Map();
    res.rows.forEach(row => {
      const clientName = row.trade_name || row.legal_name;
      if (!clientMap.has(row.client_id)) {
        clientMap.set(row.client_id, {
          id: row.client_id,
          code: row.client_code,
          name: clientName,
          city: row.city || row.province || 'Espanha',
          workers: []
        });
      }

      const isInactive = Boolean(row.worker_data_baixa) || 
                         (row.worker_status && row.worker_status.toLowerCase().includes('inativ')) ||
                         (row.worker_status && row.worker_status.toLowerCase().includes('baixa'));

      clientMap.get(row.client_id).workers.push({
        id: row.worker_id,
        name: row.worker_name,
        role: row.worker_role || 'Trabalhador Especializado',
        hours: Number(row.total_hours || 0),
        rate: Number(row.avg_rate || 25),
        status: isInactive ? 'Inativo' : 'Ativo',
        statusRaw: row.worker_status
      });
    });

    console.log(`\nClientes com horas registradas em Julho/2026: ${clientMap.size}`);
    clientMap.forEach(clientData => {
      const totalHours = clientData.workers.reduce((a, b) => a + b.hours, 0);
      const activeWorkers = clientData.workers.filter(w => w.status === 'Ativo').length;
      const inactiveWorkers = clientData.workers.filter(w => w.status === 'Inativo').length;
      console.log(`\n🏢 ${clientData.name} (${clientData.code}):`);
      console.log(`   - Total Trabalhadores: ${clientData.workers.length} (${activeWorkers} Ativos, ${inactiveWorkers} Inativos)`);
      console.log(`   - Total Horas em Jul/2026: ${totalHours.toFixed(1)}h`);
      console.log(`   - Primeiros Trabalhadores:`, clientData.workers.slice(0, 5));
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
