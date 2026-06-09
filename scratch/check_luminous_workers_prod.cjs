const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();
    
    try {
        const res = await client.query(`
            SELECT id, empresa_id, cod_colab, nome, contratante, funcion, cliente
            FROM core_personal.workers
            WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85'
            LIMIT 3
        `);
        console.log("PROD Luminous workers in core_personal.workers:", JSON.stringify(res.rows, null, 2));

        const resColab = await client.query(`
            SELECT cod_colab, nombre, contratante, funcion
            FROM public.colaboradores
            WHERE contratante ILIKE '%luminous%'
            LIMIT 3
        `);
        console.log("PROD Luminous colaboradores in public.colaboradores:", JSON.stringify(resColab.rows, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
