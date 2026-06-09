const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();

    console.log("Connected to PROD DB. Starting batch transaction...");
    
    try {
        await client.query("BEGIN");

        // 1. Insert PEDRO ALEXANDER ROJAS RODRIGUEZ (E2125)
        const resE2125 = await client.query(`
            INSERT INTO core_personal.workers (
                empresa_id, cod_colab, nome, email, movil, niss, nie, dni, pasaporte, nif, 
                status_seguridad, status_trabajador, licencia_conducir, nacionalidade, 
                fecha_nacimiento, nuss, foto, data_ingresso, data_baixa, 
                data_alta_seguridad, data_baixa_seguridad, contratante, funcion, 
                cliente, camiseta, pantalones, cod_cliente, cod_funcion
            ) VALUES (
                'dae64d51-2181-4510-b14f-e63d2f111a8e', 'E2125', 'PEDRO ALEXANDER ROJAS RODRIGUEZ', '', '+573505179783', 
                '12183222525', '', '', 'AW121633', '336211198', 
                'Pendiente Alta', 'Pendiente Ingresar', 'No', 'Colombiano', 
                '1975-01-21', null, '', '2026-06-09', null, 
                '2026-06-09', null, 'WISEOWE', 'SOLDADOR MIG-MAG / ELECTRODO (GMAW / SMAW)', 
                'SISTEMAS DE FILTRADO Y TRATAMIENTO DE FLUIDOS SL', 'L(58)', 'M(42/44)', 'C0176', null
            ) RETURNING id;
        `);
        const e2125Id = resE2125.rows[0].id;
        console.log(`Inserted core_personal.workers row for E2125 (UUID: ${e2125Id})`);

        // 2. Insert ELIO JIMENEZ MESTRA (E2174)
        const resE2174 = await client.query(`
            INSERT INTO core_personal.workers (
                empresa_id, cod_colab, nome, email, movil, niss, nie, dni, pasaporte, nif, 
                status_seguridad, status_trabajador, licencia_conducir, nacionalidade, 
                fecha_nacimiento, nuss, foto, data_ingresso, data_baixa, 
                data_alta_seguridad, data_baixa_seguridad, contratante, funcion, 
                cliente, camiseta, pantalones, cod_cliente, cod_funcion
            ) VALUES (
                'dae64d51-2181-4510-b14f-e63d2f111a8e', 'E2174', 'ELIO JIMENEZ MESTRA', '', '+57 301 4383487', 
                '', '', '', 'BG865803', '', 
                '', 'Pendiente Ingresar', 'Si', 'Colombiano', 
                '1975-07-26', null, '', '2026-06-09', null, 
                null, null, 'WISEOWE', 'TUBERO', 
                'SISTEMAS DE FILTRADO Y TRATAMIENTO DE FLUIDOS SL', 'XL(60)', 'L(46)', 'C0176', null
            ) RETURNING id;
        `);
        const e2174Id = resE2174.rows[0].id;
        console.log(`Inserted core_personal.workers row for E2174 (UUID: ${e2174Id})`);

        // 3. Insert MARCOS FIDEL RAMOS ARROYO (E2175)
        const resE2175 = await client.query(`
            INSERT INTO core_personal.workers (
                empresa_id, cod_colab, nome, email, movil, niss, nie, dni, pasaporte, nif, 
                status_seguridad, status_trabajador, licencia_conducir, nacionalidade, 
                fecha_nacimiento, nuss, foto, data_ingresso, data_baixa, 
                data_alta_seguridad, data_baixa_seguridad, contratante, funcion, 
                cliente, camiseta, pantalones, cod_cliente, cod_funcion
            ) VALUES (
                'dae64d51-2181-4510-b14f-e63d2f111a8e', 'E2175', 'MARCOS FIDEL RAMOS ARROYO', '', '+57 301 7207320', 
                '', '', '', '', '', 
                '', 'Pendiente Ingresar', 'No', 'Colombiano', 
                null, null, '', '2026-06-08', null, 
                null, null, 'WISEOWE', 'SOLDADOR TIG (GTAW)', 
                'INSTALACIONES Y SISTEMAS HIDRÁULICOS', 'L(58)', 'S (38/40)', 'C0108', null
            ) RETURNING id;
        `);
        const e2175Id = resE2175.rows[0].id;
        console.log(`Inserted core_personal.workers row for E2175 (UUID: ${e2175Id})`);

        // 4. Insert into public.colaboradores
        await client.query(`
            INSERT INTO public.colaboradores (
                sp_id, cod_colab, nombre, pasaporte, fecha_nacimiento, nacionalidade, 
                dni, nie, movil, niss, nif, status_seguridad, status_trabajador, 
                camiseta, pantalones, licencia_conducir, funcion, contratante, 
                domicilio, email, foto, nuss, fecha_inicio, fecha_alta
            ) VALUES 
            (2125, 'E2125', 'PEDRO ALEXANDER ROJAS RODRIGUEZ', 'AW121633', '1975-01-21', 'Colombiano', '', '', '+573505179783', '12183222525', '336211198', 'Pendiente Alta', 'Pendiente Ingresar', 'L(58)', 'M(42/44)', 'No', 'SOLDADOR MIG-MAG / ELECTRODO (GMAW / SMAW)', 'WISEOWE', 'Rua de Santa Luzia, 2785 - 483 São Domingos de Rana, Portugal', '', '', null, '2026-06-09', '2026-06-09'),
            (2174, 'E2174', 'ELIO JIMENEZ MESTRA', 'BG865803', '1975-07-26', 'Colombiano', '', '', '+57 301 4383487', '', '', '', 'Pendiente Ingresar', 'XL(60)', 'L(46)', 'Si', 'TUBERO', 'WISEOWE', '', '', '', null, '2026-06-09', null),
            (2175, 'E2175', 'MARCOS FIDEL RAMOS ARROYO', '', null, 'Colombiano', '', '', '+57 301 7207320', '', '', '', 'Pendiente Ingresar', 'L(58)', 'S (38/40)', 'No', 'SOLDADOR TIG (GTAW)', 'WISEOWE', '', '', '', null, '2026-06-08', null);
        `);
        console.log("Inserted legacy rows in public.colaboradores");

        // 5. Insert into public.colaborador_por_pedido
        await client.query(`
            INSERT INTO public.colaborador_por_pedido (
                sp_id, cod_colab, codcliente, cliente_nombre, contratante, 
                fechainiciopedido, tiposervico, codpedido
            ) VALUES 
            (10002125, 'E2125', 'C0176', 'SISTEMAS DE FILTRADO Y TRATAMIENTO DE FLUIDOS SL', 'Wiseowe', '2026-06-09', 'Pedido', '778'),
            (10002174, 'E2174', 'C0176', 'SISTEMAS DE FILTRADO Y TRATAMIENTO DE FLUIDOS SL', 'Wiseowe', '2026-06-09', 'Pedido', '778'),
            (10002175, 'E2175', 'C0108', 'INSTALACIONES Y SISTEMAS HIDRÁULICOS', 'Wiseowe', '2026-06-08', 'Pedido', '774');
        `);
        console.log("Inserted assignment rows in public.colaborador_por_pedido");

        // 6. Insert bank details (IBAN) for E2125 (Pedro Alexander)
        await client.query(`
            INSERT INTO core_personal.worker_ibans (
                worker_id, banco, iban, status, observacoes, data_alteracao
            ) VALUES 
            ($1, 'Banco Espanhol', 'ES4701829034570201671601', 'ATIVO', 'Importado via Planilha de Controle', '2026-03-23');
        `, [e2125Id]);
        console.log("Inserted bank details (IBAN) for E2125");

        // 7. Insert seguridade status (alta workflow) ONLY for E2125
        await client.query(`
            INSERT INTO core_personal.seguridade_status (
                worker_id, empresa_id, tipo_evento, status, origem, 
                data_solicitacao, data_efetiva, origem_cliente_nome, origem_contratante
            ) VALUES 
            ($1, 'dae64d51-2181-4510-b14f-e63d2f111a8e', 'alta', 'pendente', 'Sistema', '2026-06-04', null, 'SISTEMAS DE FILTRADO Y TRATAMIENTO DE FLUIDOS SL', 'Wiseowe');
        `, [e2125Id]);
        console.log("Inserted seguridade status (alta) for E2125");

        // 8. Clean up side-effect duplicate records created under Stocco by legacy trigger
        const cleanupRes = await client.query(`
            DELETE FROM core_personal.workers
            WHERE cod_colab IN ('E2125', 'E2174', 'E2175') AND empresa_id = '441f1f5d-aed3-40e3-8c77-7b1217757251'
        `);
        console.log(`Cleaned up side-effect Stocco worker records (rows deleted: ${cleanupRes.rowCount})`);

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
