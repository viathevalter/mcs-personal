const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("=== RLS POLICIES FOR empresas IN PROD ===");
        const res = await client.query(`
            SELECT tablename, policyname, schemaname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'empresas' AND schemaname = 'core_common'
        `);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
