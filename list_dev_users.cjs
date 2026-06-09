const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== USER_ROLES IN DEV ===");
        const res = await client.query(`
            SELECT * FROM public.user_roles
        `);
        console.log(res.rows);

        console.log("\n=== MCS_USERS IN DEV ===");
        const res2 = await client.query(`
            SELECT id, email, role, display_name FROM public.mcs_users
        `);
        console.log(res2.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
