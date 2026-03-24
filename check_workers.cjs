const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- Checking public.workers Count ---");
        const wCount = await prodClient.query("SELECT COUNT(*) FROM public.workers");
        console.log("Total workers in PROD:", wCount.rows[0].count);
        
        const wInfo = await prodClient.query(`
            SELECT e.nome as Empresa, COUNT(w.id) as Total 
            FROM public.workers w 
            JOIN core_common.empresas e ON w.empresa_id = e.id 
            GROUP BY e.nome
        `);
        console.log("Total per Empresa:", wInfo.rows);
        
        console.log("\n--- Executing public.workers as Valter ---");
        const uid = 'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb'; 
        await prodClient.query(`
            SET session_replication_role = DEFAULT;
            SET ROLE authenticated;
            SET request.jwt.claim.sub = '${uid}';
            SET request.jwt.claim.role = 'authenticated';
            SET request.jwt.claims = '{"sub":"${uid}", "role":"authenticated"}';
        `);

        try {
            const myWorkers = await prodClient.query("SELECT COUNT(*) FROM public.workers");
            console.log("Valter can read workers count:", myWorkers.rows[0].count);
            
            // Check RLS policies if it blocks
            if (myWorkers.rows[0].count == 0 && wCount.rows[0].count > 0) {
                console.log("\nRLS IS BLOCKING VALTER FROM READING WORKERS!");
                
                // Let's read the RLS policies
                await prodClient.query("RESET ROLE");
                const policies = await prodClient.query(`
                    SELECT pol.polname, pg_get_expr(pol.polqual, pol.polrelid) AS qual
                    FROM pg_policy pol JOIN pg_class tbl ON pol.polrelid = tbl.oid JOIN pg_namespace ns ON tbl.relnamespace = ns.oid
                    WHERE ns.nspname = 'public' AND tbl.relname = 'workers';
                `);
                console.log("Workers RLS Policies:", policies.rows);
            }
        } catch(e) {
            console.error(e.message);
        }

    } catch(e) {
        console.error(e.message);
    } finally {
        await prodClient.end();
    }
}
run();
