const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== SUPER ADMINS IN DEV (user_roles) ===");
        const res = await client.query(`
            SELECT ur.*, mu.display_name, mu.email as mcs_email
            FROM public.user_roles ur
            LEFT JOIN public.mcs_users mu ON ur.user_id = mu.id
            WHERE ur.role = 'super_admin'
        `);
        console.log(res.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
