const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();
    
    try {
        const cppRes = await client.query(`
            SELECT * FROM public.colaborador_por_pedido
            WHERE cod_colab = $1
        `, ['E2173']);
        console.log("PROD public.colaborador_por_pedido for E2173:", JSON.stringify(cppRes.rows, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
