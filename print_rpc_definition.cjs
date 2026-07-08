const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB as superuser.");

        const res = await client.query(`
            SELECT prosrc 
            FROM pg_proc 
            WHERE proname = 'get_hours_control_workers'
        `);
        if (res.rows.length > 0) {
            console.log("RPC DEFINITION:\n", res.rows[0].prosrc);
        } else {
            console.log("RPC not found.");
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
