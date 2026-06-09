const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    console.log("=== USER_MEMBERSHIPS FOR LUMINOUS IN PROD ===");
    let client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM core_common.user_memberships WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85'");
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }

    console.log("\n=== USER_MEMBERSHIPS FOR LUMINOUS IN DEV ===");
    client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM core_common.user_memberships WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85'");
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
