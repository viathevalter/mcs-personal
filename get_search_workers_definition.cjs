const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== core_personal.search_workers DEFINITION ===");
        const res = await client.query(`
            SELECT prosrc 
            FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'core_personal' AND p.proname = 'search_workers'
        `);
        if (res.rows.length > 0) {
            console.log(res.rows[0].prosrc);
        } else {
            console.log("Function search_workers not found.");
        }

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
