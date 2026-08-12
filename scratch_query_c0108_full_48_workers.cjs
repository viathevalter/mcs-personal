const { Client } = require('pg');

const connStr = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: connStr });
    await client.connect();

    console.log('--- Querying DB directly for INSTALACIONES Y SISTEMAS HIDRAULICOS S.L. ---');

    // 1. Get Client record
    const resClient = await client.query(`
        SELECT id, name, legal_name, code, city 
        FROM core_common.clients 
        WHERE name ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' OR legal_name ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%'
    `);
    console.log('Client record:', resClient.rows);

    const clientId = resClient.rows[0]?.id;

    // 2. Query workers assigned to this client on core_personal.workers
    const resWorkers = await client.query(`
        SELECT id, nome, funcion, cliente_nombre, status_trabajador, data_baixa, cod_colab
        FROM core_personal.workers
        WHERE cliente_nombre ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%'
        ORDER BY nome ASC
    `);
    console.log(`Found ${resWorkers.rows.length} workers in core_personal.workers for this client:`);
    console.log(resWorkers.rows.slice(0, 10));

    // 3. Query worker_hours in core_personal.worker_hours for July 2026 (2026-07)
    const resHours = await client.query(`
        SELECT wh.worker_id, w.nome, w.funcion, wh.period_year, wh.period_month, wh.status, wh.total_hours
        FROM core_personal.worker_hours wh
        LEFT JOIN core_personal.workers w ON w.id = wh.worker_id
        WHERE (w.cliente_nombre ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' OR wh.client_id = $1)
          AND wh.period_year = 2026 AND wh.period_month = 7
    `, [clientId || '00000000-0000-0000-0000-000000000000']);

    console.log(`Found ${resHours.rows.length} worker_hours entries in 2026-07 for this client:`);
    console.log(resHours.rows.slice(0, 10));

    // 4. Query client_worker_tariffs & client_tariffs in core_common
    const resTariffs = await client.query(`
        SELECT * FROM core_common.client_tariffs WHERE client_id = $1
    `, [clientId || '00000000-0000-0000-0000-000000000000']);
    console.log('Client Job Tariffs:', resTariffs.rows);

    const resWorkerTariffs = await client.query(`
        SELECT * FROM core_common.client_worker_tariffs WHERE client_id = $1
    `, [clientId || '00000000-0000-0000-0000-000000000000']);
    console.log('Client Worker Exception Tariffs:', resWorkerTariffs.rows);

    // 5. Query faturas in core_finance for this client in July 2026
    const resFaturas = await client.query(`
        SELECT * FROM core_finance.faturas WHERE client_id = $1
    `, [clientId || '00000000-0000-0000-0000-000000000000']);
    console.log('Client Faturas in DB:', resFaturas.rows);

    await client.end();
}

run().catch(console.error);
