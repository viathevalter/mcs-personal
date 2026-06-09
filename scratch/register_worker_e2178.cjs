const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();

    console.log("Connected to PROD DB. Starting transaction to register E2178...");
    
    try {
        await client.query("BEGIN");

        // 1. Insert into core_personal.workers for WISEOWE (dae64d51-2181-4510-b14f-e63d2f111a8e)
        const resWiseowe = await client.query(`
            INSERT INTO core_personal.workers (
                empresa_id, cod_colab, nome, email, movil, niss, nie, dni, pasaporte, nif, 
                status_seguridad, status_trabajador, licencia_conducir, nacionalidade, 
                fecha_nacimiento, nuss, foto, data_ingresso, data_baixa, 
                data_alta_seguridad, data_baixa_seguridad, contratante, funcion, 
                cliente, camiseta, pantalones, cod_cliente, cod_funcion
            ) VALUES (
                'dae64d51-2181-4510-b14f-e63d2f111a8e', 'E2178', 'JHIRVEY JOHAN GIRALDO RINCON', '', '+57 315 05000179', 
                '12183898986', '', '', 'BH968167', '336874774', 
                'Pendiente Alta', 'Pendiente Ingresar', 'No', '', 
                '2001-04-19', null, '', '2026-06-08', null, 
                null, null, 'WISEOWE', 'MONTADOR (ARMADOR)', 
                'INSTALACIONES Y SISTEMAS HIDRÁULICOS', '', 'S (38/40)', 'C0108', null
            ) RETURNING id;
        `);
        const wiseoweWorkerId = resWiseowe.rows[0].id;
        console.log(`Inserted core_personal.workers row for WISEOWE (UUID: ${wiseoweWorkerId})`);

        // 2. Insert into public.colaboradores
        await client.query(`
            INSERT INTO public.colaboradores (
                sp_id, cod_colab, nombre, pasaporte, fecha_nacimiento, nacionalidade, 
                dni, nie, movil, niss, nif, status_seguridad, status_trabajador, 
                camiseta, pantalones, licencia_conducir, funcion, contratante, 
                domicilio, email, foto, nuss, fecha_inicio, fecha_alta
            ) VALUES (
                2178, 'E2178', 'JHIRVEY JOHAN GIRALDO RINCON', 'BH968167', '2001-04-19', '', 
                '', '', '+57 315 05000179', '12183898986', '336874774', 'Pendiente Alta', 'Pendiente Ingresar', 
                '', 'S (38/40)', 'No', 'MONTADOR (ARMADOR)', 'WISEOWE', 
                '', '', '', null, '2026-06-08', null
            );
        `);
        console.log("Inserted legacy row in public.colaboradores");

        // 3. Insert into public.colaborador_por_pedido
        await client.query(`
            INSERT INTO public.colaborador_por_pedido (
                sp_id, cod_colab, codcliente, cliente_nombre, contratante, 
                fechainiciopedido, tiposervico, codpedido, nome_colab, funcion
            ) VALUES (
                10002178, 'E2178', 'C0108', 'INSTALACIONES Y SISTEMAS HIDRÁULICOS', 'Wiseowe', 
                '2026-06-08', 'Pedido', '774', 'JHIRVEY JOHAN GIRALDO RINCON', 'MONTADOR (ARMADOR)'
            );
        `);
        console.log("Inserted assignment row in public.colaborador_por_pedido");

        // 4. Insert into core_personal.seguridade_status (has both NIF and NISS)
        await client.query(`
            INSERT INTO core_personal.seguridade_status (
                worker_id, empresa_id, tipo_evento, status, origem, 
                data_solicitacao, data_efetiva, origem_cliente_nome, origem_contratante
            ) VALUES 
            ($1, 'dae64d51-2181-4510-b14f-e63d2f111a8e', 'alta', 'pendente', 'Sistema', '2026-06-05', '2026-06-08', 'INSTALACIONES Y SISTEMAS HIDRÁULICOS', 'Wiseowe');
        `, [wiseoweWorkerId]);
        console.log("Inserted seguridade status (alta/pendente) for worker");

        // 5. Clean up side-effect duplicate record created under Stocco by legacy trigger
        const cleanupRes = await client.query(`
            DELETE FROM core_personal.workers
            WHERE cod_colab = 'E2178' AND empresa_id = '441f1f5d-aed3-40e3-8c77-7b1217757251'
        `);
        console.log(`Cleaned up side-effect Stocco worker record (rows deleted: ${cleanupRes.rowCount})`);

        await client.query("COMMIT");
        console.log("Transaction committed successfully!");

    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Error during transaction! Rolled back.", e);
        throw e;
    } finally {
        await client.end();
    }
}

run();
