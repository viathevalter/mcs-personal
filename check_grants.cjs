const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("Checking schema usage privileges in PROD...");
        const schemaPrivs = await client.query(`
            SELECT nspname, regexp_split_to_array(array_to_string(nspacl, ','), ',') as privileges
            FROM pg_namespace
            WHERE nspname IN ('core_common', 'core_personal', 'core_comercial', 'public');
        `);
        console.log(schemaPrivs.rows);

        console.log("\nChecking table select privileges on core_personal.workers in PROD...");
        const tablePrivs = await client.query(`
            SELECT grantee, privilege_type 
            FROM information_schema.role_table_grants 
            WHERE table_schema = 'core_personal' AND table_name = 'workers';
        `);
        console.log(tablePrivs.rows);
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
