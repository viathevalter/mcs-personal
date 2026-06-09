const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();

    console.log("Connected to PROD DB. Updating worker statuses to Pendiente Alta...");
    
    try {
        await client.query("BEGIN");

        const workerCodes = ['E1481', 'E2173'];

        for (const cod of workerCodes) {
            console.log(`\nUpdating status for ${cod}...`);

            // 1. Update core_personal.workers
            const resW = await client.query(`
                UPDATE core_personal.workers
                SET status_seguridad = 'Pendiente Alta',
                    status_trabajador = 'Pendiente Ingresar'
                WHERE cod_colab = $1
                RETURNING id, empresa_id;
            `, [cod]);
            console.log(`Updated core_personal.workers rows (count: ${resW.rowCount})`);

            const ids = resW.rows.map(r => r.id);

            if (ids.length > 0) {
                // 2. Update core_personal.seguridade_status
                const resS = await client.query(`
                    UPDATE core_personal.seguridade_status
                    SET status = 'pendente',
                        data_efetiva = null
                    WHERE worker_id = ANY($1) AND tipo_evento = 'alta';
                `, [ids]);
                console.log(`Updated core_personal.seguridade_status rows (count: ${resS.rowCount})`);
            }

            // 3. Update public.colaboradores
            const resC = await client.query(`
                UPDATE public.colaboradores
                SET status_seguridad = 'Pendiente Alta',
                    status_trabajador = 'Pendiente Ingresar'
                WHERE cod_colab = $1;
            `, [cod]);
            console.log(`Updated public.colaboradores rows (count: ${resC.rowCount})`);
        }

        await client.query("COMMIT");
        console.log("\nTransaction committed successfully!");

    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Error during status update transaction! Rolled back.", e);
        throw e;
    } finally {
        await client.end();
    }
}

run();
