const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== USER_MEMBERSHIPS ===");
        const res = await client.query(`
            SELECT id, user_id, empresa_id, role, is_active 
            FROM core_common.user_memberships
            LIMIT 20;
        `);
        console.log(res.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
