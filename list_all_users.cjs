const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function listDbUsers(name, connectionString) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT id, email FROM auth.users");
        console.log(`\nAll users in ${name} auth.users:`);
        res.rows.forEach(r => console.log(` - Email: ${r.email} (ID: ${r.id})`));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

async function run() {
    await listDbUsers("DEVELOPMENT", devConnectionString);
    await listDbUsers("PRODUCTION", prodConnectionString);
}

run();
