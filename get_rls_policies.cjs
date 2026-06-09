const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== RLS POLICIES FOR SOLICITUD_TAREAS IN DEV ===");
        const res = await client.query(`
            SELECT tablename, policyname, schemaname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'solicitud_tareas'
        `);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
