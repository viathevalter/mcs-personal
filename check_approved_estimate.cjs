const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

const run = async () => {
    const client = new Client({ connectionString: devConnectionString });
    await client.connect();

    console.log("=== BUSCANDO ESTIMATIVA ===");
    const resEst = await client.query(`
        SELECT id, codigo, status, client_id, client_site_id, current_version_id
        FROM core_comercial.estimaciones
        WHERE codigo = 'EST-20260610-256E';
    `);
    console.log(resEst.rows);

    if (resEst.rows.length > 0) {
        const estId = resEst.rows[0].id;
        const versionId = resEst.rows[0].current_version_id;

        console.log("\n=== BUSCANDO PEDIDO VINCULADO ===");
        const resPed = await client.query(`
            SELECT id, codigo, source_estimacion_id, client_id, client_site_id, commercial_status, operational_status, created_at
            FROM core_comercial.pedidos
            WHERE source_estimacion_id = $1;
        `, [estId]);
        console.log(resPed.rows);

        console.log("\n=== BUSCANDO ITENS DO ORÇAMENTO (ESTIMATIVA) ===");
        const resEstItems = await client.query(`
            SELECT id, job_function_id, quantity, planned_total_hours
            FROM core_comercial.estimacion_items
            WHERE estimacion_version_id = $1;
        `, [versionId]);
        console.log(resEstItems.rows);

        if (resPed.rows.length > 0) {
            const pedId = resPed.rows[0].id;

            console.log("\n=== BUSCANDO ITENS DO PEDIDO ===");
            const resPedItems = await client.query(`
                SELECT id, job_function_id, quantity_requested, quantity_fulfilled, status
                FROM core_comercial.pedido_items
                WHERE pedido_id = $1;
            `, [pedId]);
            console.log(resPedItems.rows);

            const resSol = await client.query(`
                SELECT id, codigo, tipo, status, client_id, client_site_id, pedido_id, created_at
                FROM core_operacoes.solicitudes_operativas
                WHERE pedido_id = $1;
            `, [pedId]);
            console.log(resSol.rows);
        }
    } else {
        console.log("Estimativa não encontrada. Buscando as 5 mais recentes:");
        const resRecent = await client.query(`
            SELECT id, codigo, status, created_at
            FROM core_comercial.estimaciones
            ORDER BY created_at DESC
            LIMIT 5;
        `);
        console.log(resRecent.rows);
    }

    await client.end();
}
run().catch(console.error);
