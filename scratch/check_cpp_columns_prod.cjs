const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();
    
    try {
        const columnsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'colaborador_por_pedido' AND table_schema = 'public'
        `);
        console.log("PROD public.colaborador_por_pedido columns:");
        console.log(columnsRes.rows);
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
