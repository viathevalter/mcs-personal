const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Querying roles for Walter in DEV...");
        const rolesRes = await client.query(`
            SELECT * FROM public.user_roles WHERE user_id = 'ee4320ae-2d42-419e-a4a1-6f30f41d3680';
        `);
        console.log("Roles:", rolesRes.rows);

        console.log("\nQuerying mcs_users for Walter in DEV...");
        const usersRes = await client.query(`
            SELECT * FROM public.mcs_users WHERE id = 'ee4320ae-2d42-419e-a4a1-6f30f41d3680';
        `);
        console.log("MCS Users:", usersRes.rows);
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
