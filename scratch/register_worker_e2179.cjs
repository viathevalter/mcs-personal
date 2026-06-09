const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    await client.connect();

    console.log("Connected to PROD DB. Starting transaction to register E2179...");
    
    try {
        await client.query("BEGIN");

        // 1. Insert into core_personal.workers for LUMINOUS (847796c4-b253-4e53-9e6b-34a127ec7d85)
        const resLuminous = await client.query(`
            INSERT INTO core_personal.workers (
                empresa_id, cod_colab, nome, email, movil, niss, nie, dni, pasaporte, nif, 
                status_seguridad, status_trabajador, licencia_conducir, nacionalidade, 
                fecha_nacimiento, nuss, foto, data_ingresso, data_baixa, 
                data_alta_seguridad, data_baixa_seguridad, contratante, funcion, 
                cliente, camiseta, pantalones, cod_cliente, cod_funcion
            ) VALUES (
                '847796c4-b253-4e53-9e6b-34a127ec7d85', 'E2179', 'LEONARDO RAUL ROJAS', '', '+351 913 435 229', 
                '12168820316', '', '', 'AAH585101', '317445456', 
                'Pendiente Alta', 'Pendiente Ingresar', 'Si', '', 
                '1991-07-13', null, '', '2026-06-12', null, 
                null, null, 'LUMINOUS', 'ELECTRICISTA', 
                'COMESA SL', 'XL(60)', 'L(46)', 'C0054', null
            ) RETURNING id;
        `);
        const workerId = resLuminous.rows[0].id;
        console.log(`Inserted core_personal.workers row for LUMINOUS (UUID: ${workerId})`);

        // 2. Insert into public.colaboradores
        await client.query(`
            INSERT INTO public.colaboradores (
                sp_id, cod_colab, nombre, pasaporte, fecha_nacimiento, nacionalidade, 
                dni, nie, movil, niss, nif, status_seguridad, status_trabajador, 
                camiseta, pantalones, licencia_conducir, funcion, contratante, 
                domicilio, email, foto, nuss, fecha_inicio, fecha_alta
            ) VALUES (
                2179, 'E2179', 'LEONARDO RAUL ROJAS', 'AAH585101', '1991-07-13', '', 
                '', '', '+351 913 435 229', '12168820316', '317445456', 'Pendiente Alta', 'Pendiente Ingresar', 
                'XL(60)', 'L(46)', 'Si', 'ELECTRICISTA', 'LUMINOUS', 
                'Rua Americo Oliveira 807 4415-425 Oporto, Portugal', '', '', null, '2026-06-12', null
            );
        `);
        console.log("Inserted legacy row in public.colaboradores");

        // 3. Insert into public.colaborador_por_pedido
        await client.query(`
            INSERT INTO public.colaborador_por_pedido (
                sp_id, cod_colab, codcliente, cliente_nombre, contratante, 
                fechainiciopedido, tiposervico, codpedido, nome_colab, funcion
            ) VALUES (
                10002179, 'E2179', 'C0054', 'COMESA SL', 'Luminous', 
                '2026-06-12', 'Pedido', 'R206', 'LEONARDO RAUL ROJAS', 'ELECTRICISTA'
            );
        `);
        console.log("Inserted assignment row in public.colaborador_por_pedido");

        // 4. Insert into core_personal.seguridade_status (has both NIF and NISS)
        await client.query(`
            INSERT INTO core_personal.seguridade_status (
                worker_id, empresa_id, tipo_evento, status, origem, 
                data_solicitacao, data_efetiva, origem_cliente_nome, origem_contratante
            ) VALUES 
            ($1, '847796c4-b253-4e53-9e6b-34a127ec7d85', 'alta', 'pendente', 'Sistema', '2026-06-09', '2026-06-12', 'COMESA SL', 'Luminous');
        `, [workerId]);
        console.log("Inserted seguridade status (alta/pendente) for worker");

        // 5. Clean up side-effect duplicate record created under Stocco by legacy trigger
        const cleanupRes = await client.query(`
            DELETE FROM core_personal.workers
            WHERE cod_colab = 'E2179' AND empresa_id = '441f1f5d-aed3-40e3-8c77-7b1217757251'
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
