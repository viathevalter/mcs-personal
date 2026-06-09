const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("Checking core_comercial.pedidos data in DEV...");
        const pedidosRes = await client.query("SELECT * FROM core_comercial.pedidos ORDER BY created_at DESC LIMIT 5;");
        console.log("Pedidos in DEV:", pedidosRes.rows.map(r => ({ id: r.id, codigo: r.codigo, client_id: r.client_id })));

        if (pedidosRes.rows.length > 0) {
            const pedidoId = pedidosRes.rows[0].id;
            console.log(`\nFetching core_comercial.pedido_items in DEV for pedido_id = '${pedidoId}'...`);
            const itensRes = await client.query(`SELECT * FROM core_comercial.pedido_items WHERE pedido_id = $1;`, [pedidoId]);
            console.log("Pedido Items in DEV:", itensRes.rows);
        } else {
            console.log("\nFetching some rows from core_comercial.pedido_items in DEV...");
            const itensRes = await client.query(`SELECT * FROM core_comercial.pedido_items LIMIT 5;`);
            console.log("Pedido Items in DEV:", itensRes.rows);
        }
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
