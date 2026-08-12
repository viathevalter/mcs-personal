const { Client } = require('pg');

const connStr = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: connStr });
    await client.connect();

    console.log('--- Finding INSTALACIONES Y SISTEMAS HIDRAULICOS ---');

    const resClients = await client.query(`
        SELECT id, trade_name, legal_name, codigo 
        FROM core_common.clients 
        WHERE trade_name ILIKE '%INSTALACIONES%' OR legal_name ILIKE '%INSTALACIONES%'
    `);
    console.log('Matching clients:', resClients.rows);

    await client.end();
}

run().catch(console.error);
