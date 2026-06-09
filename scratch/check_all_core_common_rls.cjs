const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== ALL RLS POLICIES IN CORE_COMMON DEV ===");
        const res = await client.query(`
            SELECT tablename, policyname, cmd, roles, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'core_common'
            ORDER BY tablename, cmd
        `);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
