const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DEV DB. Querying core_personal.document_requests...");
        
        const res = await client.query(`
            SELECT id, worker_id, token, status, passport_url, nif_url, niss_url, extracted_data
            FROM core_personal.document_requests
            ORDER BY created_at DESC
            LIMIT 5;
        `);
        
        console.log("Found requests:");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
