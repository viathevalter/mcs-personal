const { Client } = require('pg');

const connStr = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: connStr });
    await client.connect();

    console.log('--- Inspecting core_personal.workers columns ---');

    const resCols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'core_personal' AND table_name = 'workers'
    `);
    console.log('Columns of core_personal.workers:', resCols.rows.map(c => c.column_name));

    // Get 5 sample workers
    const resW = await client.query(`SELECT * FROM core_personal.workers LIMIT 5`);
    console.log('Sample worker:', resW.rows[0]);

    await client.end();
}

run().catch(console.error);
