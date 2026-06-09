const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to dev DB. Querying vault.decrypted_secrets...");
        
        // Let's check if vault schema exists and query secrets
        const res = await client.query(`
            SELECT * FROM vault.decrypted_secrets;
        `);
        console.log("Secrets in vault:");
        console.log(res.rows);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
