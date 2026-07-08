const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const res = await client.query(`
            SELECT proname, prosecdef 
            FROM pg_proc 
            WHERE proname = 'get_hours_control_workers'
        `);
        console.log("FUNCTION SECURITY DEFINER STATUS:", res.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
