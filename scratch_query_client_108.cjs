const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    // 1. Search core_common.clients for INSTALACIONES Y SISTEMAS HIDRAULICOS S.L or code 108
    const clientRes = await client.query(`
      SELECT id, name, legal_name, code, is_active, created_at 
      FROM core_common.clients 
      WHERE name ILIKE '%INSTALACIONES%' 
         OR legal_name ILIKE '%INSTALACIONES%' 
         OR code LIKE '%108%' 
         OR code LIKE '%280%';
    `);
    console.log('Client Search Results in core_common.clients:', clientRes.rows);

    if (clientRes.rows.length > 0) {
      const clientObj = clientRes.rows[0];
      const clientId = clientObj.id;
      console.log(`\nFound Client: ${clientObj.name} (${clientObj.code}) -> ID: ${clientId}`);

      // 2. Query worker_hours / worker_assignments for this client in 2026-07 (Julho / 2026)
      const hoursRes = await client.query(`
        SELECT count(*), sum(hours) as total_hours, count(DISTINCT worker_id) as worker_count 
        FROM core_personal.worker_hours 
        WHERE client_id = $1 OR year_month = '2026-07';
      `, [clientId]);
      console.log('\nWorker Hours in 2026-07:', hoursRes.rows);

      // 3. Query workers allocated to this client in core_personal.worker_assignments / worker_hours
      const workersRes = await client.query(`
        SELECT w.id, w.name, w.full_name, w.status, w.funcao, w.cargo, wh.hours, wh.year_month
        FROM core_personal.worker_hours wh
        JOIN core_personal.workers w ON w.id = wh.worker_id
        WHERE wh.client_id = $1
        ORDER BY w.name;
      `, [clientId]);
      console.log(`\nWorkers found for client (${workersRes.rows.length}):`, workersRes.rows.slice(0, 10));

      // 4. Also check core_personal.worker_assignments or vw_worker_allocations
      const allocRes = await client.query(`
        SELECT w.id, w.name, w.full_name, w.status, w.funcao, wa.start_date, wa.end_date
        FROM core_personal.worker_assignments wa
        JOIN core_personal.workers w ON w.id = wa.worker_id
        WHERE wa.client_id = $1;
      `, [clientId]);
      console.log(`\nAllocations in worker_assignments (${allocRes.rows.length}):`, allocRes.rows.slice(0, 10));
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
