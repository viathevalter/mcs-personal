const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();

    console.log("=== Verifying Batch Workers E2125, E2174, E2175 in PROD ===");

    try {
        // 1. core_personal.workers
        const workers = await client.query("SELECT id, empresa_id, cod_colab, nome, status_trabajador, status_seguridad, data_ingresso, pasaporte, nif, niss FROM core_personal.workers WHERE cod_colab IN ('E2125', 'E2174', 'E2175')");
        console.log("\n1. core_personal.workers records:", JSON.stringify(workers.rows, null, 2));

        const e2125Id = workers.rows.find(w => w.cod_colab === 'E2125')?.id;

        // 2. public.colaboradores
        const colaboradores = await client.query("SELECT sp_id, cod_colab, nombre, pasaporte, status_seguridad, status_trabajador, contratante, camiseta, pantalones, domicilio FROM public.colaboradores WHERE cod_colab IN ('E2125', 'E2174', 'E2175')");
        console.log("\n2. public.colaboradores records:", JSON.stringify(colaboradores.rows, null, 2));

        // 3. public.colaborador_por_pedido
        const cpp = await client.query("SELECT sp_id, cod_colab, codcliente, cliente_nombre, fechainiciopedido, codpedido FROM public.colaborador_por_pedido WHERE cod_colab IN ('E2125', 'E2174', 'E2175')");
        console.log("\n3. public.colaborador_por_pedido records:", JSON.stringify(cpp.rows, null, 2));

        if (e2125Id) {
            // 4. core_personal.worker_ibans
            const ibans = await client.query("SELECT * FROM core_personal.worker_ibans WHERE worker_id = $1", [e2125Id]);
            console.log("\n4. core_personal.worker_ibans record for E2125:", JSON.stringify(ibans.rows, null, 2));

            // 5. core_personal.seguridade_status
            const seguridade = await client.query("SELECT * FROM core_personal.seguridade_status WHERE worker_id = $1", [e2125Id]);
            console.log("\n5. core_personal.seguridade_status record for E2125:", JSON.stringify(seguridade.rows, null, 2));
        }

    } catch (e) {
        console.error("Error during verification:", e);
    } finally {
        await client.end();
    }
}

run();
