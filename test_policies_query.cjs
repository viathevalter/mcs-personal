const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        console.log("Querying pg_policies in PROD...");
        const res = await client.query(`
            SELECT schemaname, tablename, policyname 
            FROM pg_policies 
            WHERE schemaname IN ('core_common', 'core_comercial', 'core_logistica');
        `);
        console.log("Policies found:", res.rows);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
