const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        console.log("Connected to PRODUCTION DB.");

        const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260707100000_fix_get_hours_control_workers_and_sync_job_functions.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing migration on PRODUCTION database...");
        await client.query(sql);
        console.log("Migration executed successfully!");

    } catch (e) {
        console.error("Migration failed on PRODUCTION:", e);
    } finally {
        await client.end();
    }
}

run();
