const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== core_common.is_member DEFINITION IN DEV ===");
        const res = await client.query(`
            SELECT pg_get_functiondef(p.oid)
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'core_common' AND p.proname = 'is_member'
        `);
        console.log(res.rows[0]?.pg_get_functiondef);

        console.log("\n=== public.get_my_role DEFINITION IN DEV ===");
        const res2 = await client.query(`
            SELECT pg_get_functiondef(p.oid)
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'get_my_role'
        `);
        console.log(res2.rows[0]?.pg_get_functiondef);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
