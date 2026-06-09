const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const sql = process.argv[2];
    if (!sql) {
        console.error("Please provide SQL query as argument");
        process.exit(1);
    }
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        const res = await client.query(sql);
        console.log("Query completed successfully. Result:");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error("Query failed:", err.message);
    } finally {
        await client.end();
    }
}

run();
