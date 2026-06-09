const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();

    console.log("Connected to PROD DB. Starting transaction to register E1162 and E2176...");
    
    try {
        await client.query("BEGIN");

        // === 1. WALDIR ENRIQUE VERGARA PACHECO (E1162) ===
        // Insert into core_personal.workers for LUMINOUS
        const resE1162 = await client.query(`
            INSERT INTO core_personal.workers (
                empresa_id, cod_colab, nome, email, movil, niss, nie, dni, pasaporte, nif, 
                status_seguridad, status_trabajador, licencia_conducir, nacionalidade, 
                fecha_nacimiento, nuss, foto, data_ingresso, data_baixa, 
                data_alta_seguridad, data_baixa_seguridad, contratante, funcion, 
                cliente, camiseta, pantalones, cod_cliente, cod_funcion
            ) VALUES (
                '847796c4-b253-4e53-9e6b-34a127ec7d85', 'E1162', 'WALDIR ENRIQUE VERGARA PACHECO', '', '+34691440503', 
                '12178445283', '', '', 'BD911474', '329389297', 
                'Pendiente Alta', 'Pendiente Ingresar', 'No', '', 
                '1968-06-27', null, '', '2026-06-08', null, 
                null, null, 'LUMINOUS', 'ENCARGADO SOLDADURA', 
                'COMESA SL', 'L(58)', 'S (38/40)', 'C0054', null
            ) RETURNING id;
        `);
        const e1162WorkerId = resE1162.rows[0].id;
        console.log(`Inserted core_personal.workers row for E1162 (UUID: ${e1162WorkerId})`);

        // Insert into public.colaboradores for E1162
        await client.query(`
            INSERT INTO public.colaboradores (
                sp_id, cod_colab, nombre, pasaporte, fecha_nacimiento, nacionalidade, 
                dni, nie, movil, niss, nif, status_seguridad, status_trabajador, 
                camiseta, pantalones, licencia_conducir, funcion, contratante, 
                domicilio, email, foto, nuss, fecha_inicio, fecha_alta
            ) VALUES (
                1162, 'E1162', 'WALDIR ENRIQUE VERGARA PACHECO', 'BD911474', '1968-06-27', '', 
                '', '', '+34691440503', '12178445283', '329389297', 'Pendiente Alta', 'Pendiente Ingresar', 
                'L(58)', 'S (38/40)', 'No', 'ENCARGADO SOLDADURA', 'LUMINOUS', 
                '', '', '', null, '2026-06-08', null
            );
        `);
        console.log("Inserted E1162 row in public.colaboradores");

        // Insert into public.colaborador_por_pedido for E1162
        await client.query(`
            INSERT INTO public.colaborador_por_pedido (
                sp_id, cod_colab, codcliente, cliente_nombre, contratante, 
                fechainiciopedido, tiposervico, codpedido, nome_colab, funcion
            ) VALUES (
                10001162, 'E1162', 'C0054', 'COMESA SL', 'Luminous', 
                '2026-06-08', 'Pedido', '775', 'WALDIR ENRIQUE VERGARA PACHECO', 'ENCARGADO SOLDADURA'
            );
        `);
        console.log("Inserted E1162 assignment row in public.colaborador_por_pedido");

        // Insert into core_personal.seguridade_status for E1162 (has both NIF and NISS)
        await client.query(`
            INSERT INTO core_personal.seguridade_status (
                worker_id, empresa_id, tipo_evento, status, origem, 
                data_solicitacao, data_efetiva, origem_cliente_nome, origem_contratante
            ) VALUES 
            ($1, '847796c4-b253-4e53-9e6b-34a127ec7d85', 'alta', 'pendente', 'Sistema', '2026-06-05', '2026-06-08', 'COMESA SL', 'Luminous');
        `, [e1162WorkerId]);
        console.log("Inserted seguridade status (alta/pendente) for E1162");


        // === 2. SEBASTIAN CORREA RUIZ (E2176) ===
        // Insert into core_personal.workers for LUMINOUS
        const resE2176 = await client.query(`
            INSERT INTO core_personal.workers (
                empresa_id, cod_colab, nome, email, movil, niss, nie, dni, pasaporte, nif, 
                status_seguridad, status_trabajador, licencia_conducir, nacionalidade, 
                fecha_nacimiento, nuss, foto, data_ingresso, data_baixa, 
                data_alta_seguridad, data_baixa_seguridad, contratante, funcion, 
                cliente, camiseta, pantalones, cod_cliente, cod_funcion
            ) VALUES (
                '847796c4-b253-4e53-9e6b-34a127ec7d85', 'E2176', 'SEBASTIAN CORREA RUIZ', '', '+57 323 4897362', 
                '', '', '', '', '', 
                '', 'Pendiente Ingresar', 'Si', '', 
                null, null, '', '2026-06-10', null, 
                null, null, 'LUMINOUS', 'SOLDADOR TIG / MIG-MAG (GTAW / GMAW)', 
                'SINFINES FACTORY S.L', 'L(58)', 'S (38/40)', 'C0265', null
            ) RETURNING id;
        `);
        const e2176WorkerId = resE2176.rows[0].id;
        console.log(`Inserted core_personal.workers row for E2176 (UUID: ${e2176WorkerId})`);

        // Insert into public.colaboradores for E2176
        await client.query(`
            INSERT INTO public.colaboradores (
                sp_id, cod_colab, nombre, pasaporte, fecha_nacimiento, nacionalidade, 
                dni, nie, movil, niss, nif, status_seguridad, status_trabajador, 
                camiseta, pantalones, licencia_conducir, funcion, contratante, 
                domicilio, email, foto, nuss, fecha_inicio, fecha_alta
            ) VALUES (
                2176, 'E2176', 'SEBASTIAN CORREA RUIZ', '', null, '', 
                '', '', '+57 323 4897362', '', '', '', 'Pendiente Ingresar', 
                'L(58)', 'S (38/40)', 'Si', 'SOLDADOR TIG / MIG-MAG (GTAW / GMAW)', 'LUMINOUS', 
                '', '', '', null, '2026-06-10', null
            );
        `);
        console.log("Inserted E2176 row in public.colaboradores");

        // Insert into public.colaborador_por_pedido for E2176
        await client.query(`
            INSERT INTO public.colaborador_por_pedido (
                sp_id, cod_colab, codcliente, cliente_nombre, contratante, 
                fechainiciopedido, tiposervico, codpedido, nome_colab, funcion
            ) VALUES (
                10002176, 'E2176', 'C0265', 'SINFINES FACTORY S.L', 'Luminous', 
                '2026-06-10', 'Pedido', '777', 'SEBASTIAN CORREA RUIZ', 'SOLDADOR TIG / MIG-MAG (GTAW / GMAW)'
            );
        `);
        console.log("Inserted E2176 assignment row in public.colaborador_por_pedido");


        // === 3. Trigger Cleanup ===
        // Clean up side-effect duplicate records created under Stocco by legacy trigger
        const cleanupRes = await client.query(`
            DELETE FROM core_personal.workers
            WHERE cod_colab IN ('E1162', 'E2176') AND empresa_id = '441f1f5d-aed3-40e3-8c77-7b1217757251'
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
