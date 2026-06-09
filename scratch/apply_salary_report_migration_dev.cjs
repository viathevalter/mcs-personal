const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DEV database.");

        const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', 'create_salary_report_functions.sql');
        console.log("Reading SQL file from:", sqlPath);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing SQL migration on DEV...");
        await client.query(sql);
        console.log("SQL Migration executed on DEV successfully!");

    } catch (err) {
        console.error("DEV Migration failed:", err.message);
    } finally {
        await client.end();
    }
}
run();
