const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function inspectTable(dbName, connectionString) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'core_personal' AND tablename = 'iban_change_requests';
        `);
        console.log(`\nTable Policies on core_personal.iban_change_requests (${dbName}):`);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

async function run() {
    await inspectTable('DEV', devConnectionString);
    await inspectTable('PROD', prodConnectionString);
}

run();
