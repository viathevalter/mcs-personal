const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- Finding ALL policies that contain 'Super Admin' ---");
        const badPolicies = await prodClient.query(`
            SELECT ns.nspname, tbl.relname, pol.polname, pg_get_expr(pol.polqual, pol.polrelid) AS qual
            FROM pg_policy pol
            JOIN pg_class tbl ON pol.polrelid = tbl.oid
            JOIN pg_namespace ns ON tbl.relnamespace = ns.oid
            WHERE pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%Super Admin%';
        `);
        console.log(badPolicies.rows);

        // Auto-fix loop
        for (const p of badPolicies.rows) {
            let fixedQual = p.qual.replace(/'Super Admin'/g, "'super_admin'");
            console.log(`Fixing policy "${p.polname}" on ${p.nspname}.${p.relname}...`);
            await prodClient.query(`
                DROP POLICY "${p.polname}" ON ${p.nspname}.${p.relname};
                CREATE POLICY "${p.polname}" ON ${p.nspname}.${p.relname}
                FOR SELECT USING (${fixedQual});
            `);
        }
        
    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
