const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("Querying mcs_users in PROD for user_id = 'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb'...");
        const res = await client.query(`
            SELECT * FROM public.mcs_users WHERE id = 'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb';
        `);
        console.log("MCS User in PROD:", res.rows);
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
