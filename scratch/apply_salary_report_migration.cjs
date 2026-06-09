const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        console.log("Connected to PROD database.");

        const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', 'create_salary_report_functions.sql');
        console.log("Reading SQL file from:", sqlPath);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing SQL migration...");
        await client.query(sql);
        console.log("SQL Migration executed successfully!");

    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await client.end();
    }
}
run();
