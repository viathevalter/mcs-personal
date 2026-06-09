const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("Searching for valter@gestaologinpro.com in PROD...");
        
        const authUsers = await client.query("SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'valter@gestaologinpro.com';");
        console.log("Auth Users in PROD:", authUsers.rows);
        
        const userRoles = await client.query("SELECT * FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'valter@gestaologinpro.com') OR user_id = 'ee4320ae-2d42-419e-a4a1-6f30f41d3680';");
        console.log("User Roles in PROD:", userRoles.rows);
        
        const mcsUsers = await client.query("SELECT * FROM public.mcs_users WHERE id IN (SELECT id FROM auth.users WHERE email = 'valter@gestaologinpro.com') OR id = 'ee4320ae-2d42-419e-a4a1-6f30f41d3680';");
        console.log("MCS Users in PROD:", mcsUsers.rows);
        
        const memberships = await client.query("SELECT * FROM core_common.user_memberships WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'valter@gestaologinpro.com') OR user_id = 'ee4320ae-2d42-419e-a4a1-6f30f41d3680';");
        console.log("User Memberships in PROD:", memberships.rows);
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
