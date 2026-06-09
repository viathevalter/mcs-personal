const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== WALTER'S ROLES IN DEV ===");
        const res = await client.query(`
            SELECT * FROM public.user_roles WHERE user_id = 'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb'
        `);
        console.log(res.rows);

        console.log("\n=== WALTER'S MEMBERSHIPS IN DEV ===");
        const res2 = await client.query(`
            SELECT * FROM core_common.user_memberships WHERE user_id = 'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb'
        `);
        console.log(res2.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
