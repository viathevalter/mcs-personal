const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();

    console.log("Connected to PROD DB. Starting transaction...");
    
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
                'dae64d51-2181-4510-b14f-e63d2f111a8e', 'E1481', 'EDINSON MANUEL DEL TORO MIRANDA', '', '+57 302 1255413', 
                '12183925264', '', '', 'BH580575', '332947904', 
                'Alta', 'ATIVO', 'No', 'Colombiano', 
                '1992-01-31', null, '', '2026-06-01', null, 
                '2026-06-01', null, 'WISEOWE', 'MONTADOR (ARMADOR) / SOLDADOR (TIG)', 
                'HERMANOS DJ 2000', 'L(58)', 'S (38/40)', 'C0597', null
            ) RETURNING id;
        `);
        const wiseoweWorkerId = resWiseowe.rows[0].id;
        console.log(`Inserted core_personal.workers row for WISEOWE (UUID: ${wiseoweWorkerId})`);

        // 2. Insert into core_personal.workers for Login Pro (bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d)
        const resLoginPro = await client.query(`
            INSERT INTO core_personal.workers (
                empresa_id, cod_colab, nome, email, movil, niss, nie, dni, pasaporte, nif, 
                status_seguridad, status_trabajador, licencia_conducir, nacionalidade, 
                fecha_nacimiento, nuss, foto, data_ingresso, data_baixa, 
                data_alta_seguridad, data_baixa_seguridad, contratante, funcion, 
                cliente, camiseta, pantalones, cod_cliente, cod_funcion
            ) VALUES (
                'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d', 'E1481', 'EDINSON MANUEL DEL TORO MIRANDA', '', '+57 302 1255413', 
                '12183925264', '', '', 'BH580575', '332947904', 
                'Alta', 'ATIVO', 'No', 'Colombiano', 
                '1992-01-31', null, '', '2026-06-01', null, 
                '2026-06-01', null, 'WISEOWE', 'MONTADOR (ARMADOR) / SOLDADOR (TIG)', 
                'HERMANOS DJ 2000', 'L(58)', 'S (38/40)', 'C0597', null
            ) RETURNING id;
        `);
        const loginProWorkerId = resLoginPro.rows[0].id;
        console.log(`Inserted core_personal.workers row for Login Pro (UUID: ${loginProWorkerId})`);

        // 3. Insert into public.colaboradores
        await client.query(`
            INSERT INTO public.colaboradores (
                sp_id, cod_colab, nombre, pasaporte, fecha_nacimiento, nacionalidade, 
                dni, nie, movil, niss, nif, status_seguridad, status_trabajador, 
                camiseta, pantalones, licencia_conducir, funcion, contratante, 
                domicilio, email, foto, nuss, fecha_inicio, fecha_alta
            ) VALUES (
                1481, 'E1481', 'EDINSON MANUEL DEL TORO MIRANDA', 'BH580575', '1992-01-31', 'Colombiano', 
                '', '', '+57 302 1255413', '12183925264', '332947904', 'Alta', 'Ativo', 
                'L(58)', 'S (38/40)', 'No', 'MONTADOR (ARMADOR) / SOLDADOR (TIG)', 'WISEOWE', 
                'R 5 de Outubro 20 2490 - 508 Ourém, Portugal', '', '', null, '2026-06-01', '2026-06-01'
            );
        `);
        console.log("Inserted legacy row in public.colaboradores");

        // 4. Insert into public.colaborador_por_pedido
        await client.query(`
            INSERT INTO public.colaborador_por_pedido (
                sp_id, cod_colab, codcliente, cliente_nombre, contratante, 
                fechainiciopedido, tiposervico
            ) VALUES (
                10001481, 'E1481', 'C0597', 'HERMANOS DJ 2000', 'Wiseowe', 
                '2026-06-01', 'Pedido'
            );
        `);
        console.log("Inserted assignment row in public.colaborador_por_pedido");

        // 5. Insert into core_personal.worker_ibans (for both generated workers)
        await client.query(`
            INSERT INTO core_personal.worker_ibans (
                worker_id, banco, iban, status, observacoes, data_alteracao
            ) VALUES 
            ($1, 'BBVA', 'ES6601822125390201601073', 'ATIVO', 'Importado via Planilha ID', '2026-06-01'),
            ($2, 'BBVA', 'ES6601822125390201601073', 'ATIVO', 'Importado via Planilha ID', '2026-06-01');
        `, [wiseoweWorkerId, loginProWorkerId]);
        console.log("Inserted bank details (IBAN) for both workers");

        // 6. Insert into core_personal.seguridade_status (for both workers)
        await client.query(`
            INSERT INTO core_personal.seguridade_status (
                worker_id, empresa_id, tipo_evento, status, origem, 
                data_solicitacao, data_efetiva, origem_cliente_nome, origem_contratante
            ) VALUES 
            ($1, 'dae64d51-2181-4510-b14f-e63d2f111a8e', 'alta', 'confirmado', 'Sistema', '2026-06-01', '2026-06-01', 'HERMANOS DJ 2000', 'Wiseowe'),
            ($2, 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d', 'alta', 'confirmado', 'Sistema', '2026-06-01', '2026-06-01', 'HERMANOS DJ 2000', 'Wiseowe');
        `, [wiseoweWorkerId, loginProWorkerId]);
        console.log("Inserted seguridade status (alta) for both workers");

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
