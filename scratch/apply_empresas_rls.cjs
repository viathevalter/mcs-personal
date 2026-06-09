const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const migrationFile = '20260526101500_add_empresas_write_rls.sql';
const filePath = path.resolve(__dirname, '..', 'supabase', 'migrations', migrationFile);

async function run() {
    if (!fs.existsSync(filePath)) {
        console.error("Migration file not found at " + filePath);
        process.exit(1);
    }
    const sql = fs.readFileSync(filePath, 'utf8');

    // Apply to DEV
    const devClient = new Client({ connectionString: devConnectionString });
    try {
        await devClient.connect();
        console.log("Connected to DEV DB. Applying RLS migration...");
        await devClient.query(sql);
        console.log("DEV RLS migration completed successfully.");
    } catch (e) {
        console.error("Error applying to DEV:", e);
    } finally {
        await devClient.end();
    }

    // Apply to PROD
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        console.log("Connected to PROD DB. Applying RLS migration...");
        await prodClient.query(sql);
        console.log("PROD RLS migration completed successfully.");
    } catch (e) {
        console.error("Error applying to PROD:", e);
    } finally {
        await prodClient.end();
    }
}

run();
