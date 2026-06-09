const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("Fetching function definitions in PROD...");
        const res = await client.query(`
            SELECT gp.proname, pg_get_functiondef(gp.oid) as def
            FROM pg_proc gp
            JOIN pg_namespace gn ON gp.pronamespace = gn.oid
            WHERE gn.nspname = 'core_common' AND gp.proname IN ('is_member', 'has_role');
        `);
        
        for (const row of res.rows) {
            console.log(`\n--- Function: ${row.proname} ---`);
            console.log(row.def);
        }
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
