const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- Exposing Schemas to PostgREST via SQL ---");
        // Update the authenticator role to include schemas inside a single quoted string
        await prodClient.query(`
            ALTER ROLE authenticator SET pgrst.db_schema TO 'public, storage, graphql_public, core_common, core_personal';
            NOTIFY pgrst, 'reload schema';
        `);
        console.log("✅ Schemas added to pgrst.db_schema and PostgREST reloaded!");
        
        const check = await prodClient.query(`SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'authenticator';`);
        console.log("Current config:", check.rows);

    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
