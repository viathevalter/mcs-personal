const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        // Listen to NOTICE events from PostgreSQL
        client.on('notice', (msg) => {
            console.log(`[POSTGRES NOTICE] ${msg.message}`);
        });

        console.log("Connected to DEV database. Loading test SQL file...");
        const testSqlPath = path.resolve(__dirname, '..', 'supabase', 'tests', 'test_criar_estimacion_completa.sql');
        const sql = fs.readFileSync(testSqlPath, 'utf8');

        console.log("Executing test block...");
        await client.query(sql);
        console.log("Test execution completed successfully!");

    } catch (err) {
        console.error("Test execution failed with error:", err.message);
    } finally {
        await client.end();
    }
}

run();
