const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const clientId = '2fb4fc3c-915b-2c03-2ea7-b2b392d52059';

        // Find worker Marlon
        const resWorker = await client.query("SELECT id, nome, cod_colab FROM core_personal.workers WHERE nome ILIKE '%Marlon%'");
        console.log("Marlon workers found:");
        resWorker.rows.forEach(r => console.log(` - ID: ${r.id}, Name: ${r.nome}, Code: ${r.cod_colab}`));

        // Find saved exceptions for this client
        const resExc = await client.query(`
            SELECT cwt.id, cwt.worker_id, cwt.valor_tarifa, w.nome as worker_name, cwt.client_site_id
            FROM core_common.client_worker_tariffs cwt
            JOIN core_personal.workers w ON w.id = cwt.worker_id
            WHERE cwt.client_id = $1
        `, [clientId]);

        console.log("Saved exceptions for client:");
        resExc.rows.forEach(r => console.log(` - Exception ID: ${r.id}, Worker: ${r.worker_name}, Rate: ${r.valor_tarifa}, Site ID: ${r.client_site_id}`));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
