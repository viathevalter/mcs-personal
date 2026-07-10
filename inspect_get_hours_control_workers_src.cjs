const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const res = await client.query(`
            SELECT prosrc 
            FROM pg_proc 
            WHERE proname = 'get_hours_control_workers'
        `);

        if (res.rows.length > 0) {
            console.log("Function Source Code:");
            console.log(res.rows[0].prosrc);
        } else {
            console.log("Function not found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
