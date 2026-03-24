const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- RLS for core_common.user_memberships ---");
        const rlsM = await prodClient.query(`
            SELECT pol.polname, pg_get_expr(pol.polqual, pol.polrelid) AS qual
            FROM pg_policy pol JOIN pg_class tbl ON pol.polrelid = tbl.oid JOIN pg_namespace ns ON tbl.relnamespace = ns.oid
            WHERE ns.nspname = 'core_common' AND tbl.relname = 'user_memberships';
        `);
        console.log(rlsM.rows);

        console.log("\n--- RLS for public.user_roles ---");
        const rlsR = await prodClient.query(`
            SELECT pol.polname, pg_get_expr(pol.polqual, pol.polrelid) AS qual
            FROM pg_policy pol JOIN pg_class tbl ON pol.polrelid = tbl.oid JOIN pg_namespace ns ON tbl.relnamespace = ns.oid
            WHERE ns.nspname = 'public' AND tbl.relname = 'user_roles';
        `);
        console.log(rlsR.rows);

    } catch(e) {
        console.error(e.message);
    } finally {
        await prodClient.end();
    }
}
run();
