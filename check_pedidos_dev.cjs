const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== COUNT OF pedidos IN DEV ===");
        const countPed = await client.query('SELECT count(*) FROM core_comercial.pedidos');
        console.log(countPed.rows);

        console.log("\n=== COUNT OF pedido_items IN DEV ===");
        const countItems = await client.query('SELECT count(*) FROM core_comercial.pedido_items');
        console.log(countItems.rows);

        console.log("\n=== COUNT OF estimaciones IN DEV ===");
        const countEst = await client.query('SELECT count(*) FROM core_comercial.estimaciones');
        console.log(countEst.rows);

        console.log("\n=== LIST OF pedidos IN DEV ===");
        const listPed = await client.query('SELECT id, codigo, client_id, empresa_id, commercial_status, operational_status FROM core_comercial.pedidos LIMIT 5');
        console.log(listPed.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
