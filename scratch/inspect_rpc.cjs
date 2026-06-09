const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("=== INSPECTING search_workers DEFINITION IN PROD ===");
        const res = await client.query(`
            SELECT 
                pg_get_functiondef(p.oid) as def
            FROM pg_catalog.pg_proc p
            JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'core_personal' AND p.proname = 'search_workers'
        `);
        console.log(res.rows[0].def);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}
run();
