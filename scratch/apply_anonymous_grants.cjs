const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Applying grants to anon user...");
        await client.query(`
            GRANT USAGE ON SCHEMA core_comercial TO anon;
            GRANT SELECT ON core_comercial.estimaciones TO anon;
            GRANT SELECT ON core_comercial.leads TO anon;
        `);
        console.log("Grants applied successfully!");
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
