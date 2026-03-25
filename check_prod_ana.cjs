const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("=== mcs_department_members ===");
        const mcsDep = await client.query(`SELECT id, usuario, correoempresarial, user_id FROM public.mcs_department_members WHERE correoempresarial IN ('ana@gestaologinpro.com', 'alex@gestaologinpro.com')`);
        console.log(mcsDep.rows);

        console.log("\n=== auth.users ===");
        const authUsers = await client.query(`SELECT id, email, raw_user_meta_data FROM auth.users WHERE email IN ('ana@gestaologinpro.com', 'alex@gestaologinpro.com')`);
        console.log(authUsers.rows);

        console.log("\n=== public.user_roles ===");
        const roles = await client.query(`SELECT * FROM public.user_roles WHERE email IN ('ana@gestaologinpro.com', 'alex@gestaologinpro.com')`);
        console.log(roles.rows);

        console.log("\n=== core_common.user_memberships (Ana) ===");
        if (authUsers.rows.length > 0) {
            const anaId = authUsers.rows.find(u => u.email === 'ana@gestaologinpro.com')?.id;
            if (anaId) {
                const memberships = await client.query(`SELECT * FROM core_common.user_memberships WHERE user_id = $1`, [anaId]);
                console.log(memberships.rows);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
run();
