const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Fetching applied migrations in DEV...");
        const res = await client.query("SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;");
        console.log("Applied migrations in DEV:", res.rows.map(r => r.version));
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
