const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        console.log("Connected to PROD DB. Running seed_locations.sql...");
        
        const sqlPath = path.join(__dirname, '..', 'seed_locations.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await client.query(sql);
        console.log("seed_locations.sql executed successfully on PROD database!");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}
run();
