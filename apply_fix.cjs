const { Client } = require('pg');
const fs = require('fs');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    console.log("Connected to Supabase.");

    try {
        const sql = fs.readFileSync('fix_history_snapshots.sql', 'utf8');
        await prodClient.query(sql);
        console.log("Migration applied successfully!");
    } catch (e) {
        console.error("Failed to apply migration:", e);
    } finally {
        await prodClient.end();
    }
}
run();
