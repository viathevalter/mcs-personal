const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("=== COUNT OF pedidos IN PROD ===");
        const countPed = await client.query('SELECT count(*) FROM core_comercial.pedidos');
        console.log(countPed.rows);

        console.log("\n=== COUNT OF pedido_items IN PROD ===");
        const countItems = await client.query('SELECT count(*) FROM core_comercial.pedido_items');
        console.log(countItems.rows);

        console.log("\n=== COUNT OF estimaciones IN PROD ===");
        const countEst = await client.query('SELECT count(*) FROM core_comercial.estimaciones');
        console.log(countEst.rows);

        console.log("\n=== LIST OF pedidos IN PROD ===");
        const listPed = await client.query('SELECT id, codigo, client_id, empresa_id, commercial_status, operational_status FROM core_comercial.pedidos LIMIT 5');
        console.log(listPed.rows);

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
