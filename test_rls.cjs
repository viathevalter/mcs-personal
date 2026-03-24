const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        const uid = 'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb'; // Valter's uid

        console.log("--- Executing query as Authenticated user Valter ---");
        
        // Supabase sets the role to 'authenticated' and passes claims via text settings
        await prodClient.query(`
            SET session_replication_role = DEFAULT;
            SET ROLE authenticated;
            SET request.jwt.claim.sub = '${uid}';
            SET request.jwt.claim.role = 'authenticated';
            SET request.jwt.claims = '{"sub":"${uid}", "role":"authenticated"}';
        `);

        try {
            const emps = await prodClient.query("SELECT * FROM core_common.empresas WHERE is_active = true");
            console.log(`Success! Found ${emps.rows.length} empresas.`);
            console.log(emps.rows);
        } catch(e) {
            console.error("Query Error on core_common.empresas:", e.message);
        }

        try {
            const mems = await prodClient.query("SELECT * FROM core_common.user_memberships WHERE user_id = auth.uid() AND is_active = true");
            console.log(`Success! Found ${mems.rows.length} memberships.`);
            console.log(mems.rows);
        } catch(e) {
            console.error("Query Error on core_common.user_memberships:", e.message);
        }

        try {
            const roles = await prodClient.query("SELECT * FROM public.user_roles WHERE user_id = auth.uid()");
            console.log(`Success! Found ${roles.rows.length} roles.`);
            console.log(roles.rows);
        } catch(e) {
            console.error("Query Error on public.user_roles:", e.message);
        }
        
    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
