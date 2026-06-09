const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    await client.connect();
    
    try {
        const resColab = await client.query(`
            SELECT * FROM public.colaboradores
            WHERE cod_colab = $1
        `, ['E2177']);
        console.log("DEV public.colaboradores for E2177:", JSON.stringify(resColab.rows, null, 2));

        const resWorkers = await client.query(`
            SELECT * FROM core_personal.workers
            WHERE cod_colab = $1
        `, ['E2177']);
        console.log("DEV core_personal.workers for E2177:", JSON.stringify(resWorkers.rows, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
