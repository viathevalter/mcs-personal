const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', 'add_seguridade_filter_to_salary_report.sql');
    console.log("Reading SQL file from:", sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 1. Deploy to Dev
    const devClient = new Client({ connectionString: devConnectionString });
    try {
        await devClient.connect();
        console.log("Connected to DEV database.");
        await devClient.query(sql);
        console.log("Migration applied to DEV successfully!");
    } catch (err) {
        console.error("DEV Deploy failed:", err.message);
    } finally {
        await devClient.end();
    }

    // 2. Deploy to Prod
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        console.log("Connected to PROD database.");
        await prodClient.query(sql);
        console.log("Migration applied to PROD successfully!");
    } catch (err) {
        console.error("PROD Deploy failed:", err.message);
    } finally {
        await prodClient.end();
    }
}
run();
