const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkDb(name, connectionString) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const clientId = '2fb4fc3c-915b-2c03-2ea7-b2b392d52059';
        const resExc = await client.query(`
            SELECT cwt.id, cwt.worker_id, cwt.valor_tarifa, w.nome as worker_name, cwt.client_site_id
            FROM core_common.client_worker_tariffs cwt
            JOIN core_personal.workers w ON w.id = cwt.worker_id
            WHERE cwt.client_id = $1
        `, [clientId]);

        console.log(`Exceptions on ${name} database: ${resExc.rows.length}`);
        resExc.rows.forEach(r => console.log(` - Worker: ${r.worker_name}, Rate: ${r.valor_tarifa}, Site ID: ${r.client_site_id}`));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

async function run() {
    await checkDb("DEVELOPMENT", devConnectionString);
    await checkDb("PRODUCTION", prodConnectionString);
}

run();
