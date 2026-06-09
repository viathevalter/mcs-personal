const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        console.log("Connected to PROD DB.");
        const res = await client.query('SELECT * FROM core_common.countries');
        console.log("Countries in PROD:", res.rows);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}
run();
