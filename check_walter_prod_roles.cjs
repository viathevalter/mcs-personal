const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("=== Auth User Walter ===");
        const authRes = await client.query(`SELECT id, email FROM auth.users WHERE email = 'valter@gestaologinpro.com'`);
        console.log(authRes.rows);

        if (authRes.rows.length > 0) {
            const valterId = authRes.rows[0].id;
            
            console.log("\n=== public.user_roles for Walter ===");
            const rolesRes = await client.query(`SELECT * FROM public.user_roles WHERE user_id = $1`, [valterId]);
            console.log(rolesRes.rows);

            console.log("\n=== public.mcs_users for Walter ===");
            const mcsRes = await client.query(`SELECT * FROM public.mcs_users WHERE id = $1`, [valterId]);
            console.log(mcsRes.rows);

            console.log("\n=== core_common.user_memberships for Walter ===");
            const memRes = await client.query(`SELECT * FROM core_common.user_memberships WHERE user_id = $1`, [valterId]);
            console.log(memRes.rows);
        } else {
            console.log("Walter not found in auth.users!");
        }

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
