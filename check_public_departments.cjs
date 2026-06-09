const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== PUBLIC DEPARTMENTS ===");
        const res = await client.query(`
            SELECT table_schema, table_name, table_type 
            FROM information_schema.tables 
            WHERE table_name = 'departments'
        `);
        console.log(res.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
