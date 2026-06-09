const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("Searching user_roles for Valter in PROD...");
        const rolesRes = await client.query(`
            SELECT * FROM public.user_roles WHERE email = 'valter@gestaologinpro.com';
        `);
        console.log("Roles in PROD:", rolesRes.rows);

        if (rolesRes.rows.length > 0) {
            const userId = rolesRes.rows[0].user_id;
            console.log(`\nQuerying memberships in PROD for user_id = '${userId}'...`);
            const membershipsRes = await client.query(`
                SELECT * FROM core_common.user_memberships WHERE user_id = $1;
            `, [userId]);
            console.log("Memberships in PROD:", membershipsRes.rows);
        }
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
