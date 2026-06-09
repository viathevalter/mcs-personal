const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();
    
    try {
        const res = await client.query(`
            SELECT * FROM public.colaboradores
            WHERE cod_colab = $1
        `, ['E1481']);
        console.log("PROD public.colaboradores for E1481:", JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
