const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- Checking user: valter@gestaologinpro.com ---");
        const u = await prodClient.query("SELECT id FROM auth.users WHERE email = 'valter@gestaologinpro.com'");
        if (u.rows.length === 0) return console.log("User not found!");
        const uid = u.rows[0].id;
        console.log("UserID:", uid);

        const r = await prodClient.query("SELECT * FROM public.user_roles WHERE user_id = $1", [uid]);
        console.log("\npublic.user_roles:\n", r.rows);

        const m = await prodClient.query("SELECT * FROM core_common.user_memberships WHERE user_id = $1", [uid]);
        console.log("\ncore_common.user_memberships:\n", m.rows);

        const mcs = await prodClient.query("SELECT * FROM public.mcs_users WHERE user_id = $1", [uid]);
        console.log("\npublic.mcs_users:\n", mcs.rows);

    } catch(e) {
        console.error(e.message);
    } finally {
        await prodClient.end();
    }
}
run();
