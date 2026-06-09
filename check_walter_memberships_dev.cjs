const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function query(name, conn) {
    const client = new Client({ connectionString: conn });
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM core_common.user_memberships WHERE user_id = 'ee4320ae-2d42-419e-a4a1-6f30f41d3680';");
        console.log(`${name} Memberships:`, res.rows);
    } catch (err) {
        console.error(`${name} Error:`, err.message);
    } finally {
        await client.end();
    }
}

async function run() {
    await query("DEV", devConnectionString);
    await query("PROD", prodConnectionString);
}

run();
