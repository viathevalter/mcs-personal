const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    await client.connect();
    
    try {
        const resColab = await client.query(`
            SELECT * FROM public.colaboradores
            WHERE cod_colab IN ($1, $2)
        `, ['E1162', 'E2176']);
        console.log("DEV public.colaboradores records:", JSON.stringify(resColab.rows, null, 2));

        const resWorkers = await client.query(`
            SELECT * FROM core_personal.workers
            WHERE cod_colab IN ($1, $2)
        `, ['E1162', 'E2176']);
        console.log("DEV core_personal.workers records:", JSON.stringify(resWorkers.rows, null, 2));

        const workerIds = resWorkers.rows.map(w => w.id);
        if (workerIds.length > 0) {
            const resIbans = await client.query(`
                SELECT * FROM core_personal.worker_ibans
                WHERE worker_id = ANY($1)
            `, [workerIds]);
            console.log("DEV core_personal.worker_ibans records:", JSON.stringify(resIbans.rows, null, 2));
        }
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
