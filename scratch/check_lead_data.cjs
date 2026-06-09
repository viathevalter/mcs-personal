const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Checking lead a5d9fb57-911b-4056-8e75-69819bdd23c8...");
        const res = await client.query(`
            SELECT *
            FROM core_comercial.leads 
            WHERE id = 'a5d9fb57-911b-4056-8e75-69819bdd23c8';
        `);
        console.log(JSON.stringify(res.rows[0], null, 2));
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
