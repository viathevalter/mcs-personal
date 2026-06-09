const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function check(name, conn) {
    const client = new Client({ connectionString: conn });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name = 'core_comercial';
        `);
        console.log(`${name} core_comercial schema exists:`, res.rows.length > 0);
        
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'core_comercial';
        `);
        console.log(`${name} core_comercial tables:`, tablesRes.rows.map(r => r.table_name));
    } catch (err) {
        console.error(`${name} Error:`, err.message);
    } finally {
        await client.end();
    }
}

async function run() {
    await check("DEV", devConnectionString);
    await check("PROD", prodConnectionString);
}

run();
