const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to database. Deleting migration record...");
        
        await client.query("DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260523141000';");
        console.log("Migration record deleted successfully!");
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
