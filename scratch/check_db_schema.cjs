const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DEV database. Querying columns for estimacion_items...");
        
        const itemsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_comercial' AND table_name = 'estimacion_items';
        `);
        console.log("\nColumns of core_comercial.estimacion_items:");
        console.table(itemsRes.rows);

        const versionsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_comercial' AND table_name = 'estimacion_versions';
        `);
        console.log("\nColumns of core_comercial.estimacion_versions:");
        console.table(versionsRes.rows);

    } catch (err) {
        console.error("Query failed:", err);
    } finally {
        await client.end();
    }
}

run();
