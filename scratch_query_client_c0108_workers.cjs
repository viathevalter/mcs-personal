const { Client } = require('pg');

const connStr = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: connStr });
    await client.connect();

    console.log('--- Inspecting workers for INSTALACIONES Y SISTEMAS HIDRÁULICOS (C0108) ---');

    const clientId = '8a040637-d8c8-f52a-52ad-c24e2fc9dda2';

    // 1. Query core_personal.workers by cliente_nombre or client_id
    const resWorkers = await client.query(`
        SELECT id, nome, funcion, cliente_nombre, status_trabajador, data_baixa, cod_colab
        FROM core_personal.workers
        WHERE cliente_nombre ILIKE '%INSTALACIONES Y SISTEMAS HIDRÁULICOS%'
           OR cliente_nombre ILIKE '%INSTALACIONES Y SIS. HIDRAULICOS%'
    `);
    console.log(`Found ${resWorkers.rows.length} workers in core_personal.workers with matching cliente_nombre:`);

    // 2. Query worker_hours for July 2026 (period_year=2026, period_month=7)
    const resWH = await client.query(`
        SELECT wh.worker_id, w.nome, w.funcion, w.cliente_nombre, wh.period_year, wh.period_month, wh.status, wh.total_hours
        FROM core_personal.worker_hours wh
        JOIN core_personal.workers w ON w.id = wh.worker_id
        WHERE (w.cliente_nombre ILIKE '%INSTALACIONES Y SISTEMAS HIDRÁULICOS%' OR w.cliente_nombre ILIKE '%INSTALACIONES Y SIS. HIDRAULICOS%')
          AND wh.period_year = 2026 AND wh.period_month = 7
    `);
    console.log(`Found ${resWH.rows.length} worker_hours rows in July 2026 for this client:`);

    // 3. Check core_finance.horas_trabalhadas
    const resHT = await client.query(`
        SELECT ht.worker_id, w.nome, ht.horas_totais, ht.tarifa_faturada
        FROM core_finance.horas_trabalhadas ht
        JOIN core_personal.workers w ON w.id = ht.worker_id
        WHERE ht.client_id = $1 OR w.cliente_nombre ILIKE '%INSTALACIONES Y SISTEMAS HIDRÁULICOS%'
    `, [clientId]);
    console.log(`Found ${resHT.rows.length} horas_trabalhadas rows in core_finance for this client`);

    await client.end();
}

run().catch(console.error);
