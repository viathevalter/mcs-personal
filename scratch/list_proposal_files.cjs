const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Connected to dev DB.");
        
        const res = await client.query(`
            SELECT id, bucket_id, name, metadata
            FROM storage.objects
            WHERE bucket_id = 'proposal-signatures'
            LIMIT 5
        `);
        console.log("Files in storage.objects:");
        console.table(res.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
