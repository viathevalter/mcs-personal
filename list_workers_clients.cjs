const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const empId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco company ID

        // Query active workers and select their current assignments/clients
        const res = await client.query(`
            SELECT DISTINCT c.trade_name
            FROM core_personal.worker_assignments wa
            JOIN core_common.clients c ON c.id = wa.client_id
            WHERE wa.status = 'active' AND wa.empresa_id = $1
            LIMIT 20
        `, [empId]);

        console.log("Clients with active assignments in worker_assignments:");
        res.rows.forEach(r => console.log(` - ${r.trade_name}`));

        // Also query the get_hours_control_workers for July or June
        const res2 = await client.query(`
            SELECT DISTINCT cliente_nombre
            FROM core_personal.get_hours_control_workers(
                p_empresa_id => $1,
                p_period_year => 2026,
                p_period_month => 6
            )
            LIMIT 20
        `, [empId]);
        console.log("Clients in get_hours_control_workers for June 2026:");
        res2.rows.forEach(r => console.log(` - ${r.cliente_nombre}`));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
