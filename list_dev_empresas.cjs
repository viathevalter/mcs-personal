const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function list(name, conn) {
    const client = new Client({ connectionString: conn });
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM core_common.empresas;");
        console.log(`${name} Empresas:`, res.rows.map(r => ({ id: r.id, legal_name: r.legal_name, trade_name: r.trade_name })));
    } catch (err) {
        console.error(`${name} Error:`, err.message);
    } finally {
        await client.end();
    }
}

async function run() {
    await list("DEV", devConnectionString);
    await list("PROD", prodConnectionString);
}

run();
