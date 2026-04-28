const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();

    const { rows } = await client.query("SELECT * FROM public.colaborador_por_pedido WHERE cod_colab = 'E0192'");
    console.log("Pedido:", rows);

    await client.end();
}

run().catch(console.error);
