const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("Checking columns of core_comercial.pedido_items...");
        const columnsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core_comercial' AND table_name = 'pedido_items';
        `);
        console.log(columnsRes.rows);

        console.log("\nFetching sample row from core_comercial.pedido_items...");
        const sampleRes = await client.query(`
            SELECT * FROM core_comercial.pedido_items LIMIT 2;
        `);
        console.log(sampleRes.rows);
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
