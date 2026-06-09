const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        const res = await client.query(`
            SELECT pg_get_functiondef(p.oid) 
            FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'core_common' AND p.proname = 'is_admin_of_empresa'
        `);
        if (res.rows.length > 0) {
            console.log("=== is_admin_of_empresa definition ===");
            console.log(res.rows[0].pg_get_functiondef);
        } else {
            console.log("Function is_admin_of_empresa not found in core_common");
        }

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
