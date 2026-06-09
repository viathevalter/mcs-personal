const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("=== RLS ON core_personal.workers ===");
        const rlsRes = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'core_personal' AND tablename = 'workers'
        `);
        console.log(rlsRes.rows);

        console.log("\n=== POLICIES ON core_personal.workers ===");
        const policiesRes = await client.query(`
            SELECT policyname, cmd, roles, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'core_personal' AND tablename = 'workers'
        `);
        console.log(policiesRes.rows);

        console.log("\n=== FUNCTIONS IN IS_MEMBER ===");
        const fnRes = await client.query(`
            SELECT routine_name, routine_definition 
            FROM information_schema.routines 
            WHERE (routine_schema = 'core_common' AND routine_name IN ('is_member', 'has_role'))
               OR (routine_schema = 'public' AND routine_name = 'get_my_role')
        `);
        for (const row of fnRes.rows) {
            console.log(`--- ${row.routine_name} ---`);
            console.log(row.routine_definition);
        }

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
