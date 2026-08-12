const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    const targetId = '8a040637-d8c8-f52a-52ad-c24e2fc9dda2';
    const targetCode = 'C0108';
    const targetName = 'INSTALACIONES Y SISTEMAS HIDRAULICOS S.L';

    console.log(`=== AUDITANDO CLIENTE C0108: ${targetName} ===`);

    // 1. Check core_personal.workers
    const w1 = await client.query(`
      SELECT id, cod_colab, nome, status_trabajador, data_baixa, funcion, cliente, cod_cliente 
      FROM core_personal.workers 
      WHERE cliente ILIKE $1 OR cod_cliente LIKE $2 OR cod_cliente LIKE '%108%';
    `, [`%HIDRAULICOS%`, `%${targetCode}%`]);
    console.log(`\nWorkers in core_personal.workers matching C0108 / HIDRAULICOS (${w1.rows.length}):`);
    console.log(w1.rows);

    // 2. Check core_personal.worker_hours
    const w2 = await client.query(`
      SELECT wh.*, w.nome, w.status_trabajador, w.data_baixa, w.funcion
      FROM core_personal.worker_hours wh
      LEFT JOIN core_personal.workers w ON w.id = wh.worker_id
      WHERE wh.cliente_nombre ILIKE '%HIDRAULICOS%' OR wh.cliente_nombre ILIKE '%C0108%';
    `);
    console.log(`\nHours in core_personal.worker_hours (${w2.rows.length}):`);
    console.log(w2.rows.slice(0, 10));

    // 3. Check core_finance.horas_trabalhadas
    const w3 = await client.query(`
      SELECT ht.*, w.nome, w.status_trabajador, w.data_baixa, w.funcion
      FROM core_finance.horas_trabalhadas ht
      LEFT JOIN core_personal.workers w ON w.id = ht.worker_id
      WHERE ht.client_id = $1;
    `, [targetId]);
    console.log(`\nHours in core_finance.horas_trabalhadas (${w3.rows.length}):`);
    console.log(w3.rows.slice(0, 10));

    // 4. Check core_personal.worker_assignments
    const w4 = await client.query(`
      SELECT wa.*, w.nome, w.status_trabajador, w.data_baixa, w.funcion
      FROM core_personal.worker_assignments wa
      LEFT JOIN core_personal.workers w ON w.id = wa.worker_id
      WHERE wa.client_id = $1;
    `, [targetId]);
    console.log(`\nAssignments in core_personal.worker_assignments (${w4.rows.length}):`);
    console.log(w4.rows.slice(0, 10));

    // 5. Check public.colaboradores or public.trabalhadores or public.contratados
    const w5 = await client.query(`
      SELECT id, nome, cliente, cod_cliente, funcao 
      FROM public.trabalhadores 
      WHERE cliente ILIKE '%HIDRAULICOS%' OR cod_cliente LIKE '%108%';
    `);
    console.log(`\nTrabalhadores em public.trabalhadores (${w5.rows.length}):`);
    console.log(w5.rows.slice(0, 10));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
