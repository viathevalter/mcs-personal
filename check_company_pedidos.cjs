const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

const run = async () => {
    const client = new Client({ connectionString: devConnectionString });
    await client.connect();

    console.log("=== PEDIDOS RECENTES ===");
    const resRecent = await client.query(`
        SELECT p.id, p.codigo, p.empresa_id, e.trade_name, p.client_id, p.client_site_id, p.operational_status, p.commercial_status, p.created_at
        FROM core_comercial.pedidos p
        JOIN core_common.empresas e ON p.empresa_id = e.id
        ORDER BY p.created_at DESC
        LIMIT 10;
    `);
    console.log(resRecent.rows);

    console.log("\n=== DETALHES DA ESTIMATIVA EST-20260610-256E ===");
    const resEst = await client.query(`
        SELECT id, codigo, empresa_id, status, client_id, client_site_id
        FROM core_comercial.estimaciones
        WHERE codigo = 'EST-20260610-256E';
    `);
    console.log(resEst.rows);

    await client.end();
}
run().catch(console.error);
