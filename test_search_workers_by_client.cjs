const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        // Get first client with trade_name
        const resCli = await client.query("SELECT id, trade_name FROM core_common.clients LIMIT 1");
        if (resCli.rows.length === 0) {
            console.log("No clients found.");
            return;
        }

        const clientObj = resCli.rows[0];
        const empId = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'; // Dev company ID
        console.log(`Testing Client: ${clientObj.trade_name} (ID: ${clientObj.id})`);

        // Search all active workers of this company
        const resAll = await client.query(`
            SELECT id, nome 
            FROM core_personal.search_workers(
                p_empresa_id => $1,
                p_page => 1,
                p_page_size => 100,
                p_sort_column => 'nome',
                p_sort_direction => 'asc',
                p_status_trabajador_filter => ARRAY['ativos']
            )
        `, [empId]);

        console.log(`Total active workers: ${resAll.rows.length}`);

        // Search workers of this company filtered by client trade_name
        const resFiltered = await client.query(`
            SELECT id, nome 
            FROM core_personal.search_workers(
                p_empresa_id => $1,
                p_page => 1,
                p_page_size => 100,
                p_sort_column => 'nome',
                p_sort_direction => 'asc',
                p_status_trabajador_filter => ARRAY['ativos'],
                p_cliente_nombre => ARRAY[$2::varchar]
            )
        `, [empId, clientObj.trade_name]);

        console.log(`Workers filtered by client "${clientObj.trade_name}": ${resFiltered.rows.length}`);
        resFiltered.rows.forEach(r => console.log(` - ${r.nome}`));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
