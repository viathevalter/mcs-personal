const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT id, codigo, client_id, current_version_id, status 
            FROM core_comercial.estimaciones 
            ORDER BY created_at DESC 
            LIMIT 5;
        `);
        console.table(res.rows);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
