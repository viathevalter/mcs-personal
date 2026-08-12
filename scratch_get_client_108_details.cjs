const { Client } = require('pg');

const connStr = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: connStr });
    await client.connect();

    console.log('=== QUERYING WORKERS FOR INSTALACIONES Y SISTEMAS HIDRAULICOS S.L ===');

    const resWorkers = await client.query(`
        SELECT id, cod_colab, nome, cliente, contratante, funcion, status_trabajador, data_baixa 
        FROM core_personal.workers 
        WHERE cliente ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' 
           OR cliente ILIKE '%INSTALACIONES Y SIS. HIDRAULICOS%'
        ORDER BY nome ASC
    `);

    console.log(`Total workers returned: ${resWorkers.rows.length}`);
    const activeWorkers = resWorkers.rows.filter(w => !w.data_baixa && (!w.status_trabajador || !w.status_trabajador.toLowerCase().includes('inativ')));
    console.log(`Active workers count (without baixa/inativo): ${activeWorkers.length}`);

    // Inspect columns of core_personal.worker_hours
    const resWHCols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'core_personal' AND table_name = 'worker_hours'
    `);
    console.log('Columns of core_personal.worker_hours:', resWHCols.rows.map(c => c.column_name));

    // Get sample worker_hours entries
    const resWH = await client.query(`
        SELECT * FROM core_personal.worker_hours LIMIT 10
    `);
    console.log('Sample worker_hours row:', resWH.rows[0]);

    await client.end();
}

run().catch(console.error);
