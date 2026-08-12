const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    // 1. Search core_common.clients
    const clientRes = await client.query(`
      SELECT id, codigo, legal_name, trade_name, city, province 
      FROM core_common.clients 
      WHERE trade_name ILIKE '%INSTALACIONES%' 
         OR legal_name ILIKE '%INSTALACIONES%' 
         OR codigo LIKE '%108%' 
         OR codigo LIKE '%280%';
    `);
    console.log('Clients Found:', clientRes.rows);

    if (clientRes.rows.length > 0) {
      const clientObj = clientRes.rows[0];
      const clientCode = clientObj.codigo;
      const clientName = clientObj.trade_name || clientObj.legal_name;

      console.log(`\nClient Selected: ${clientName} (${clientCode})`);

      // 2. Query workers assigned to this client in core_personal.workers
      const workersRes = await client.query(`
        SELECT id, cod_colab, nome, status_trabajador, data_baixa, funcion, cliente, cod_cliente 
        FROM core_personal.workers 
        WHERE cliente ILIKE $1 OR cod_cliente LIKE $2;
      `, [`%${clientName}%`, `%${clientCode}%`]);

      console.log(`\nWorkers assigned to ${clientName} in core_personal.workers (${workersRes.rows.length}):`);
      console.log(workersRes.rows.slice(0, 15));

      // 3. Count active vs inactive workers
      let activeCount = 0;
      let inactiveCount = 0;

      workersRes.rows.forEach(w => {
        const isInactive = w.data_baixa || (w.status_trabajador && w.status_trabajador.toLowerCase() !== 'ativo' && w.status_trabajador.toLowerCase() !== 'active');
        if (isInactive) inactiveCount++;
        else activeCount++;
      });

      console.log(`\nSummary for ${clientName}:`);
      console.log(`  Total Workers: ${workersRes.rows.length}`);
      console.log(`  Active Workers: ${activeCount}`);
      console.log(`  Inactive Workers (Baixa): ${inactiveCount}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
