const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- RLS Policies for core_common.empresas ---");
        const policies = await prodClient.query(`
            SELECT pol.polname, pol.polcmd, pg_get_expr(pol.polqual, pol.polrelid) AS qual
            FROM pg_policy pol
            JOIN pg_class tbl ON pol.polrelid = tbl.oid
            JOIN pg_namespace ns ON tbl.relnamespace = ns.oid
            WHERE ns.nspname = 'core_common' AND tbl.relname = 'empresas';
        `);
        console.log(policies.rows);

    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
