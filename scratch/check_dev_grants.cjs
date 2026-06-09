const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Checking schema usage privileges in DEV...");
        const schemaPrivs = await client.query(`
            SELECT nspname, regexp_split_to_array(array_to_string(nspacl, ','), ',') as privileges
            FROM pg_namespace
            WHERE nspname IN ('core_common', 'core_personal', 'core_comercial', 'public');
        `);
        console.log(JSON.stringify(schemaPrivs.rows, null, 2));

        console.log("\nChecking role privileges/memberships...");
        const roles = await client.query(`
            SELECT r.rolname, 
                   ARRAY(SELECT b.rolname 
                         FROM pg_auth_members m 
                         JOIN pg_roles b ON m.roleid = b.oid 
                         WHERE m.member = r.oid) as memberof
            FROM pg_roles r
            WHERE r.rolname IN ('service_role', 'anon', 'authenticated', 'postgres');
        `);
        console.log(JSON.stringify(roles.rows, null, 2));
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
