const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== user_roles IN DEV ===");
        const res = await client.query(`
            SELECT ur.user_id, ur.role, au.email 
            FROM public.user_roles ur
            JOIN auth.users au ON ur.user_id = au.id
        `);
        console.log(res.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
