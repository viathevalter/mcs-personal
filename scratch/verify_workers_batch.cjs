const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();

    console.log("=== Verifying Workers E1162 and E2176 records in PROD ===");

    try {
        // 1. core_personal.workers
        const workers = await client.query(`
            SELECT id, empresa_id, cod_colab, nome, status_trabajador, status_seguridad, data_ingresso 
            FROM core_personal.workers 
            WHERE cod_colab IN ('E1162', 'E2176')
        `);
        console.log("\n1. core_personal.workers records:", JSON.stringify(workers.rows, null, 2));

        const workerIds = workers.rows.map(w => w.id);

        // 2. public.colaboradores
        const colaboradores = await client.query(`
            SELECT id, sp_id, cod_colab, nombre, status_trabajador, status_seguridad, pasaporte, fecha_nacimiento, movil, camiseta, pantalones, funcion 
            FROM public.colaboradores 
            WHERE cod_colab IN ('E1162', 'E2176')
        `);
        console.log("\n2. public.colaboradores records:", JSON.stringify(colaboradores.rows, null, 2));

        // 3. public.colaborador_por_pedido
        const cpp = await client.query(`
            SELECT * FROM public.colaborador_por_pedido 
            WHERE cod_colab IN ('E1162', 'E2176')
        `);
        console.log("\n3. public.colaborador_por_pedido records:", JSON.stringify(cpp.rows, null, 2));

        if (workerIds.length > 0) {
            // 4. core_personal.seguridade_status
            const seguridade = await client.query(`
                SELECT * FROM core_personal.seguridade_status 
                WHERE worker_id = ANY($1)
            `, [workerIds]);
            console.log("\n4. core_personal.seguridade_status records:", JSON.stringify(seguridade.rows, null, 2));
        } else {
            console.log("\n4. No worker IDs, skipping seguridade_status check.");
        }

    } catch (e) {
        console.error("Error during verification:", e);
    } finally {
        await client.end();
    }
}

run();
