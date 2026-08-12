const { Client } = require('pg');

const connStr = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: connStr });
    await client.connect();

    console.log('=== REAL DATA QUERY FOR INSTALACIONES Y SISTEMAS HIDRÁULICOS ===');

    // 1. Query workers where cliente ILIKE '%INSTALACIONES%'
    const resWorkers = await client.query(`
        SELECT id, cod_colab, nome, cliente, contratante, funcion, status_trabajador, data_baixa 
        FROM core_personal.workers 
        WHERE cliente ILIKE '%INSTALACIONES Y SISTEMAS HIDRÁULICOS%' 
           OR cliente ILIKE '%INSTALACIONES Y SIS. HIDRAULICOS%'
           OR cliente ILIKE '%INSTALACIONES%'
    `);
    console.log(`Total workers with cliente containing INSTALACIONES: ${resWorkers.rows.length}`);

    // Group by exact cliente string
    const clientGroups = new Map();
    resWorkers.rows.forEach(w => {
        const cName = w.cliente;
        clientGroups.set(cName, (clientGroups.get(cName) || 0) + 1);
    });
    console.log('Workers count grouped by exact cliente string:', Object.fromEntries(clientGroups));

    // Get specific list for INSTALACIONES Y SISTEMAS HIDRAULICOS S.L.
    const hydraulicWorkers = resWorkers.rows.filter(w => 
        w.cliente?.toLowerCase().includes('hidraulicos') || 
        w.cliente?.toLowerCase().includes('hidráulicos')
    );
    console.log(`Specific worker count for INSTALACIONES Y SISTEMAS HIDRÁULICOS: ${hydraulicWorkers.length}`);

    // 2. Query worker_hours for July 2026 (2026-07)
    const workerIds = hydraulicWorkers.map(w => w.id);
    if (workerIds.length > 0) {
        const resWH = await client.query(`
            SELECT worker_id, period_year, period_month, status, normal_hours, extra_hours, total_hours
            FROM core_personal.worker_hours
            WHERE period_year = 2026 AND period_month = 7
              AND worker_id = ANY($1::uuid[])
        `, [workerIds]);
        console.log(`Found ${resWH.rows.length} worker_hours entries in July 2026 for these workers`);
    }

    // 3. Query horas_trabalhadas in core_finance for July 2026
    const resHT = await client.query(`
        SELECT ht.*, c.trade_name
        FROM core_finance.horas_trabalhadas ht
        LEFT JOIN core_common.clients c ON c.id = ht.client_id
        WHERE ht.data_trabalho >= '2026-07-01' AND ht.data_trabalho <= '2026-07-31'
    `);
    console.log(`Total horas_trabalhadas entries in July 2026: ${resHT.rows.length}`);

    // 4. Query faturas in core_finance for July 2026
    const resFaturas = await client.query(`
        SELECT f.*, c.trade_name 
        FROM core_finance.faturas f
        LEFT JOIN core_common.clients c ON c.id = f.client_id
    `);
    console.log(`Total faturas in DB: ${resFaturas.rows.length}`);
    resFaturas.rows.forEach(f => {
        console.log(`Fatura #${f.fatura_numero} | Client: ${f.trade_name} | Total: € ${f.total_geral || f.valor_total || 0} | Status: ${f.status}`);
    });

    await client.end();
}

run().catch(console.error);
