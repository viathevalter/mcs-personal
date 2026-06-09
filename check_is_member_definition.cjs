const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function queryDef(name, conn) {
    const client = new Client({ connectionString: conn });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT pg_get_functiondef(p.oid) as def
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'core_common' AND p.proname = 'is_member';
        `);
        console.log(`\n=== ${name} core_common.is_member ===`);
        if (res.rows.length > 0) {
            console.log(res.rows[0].def);
        } else {
            console.log("Function not found");
        }
    } catch (err) {
        console.error(`${name} Error:`, err.message);
    } finally {
        await client.end();
    }
}

async function run() {
    await queryDef("DEV", devConnectionString);
    await queryDef("PROD", prodConnectionString);
}

run();
