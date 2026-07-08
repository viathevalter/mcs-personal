const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260707100000_fix_get_hours_control_workers_and_sync_job_functions.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Extract the function body from SQL (or just execute the block)
        // Since we are running as superuser, we can run the whole migration script
        // Let's run it inside a transaction
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");
        console.log("Migration applied successfully!");

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await client.end();
    }
}

run();
