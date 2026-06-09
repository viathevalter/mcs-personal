const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT pg_get_functiondef(p.oid) as def
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'core_comercial' AND p.proname = 'criar_estimacion_completa';
        `);
        if (res.rows.length > 0) {
            console.log("Current function definition in DB:");
            console.log(res.rows[0].def);
        } else {
            console.log("Function not found.");
        }
    } catch (err) {
        console.error("Query failed:", err);
    } finally {
        await client.end();
    }
}

run();
