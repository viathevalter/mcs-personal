const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Applying grants on core_comercial to service_role and authenticator...");
        
        // 1. Grant usage on schema
        await client.query(`
            GRANT USAGE ON SCHEMA core_comercial TO service_role;
            GRANT USAGE ON SCHEMA core_comercial TO authenticator;
        `);
        console.log("Granted USAGE on schema.");

        // 2. Grant all privileges on existing tables, sequences, and functions to service_role
        await client.query(`
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA core_comercial TO service_role;
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA core_comercial TO service_role;
            GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA core_comercial TO service_role;
        `);
        console.log("Granted ALL PRIVILEGES on existing tables/sequences/functions to service_role.");

        // 3. Grant default privileges for future objects in core_comercial schema
        await client.query(`
            ALTER DEFAULT PRIVILEGES IN SCHEMA core_comercial 
            GRANT ALL PRIVILEGES ON TABLES TO service_role;
            
            ALTER DEFAULT PRIVILEGES IN SCHEMA core_comercial 
            GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
            
            ALTER DEFAULT PRIVILEGES IN SCHEMA core_comercial 
            GRANT ALL PRIVILEGES ON FUNCTIONS TO service_role;
        `);
        console.log("Configured DEFAULT PRIVILEGES for service_role.");

        // 4. Grant SELECT, INSERT, UPDATE, DELETE to authenticated role on tables
        await client.query(`
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA core_comercial TO authenticated;
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA core_comercial TO authenticated;
            GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA core_comercial TO authenticated;
        `);
        console.log("Granted ALL PRIVILEGES to authenticated role on existing objects.");

        // 5. Configured default privileges for authenticated role
        await client.query(`
            ALTER DEFAULT PRIVILEGES IN SCHEMA core_comercial 
            GRANT ALL PRIVILEGES ON TABLES TO authenticated;
            
            ALTER DEFAULT PRIVILEGES IN SCHEMA core_comercial 
            GRANT ALL PRIVILEGES ON SEQUENCES TO authenticated;
            
            ALTER DEFAULT PRIVILEGES IN SCHEMA core_comercial 
            GRANT ALL PRIVILEGES ON FUNCTIONS TO authenticated;
        `);
        console.log("Configured DEFAULT PRIVILEGES for authenticated role.");

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
