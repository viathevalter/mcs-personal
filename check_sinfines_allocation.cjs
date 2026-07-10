const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const resAlloc = await client.query(`
            SELECT id, cod_colab, nome_colab, cliente_nombre 
            FROM public.colaborador_por_pedido 
            WHERE cliente_nombre = 'SINFINES FACTORY S.L'
        `);
        console.log(`Allocations in DEV: ${resAlloc.rows.length}`);
        resAlloc.rows.forEach(r => {
            console.log(` - Code: ${r.cod_colab}, Name: ${r.nome_colab}, Client: ${r.cliente_nombre}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
