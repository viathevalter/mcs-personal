const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== RLS POLICIES ON core_comercial.pedido_items in DEV ===");
        const res = await client.query(`
            SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'pedido_items' AND schemaname = 'core_comercial'
        `);
        console.log(res.rows);

        console.log("\n=== RLS POLICIES ON core_comercial.pedidos in DEV ===");
        const res2 = await client.query(`
            SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'pedidos' AND schemaname = 'core_comercial'
        `);
        console.log(res2.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
