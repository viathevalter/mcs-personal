const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Finding job functions...");
        const res = await client.query('SELECT id, name FROM core_comercial.job_functions LIMIT 5;');
        console.log(res.rows);
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
