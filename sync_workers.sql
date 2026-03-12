BEGIN;\n\n-- Optional: Clean up existing assignments if requested, but we'll focus on Upserts\n
UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0058';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0058' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ALUMINIO YACHT COSTS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0058' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0058', 'HENRRY CASTRO COLLACHAGUA', v_idcliente, '9', 'ALUMINIO YACHT COSTS SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0062';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0062' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ARDANORE 14 SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0062' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0062', 'AYRTON MAXIMO CUMPA SENADOR', v_idcliente, '13', 'ARDANORE 14 SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0064';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0064' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ARDANORE 14 SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0064' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0064', 'JAIME MANOLO ALVAREZ TORRES', v_idcliente, '13', 'ARDANORE 14 SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0067';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0067' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ARDANORE 14 SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0067' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0067', 'JAVIER SAUL PEREA CAMARGO', v_idcliente, '13', 'ARDANORE 14 SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0065';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0065' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ARDANORE 14 SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0065' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0065', 'JESUS ALBERTO GONZALES FERNANDEZ', v_idcliente, '13', 'ARDANORE 14 SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0061';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0061' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ARDANORE 14 SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0061' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0061', 'SIMION LUCIANO CHILINGANO PILLACA', v_idcliente, '13', 'ARDANORE 14 SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2126';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2126' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ATTSU TECNIVAP S.A%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2126' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2126', 'ANTONIO FAGNER ARAUJO DE OLIVEIRA', v_idcliente, '16', 'ATTSU TECNIVAP S.A', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0069';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0069' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ATTSU TECNIVAP S.A%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0069' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0069', 'JONATAS HERTEL LOUZADA', v_idcliente, '16', 'ATTSU TECNIVAP S.A', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0072';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0072' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ATTSU TECNIVAP S.A%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0072' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0072', 'MOACIR DA SILVA', v_idcliente, '16', 'ATTSU TECNIVAP S.A', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0035';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0035' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ATTSU TECNIVAP S.A%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0035' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0035', 'GUERMAIN ISAAC SAJAMIN PANDURO', v_idcliente, '16', 'ATTSU TECNIVAP S.A', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0343';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0343' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%AURO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0343' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0343', 'VICTOR EDGARDO RAMIREZ GRANDA', v_idcliente, '17', 'AURO', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0075';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0075' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%AURO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0075' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0075', 'WILLIAM NOE MANRIQUE MOREYRA', v_idcliente, '17', 'AURO', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Mecánico/Montador', ''), funcion)
WHERE cod_colab = 'E0083';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0083' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%AZERO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0083' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0083', 'DAVID RICARDO SANCHEZ ZAPATA', v_idcliente, '19', 'AZERO', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0086';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0086' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BABCOCK MONTAJES S.A.U%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0086' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0086', 'HECTOR DAVID RAMOS BUHEZO', v_idcliente, '21', 'BABCOCK MONTAJES S.A.U', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0087';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0087' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BABCOCK MONTAJES S.A.U%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0087' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0087', 'HECTOR SANCHEZ GUERRERO', v_idcliente, '21', 'BABCOCK MONTAJES S.A.U', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0044';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0044' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BABCOCK MONTAJES S.A.U%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0044' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0044', 'JESUS JAMES BALDEON ZUNIGA', v_idcliente, '21', 'BABCOCK MONTAJES S.A.U', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0414';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0414' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0414' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0414', 'FREDIS ANTONIO MORELOS COLON', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Encanador', ''), funcion)
WHERE cod_colab = 'E0089';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0089' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0089' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0089', 'GUSTAVO DAMIAN DONOSO', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Inspector', ''), funcion)
WHERE cod_colab = 'E0097';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0097' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0097' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0097', 'JEAN CARLO GARCIA GARCIA', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0090';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0090' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0090' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0090', 'JOSE HERNAN RODRIGUEZ', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Inspector', ''), funcion)
WHERE cod_colab = 'E0093';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0093' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0093' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0093', 'JUAN CARLOS CHAPARRO QUINTERO', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Encanador', ''), funcion)
WHERE cod_colab = 'E0088';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0088' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0088' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0088', 'NIVALDO MENDES DA SILVA', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0091';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0091' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0091' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0091', 'WILLIAM MORAIS DA SILVA', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Pulidor', ''), funcion)
WHERE cod_colab = 'E0704';

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2024';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2024' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2024' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2024', 'GERARDO LARA GONZALEZ', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0197';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0197' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0197' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0197', 'GIAN CARLOS SAAVEDRA LAPA', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1284';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1284' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1284' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1284', 'JOSEPH ESTIVENS NIETO FERNANDEZ', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E0551';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0551' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0551' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0551', 'NILSON MOSQUERA GOMEZ', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0098';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0098' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BACHILLER SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0098' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0098', 'RICARDO MILLER SANCHEZ BECERRA', v_idcliente, '22', 'BACHILLER SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Ingeniero Mecánico', ''), funcion)
WHERE cod_colab = 'E2148';

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico / Montador', ''), funcion)
WHERE cod_colab = 'E2105';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2105' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2105' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2105', 'GUSTAVO ADOLFO DEL ANGEL MONTERO', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0431';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0431' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0431' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0431', 'HELMUT WALTER ROSALES MURILLO', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('eletricista', ''), funcion)
WHERE cod_colab = 'E1842';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1842' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1842' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1842', 'BLAKIS ANTONIO BARBOZA TRUJILLO', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0100';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0100' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0100' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0100', 'CARLOS ARTURO GONZALEZ GOMEZ', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1868';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1868' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1868' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1868', 'EDGAR ENRIQUE TORRES RAMIREZ', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico/Montador', ''), funcion)
WHERE cod_colab = 'E2028';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2028' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2028' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2028', 'IVAN ANDRES ORTIZ GALVAN', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1843';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1843' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1843' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1843', 'JUAN ALBEIRO MONSALVE MARIN', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico/Montador', ''), funcion)
WHERE cod_colab = 'E2032';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2032' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2032' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2032', 'LUIS ANTONIO SOTO VIDAL', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1846';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1846' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1846' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1846', 'LUIS FERNANDO VASQUEZ ALVARADO', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1727';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1727' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1727' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1727', 'MATEO CANTILLO PAYARES', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tornero', ''), funcion)
WHERE cod_colab = 'E2112';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2112' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2112' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2112', 'LUIS FELIPE TRILLOS NAVARRO', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico/Soldador', ''), funcion)
WHERE cod_colab = 'E2031';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2031' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BECK & POLLITIZER IBERICA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2031' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2031', 'WILSON ALEXANDER GOMEZ', v_idcliente, '24', 'BECK & POLLITIZER IBERICA SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E0104';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0104' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BIANNA RECYCLING%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0104' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0104', 'GILBER MORA DIAZ', v_idcliente, '25', 'BIANNA RECYCLING', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E2083';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2083' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BIANNA RECYCLING%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2083' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2083', 'HECTOR MANUEL BUELVAS ZAMBRANO', v_idcliente, '25', 'BIANNA RECYCLING', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0112';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0112' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BIANNA RECYCLING%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0112' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0112', 'JAHIR SURLEY DELGADO AGREDO', v_idcliente, '25', 'BIANNA RECYCLING', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0105';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0105' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BIANNA RECYCLING%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0105' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0105', 'JUAN CARLOS VILLANUEVA GALVIS', v_idcliente, '25', 'BIANNA RECYCLING', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Pintor', ''), funcion)
WHERE cod_colab = 'E0106';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0106' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BIANNA RECYCLING%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0106' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0106', 'EDU PANDURO RUIZ', v_idcliente, '25', 'BIANNA RECYCLING', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Pintor', ''), funcion)
WHERE cod_colab = 'E0107';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0107' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BIANNA RECYCLING%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0107' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0107', 'EDUARDO JOSE RUSSO LINERO', v_idcliente, '25', 'BIANNA RECYCLING', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Pintor', ''), funcion)
WHERE cod_colab = 'E0108';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0108' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BIANNA RECYCLING%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0108' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0108', 'JOHN FREDDY PEREZ RUIZ', v_idcliente, '25', 'BIANNA RECYCLING', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1543';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1543' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BIANNA RECYCLING%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1543' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1543', 'JUAN CARLOS VILLANUEVA DE LA HOZ', v_idcliente, '25', 'BIANNA RECYCLING', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0111';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0111' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BIANNA RECYCLING%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0111' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0111', 'XEMIR SOLER ROMERO', v_idcliente, '25', 'BIANNA RECYCLING', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1895';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1895' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDENOR%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1895' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1895', 'DAMIAN ZAMBRANO TULANDE', v_idcliente, '30', 'CALDENOR', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0125';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0125' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDENOR%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0125' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0125', 'EVELIO ANGULO ANGULO', v_idcliente, '30', 'CALDENOR', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1415';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1415' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDENOR%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1415' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1415', 'JHON EINER INSUASTI TULANDE', v_idcliente, '30', 'CALDENOR', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1818';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1818' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDENOR%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1818' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1818', 'WILBER LOPEZ BALETA', v_idcliente, '30', 'CALDENOR', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2034';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2034' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDENOR%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2034' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2034', 'WILMER ANTONIO BLANCO ALVAREZ', v_idcliente, '30', 'CALDENOR', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1918';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1918' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDERAS RCB%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1918' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1918', 'CRISTIAN CAMILO BORRE SILVA', v_idcliente, '33', 'CALDERAS RCB', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0637';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0637' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDERAS RCB%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0637' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0637', 'EDUAR MANUEL DAVILA CERON', v_idcliente, '33', 'CALDERAS RCB', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E2074';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2074' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CMR SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2074' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2074', 'ALEXIS ENRIQUE MORENO ARRIETA', v_idcliente, '41', 'CMR SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1749';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1749' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CMR SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1749' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1749', 'ARLINTON ENRIQUE CABALLERO PEDROZO', v_idcliente, '41', 'CMR SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E2075';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2075' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CMR SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2075' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2075', 'DUBERNEY POSCUE FAJARDO', v_idcliente, '41', 'CMR SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero/Soldador', ''), funcion)
WHERE cod_colab = 'E1917';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1917' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CMR SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1917' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1917', 'MARIO ANTONIO HERRERA ORTEGA', v_idcliente, '41', 'CMR SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E2045';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2045' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CMR SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2045' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2045', 'EISON RAFAEL IBARRA SIERRA', v_idcliente, '41', 'CMR SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E1940';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1940' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CMR SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1940' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1940', 'NICXON GARCIA FIERRO', v_idcliente, '41', 'CMR SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Mecánico/Montador', ''), funcion)
WHERE cod_colab = 'E0588';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0588' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CMR SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0588' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0588', 'SERGIO LUIS BELTRAN BALDOVINO', v_idcliente, '41', 'CMR SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0192';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0192' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CMR SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0192' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0192', 'YUVER RUSO CRUZ DAMIAN', v_idcliente, '41', 'CMR SA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1703';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1703' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDESOL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1703' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1703', 'ANDERSON CHELUVAY GONZALEZ TRUJILLO', v_idcliente, '42', 'CALDESOL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0177';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0177' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDESOL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0177' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0177', 'ARLEY DARIO PANTOJA CABRERA', v_idcliente, '42', 'CALDESOL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0622';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0622' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDESOL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0622' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0622', 'BREINER MOLINA PELAEZ', v_idcliente, '42', 'CALDESOL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0144';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0144' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDESOL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0144' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0144', 'CARLOS EDUARDO CARDENAS ESPINOSA', v_idcliente, '42', 'CALDESOL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1958';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1958' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDESOL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1958' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1958', 'HERNANDO ENRIQUE MAESTRE CASTILLA', v_idcliente, '42', 'CALDESOL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1965';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1965' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDESOL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1965' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1965', 'GUSTAVO RAFAEL CARRILLO NUNEZ', v_idcliente, '42', 'CALDESOL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1618';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1618' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDESOL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1618' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1618', 'ISAHAC EMILIO RADA BRUGES', v_idcliente, '42', 'CALDESOL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0146';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0146' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDESOL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0146' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0146', 'JESUS DAVID CARDENAS RIVERA', v_idcliente, '42', 'CALDESOL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1772';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1772' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDESOL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1772' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1772', 'JESUS ELIECER ALVAREZ ORTIZ', v_idcliente, '42', 'CALDESOL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1531';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1531' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDESOL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1531' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1531', 'JORGE ANTONIO RAMIREZ LUNA', v_idcliente, '42', 'CALDESOL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Ayudante', ''), funcion)
WHERE cod_colab = 'E0152';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0152' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0152' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0152', 'CARLOS ADRIAN CAMELO CALDERON', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0166';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0166' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0166' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0166', 'ALVARO ENRIQUE ROJAS DE LA OSSA', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0155';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0155' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0155' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0155', 'CARLOS ALBERTO RAMOS URBANO', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0161';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0161' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0161' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0161', 'EDILBERTO DOMINGUEZ PEREIRA', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0164';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0164' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0164' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0164', 'JORGE ARLEY ALVAREZ GONZALEZ', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0163';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0163' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0163' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0163', 'JOSE DE JESUS MENDOZA PADILLA', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Ayudante', ''), funcion)
WHERE cod_colab = 'E1426';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1426' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1426' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1426', 'RENZO JUNIOR CHUNGA LUJAN', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0151';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0151' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0151' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0151', 'GUILLERMO LEON POSADA LONDONO', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2070';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2070' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2070' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2070', 'HERNAN BERNARDO QUINTERO JARAMILLO', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0123';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0123' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0123' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0123', 'JIM PAUL CHUNGA LUJAN', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0034';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0034' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0034' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0034', 'JORDY ALEXANDER ALVA PAYAC', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Ayudante', ''), funcion)
WHERE cod_colab = 'E1751';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1751' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1751' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1751', 'NELSON JAIME PITRE CASTILLA', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0036';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0036' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0036' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0036', 'ROLANDO CATUNTA MAMANI', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0296';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0296' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0296' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0296', 'WILMER YANAYACO PINEDO', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1788';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1788' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1788' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1788', 'YANNY ALBERTO HERNANDEZ LOZANO', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('ROSAS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0032';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0032' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%ROSAS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAM IMPIANTI INDUSTRIALI SRL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0032' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0032', 'YOBER HUAMAN VELASQUE', v_idcliente, '43', 'CAM IMPIANTI INDUSTRIALI SRL', v_idempresa, 'ROSAS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador/Montador', ''), funcion)
WHERE cod_colab = 'E2073';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2073' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CERRAJERIA METALICAS AVENIDA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2073' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2073', 'APOLINAR GARCIA HERNANDEZ', v_idcliente, '47', 'CERRAJERIA METALICAS AVENIDA S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1852';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1852' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CERRAJERIA METALICAS AVENIDA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1852' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1852', 'JHORMAN STEVEN PINTO QUITORA', v_idcliente, '47', 'CERRAJERIA METALICAS AVENIDA S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E2134';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2134' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CERRAJERIA METALICAS AVENIDA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2134' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2134', 'DUVAN ALEXIS SUAREZ TRUJILLO', v_idcliente, '47', 'CERRAJERIA METALICAS AVENIDA S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1820';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1820' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CERRAJERIA METALICAS AVENIDA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1820' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1820', 'JOSE YOVANNY LOZANO GOMEZ', v_idcliente, '47', 'CERRAJERIA METALICAS AVENIDA S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1371';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1371' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CERRAJERIA METALICAS AVENIDA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1371' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1371', 'YAMIR CUTIVA SANCHEZ', v_idcliente, '47', 'CERRAJERIA METALICAS AVENIDA S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1976';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1976' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1976' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1976', 'CARLOS DANIEL RODRIGUEZ PENA', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E2090';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2090' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2090' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2090', 'EDGAR CORRALES HOYOS', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0632';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0632' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0632' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0632', 'FABIAN JARAMILLO MARIN', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;
COMMIT;\n\nBEGIN;\n
UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0632';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0632' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0632' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0632', 'FABIAN JARAMILLO MARIN', v_idcliente, '54', 'COMESA SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1690';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1690' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1690' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1690', 'JHON FREDDY CABRERA AGUILAR', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1690';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1690' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1690' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1690', 'JHON FREDDY CABRERA AGUILAR', v_idcliente, '54', 'COMESA SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0174';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0174' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0174' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0174', 'JULIAN EDUARDO ARCO SAENZ', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0174';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0174' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0174' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0174', 'JULIAN EDUARDO ARCO SAENZ', v_idcliente, '54', 'COMESA SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0505';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0505' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0505' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0505', 'MARIO ALEXANDER PEÑALOZA GARCIA', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1674';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1674' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1674' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1674', 'JAVIER HUMBERTO PARRA CORREA', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1894';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1894' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1894' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1894', 'JUAN PABLO PENA ZAPATA', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1726';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1726' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1726' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1726', 'JUAN QUINTANA DE AVILA', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1726';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1726' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1726' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1726', 'JUAN QUINTANA DE AVILA', v_idcliente, '54', 'COMESA SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E2125';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2125' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2125' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2125', 'PEDRO ALEXANDER ROJAS RODRIGUEZ', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1573';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1573' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1573' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1573', 'PEDRO ISIDRO CAMELO BENAVIDES', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2124';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2124' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2124' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2124', 'ROBERTO CASTILLA JIMENEZ', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1117';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1117' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1117' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1117', 'ERIK RUBEN RAMIREZ SIMANCAS', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0173';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0173' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0173' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0173', 'YOFRE DAVID ERAZO TORRES', v_idcliente, '54', 'COMESA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0173';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0173' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMESA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0173' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0173', 'YOFRE DAVID ERAZO TORRES', v_idcliente, '54', 'COMESA SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E0383';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0383' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0383' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0383', 'ARLEMAR RAFAEL CAMPOS WOLFF', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2103';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2103' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2103' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2103', 'BOLIVAR GABRIEL ALDANA RAMIREZ', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2094';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2094' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2094' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2094', 'BYRON YESID SUAREZ CUADRADO', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E1731';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1731' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1731' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1731', 'CARLOS ANDRES PULIDO CHAVEZ', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2120';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2120' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2120' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2120', 'CESAR NORBEY PENAGOS DUQUE', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E0613';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0613' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0613' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0613', 'DIDIER JOSE CHOLES MIRANDA', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E1970';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1970' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1970' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1970', 'EDDIE DE JESUS ZARATE IGUARAN', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico/Montador', ''), funcion)
WHERE cod_colab = 'E1907';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1907' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1907' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1907', 'EDWIN ALFONSO ORTIZ DELGADO', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0180';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0180' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0180' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0180', 'EDWIN FERNANDO LINARES MACA', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0182';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0182' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0182' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0182', 'JEFFERSON ANDRES VALIENTE PEREZ', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2121';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2121' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2121' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2121', 'JESUS ALBERTO PENARANDA VILLALOBOS', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0181';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0181' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0181' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0181', 'JOSE ELMES PASTES DOMINGUEZ', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2099';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2099' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2099' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2099', 'LUIS DIOMEDES RODRIGUEZ USTARIS', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2117';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2117' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2117' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2117', 'MARCELO JAVIER GARCIA RUIZ DIAZ', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E2060';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2060' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2060' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2060', 'PROSPERO SUAREZ PASTRAN', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1932';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1932' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1932' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1932', 'FABIO DOMINGUEZ BRAVO', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2119';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2119' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2119' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2119', 'JEISON ANDRES REYES PACHECO', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Pendiente Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E1680';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1680' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1680' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1680', 'JORGE LEONARDO MACHUCA GARCIA', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2101';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2101' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2101' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2101', 'JOSE JONATHAN CANO SALAZAR', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2118';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2118' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2118' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2118', 'JUAN CARLOS CASTRO BARRAGAN', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E0639';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0639' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0639' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0639', 'JULIO CESAR ANTEQUERA ALMARALES', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico/Montador', ''), funcion)
WHERE cod_colab = 'E1866';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1866' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1866' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1866', 'LUIS ALBERTO CAMARGO NINO', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1942';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1942' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1942' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1942', 'LUIS ALEXANDER SEPULVEDA GUERRERO', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1767';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1767' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1767' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1767', 'LUIS EFRAIN ADRIANZEN MARCELO', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico/Montador', ''), funcion)
WHERE cod_colab = 'E2016';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2016' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2016' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2016', 'MARIO LUIS FERNANDO PEDEMONTE RUIZ', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico/Montador', ''), funcion)
WHERE cod_colab = 'E2007';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2007' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2007' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2007', 'NESTOR ALEXANDER VIERA CANALES', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E1563';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1563' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1563' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1563', 'NICOLAS MIGUEL PEDRAZA MENDOZA', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0081';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0081' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0081' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0081', 'ROLFI ESTEBAN TORRES SOTELO', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0080';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0080' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0080' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0080', 'ROMEL YBAN TUFINIO ZOCON', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2097';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2097' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2097' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2097', 'VICTOR JAVIER RIERA FLORES', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E0630';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0630' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0630' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0630', 'WILMER DE JESUS ARIZA MUÑOZ', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2123';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2123' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2123' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2123', 'YEFERSON DANIEL NEIRA ESPINOSA', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E2064';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2064' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CORDOBA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2064' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2064', 'YORVY RAFAEL MARTINEZ ROMERO', v_idcliente, '60', 'CORDOBA SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Pintor', ''), funcion)
WHERE cod_colab = 'E0194';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0194' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DOHERCO MIRANDA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0194' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0194', 'ALAN FRANCISCO NAVAS DIAZ', v_idcliente, '64', 'DOHERCO MIRANDA S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Operador de Granallador', ''), funcion)
WHERE cod_colab = 'E0195';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0195' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DOHERCO MIRANDA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0195' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0195', 'BLADIMIRO DIAZ MARTINEZ', v_idcliente, '64', 'DOHERCO MIRANDA S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Pintor', ''), funcion)
WHERE cod_colab = 'E0196';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0196' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DOHERCO MIRANDA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0196' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0196', 'JHON ADAIMER MORALES MORALES', v_idcliente, '64', 'DOHERCO MIRANDA S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0233';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0233' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELECTRODINAMIC JO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0233' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0233', 'EISON SALAS AHUMEDO', v_idcliente, '70', 'ELECTRODINAMIC JO', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0235';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0235' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELECTRODINAMIC JO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0235' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0235', 'FABIAN LLERAR ROA MATEUS', v_idcliente, '70', 'ELECTRODINAMIC JO', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0229';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0229' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELECTRODINAMIC JO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0229' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0229', 'FRANCISCO JAVIER MERCADO MELENDEZ', v_idcliente, '70', 'ELECTRODINAMIC JO', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1442';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1442' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELECTRODINAMIC JO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1442' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1442', 'NEIRON ENRIQUE CARCAMO REALES', v_idcliente, '70', 'ELECTRODINAMIC JO', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0234';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0234' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELECTRODINAMIC JO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0234' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0234', 'WILMAN DE AVILA MARRIAGA', v_idcliente, '70', 'ELECTRODINAMIC JO', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0230';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0230' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELECTRODINAMIC JO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0230' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0230', 'YEFFERSON ZULUAGA BUITRAGO', v_idcliente, '70', 'ELECTRODINAMIC JO', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1469';

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Eletricista', ''), funcion)
WHERE cod_colab = 'E1741';

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico', ''), funcion)
WHERE cod_colab = 'E0617';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0617' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELYTT ENERGY SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0617' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0617', 'ANDRES FELIPE MARULANDA ARAQUE', v_idcliente, '71', 'ELYTT ENERGY SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico', ''), funcion)
WHERE cod_colab = 'E0801';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0801' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELYTT ENERGY SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0801' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0801', 'CARLOS MITCHELL SANTOS RODRIGUEZ', v_idcliente, '71', 'ELYTT ENERGY SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1909';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1909' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELYTT ENERGY SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1909' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1909', 'CRISTIAN ARIZA MARTINEZ', v_idcliente, '71', 'ELYTT ENERGY SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0615';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0615' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELYTT ENERGY SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0615' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0615', 'EDILSON FIERRO DAGUA', v_idcliente, '71', 'ELYTT ENERGY SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0237';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0237' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELYTT ENERGY SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0237' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0237', 'FREDY JAVIER CCALLA ROJAS', v_idcliente, '71', 'ELYTT ENERGY SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0240';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0240' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELYTT ENERGY SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0240' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0240', 'HECTOR LUIS PARRAGA ZAVALA', v_idcliente, '71', 'ELYTT ENERGY SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico', ''), funcion)
WHERE cod_colab = 'E0552';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0552' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELYTT ENERGY SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0552' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0552', 'JONATHAN ALEJANDRO MARTINEZ CASTIBLANCO', v_idcliente, '71', 'ELYTT ENERGY SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0238';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0238' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELYTT ENERGY SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0238' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0238', 'ISRAEL BENAVIDES PRECIADO', v_idcliente, '71', 'ELYTT ENERGY SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1416';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1416' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELYTT ENERGY SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1416' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1416', 'JHON JAIRO MUÑOZ BARBOSA', v_idcliente, '71', 'ELYTT ENERGY SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico', ''), funcion)
WHERE cod_colab = 'E1081';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1081' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ELYTT ENERGY SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1081' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1081', 'LUIS JAVIER ZAMORA CANACHE', v_idcliente, '71', 'ELYTT ENERGY SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador/Armador/Soldador', ''), funcion)
WHERE cod_colab = 'E0246';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0246' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%EMYPRO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0246' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0246', 'MARTIN CAMILO SUAREZ BARRERA', v_idcliente, '74', 'EMYPRO', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0250';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0250' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ERBIA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0250' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0250', 'BORIS ALI CHUNGA LUJAN', v_idcliente, '76', 'ERBIA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0251';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0251' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ERBIA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0251' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0251', 'HAROLD REFERTIN SERNAQUE CARRASCO', v_idcliente, '76', 'ERBIA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E0272';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0272' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0272' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0272', 'ALBEIRO OBANDO MICOLTA', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E2079';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2079' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2079' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2079', 'ALVARO JAVIER NARVAEZ MUÑOZ', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1888';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1888' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1888' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1888', 'ANDRES FELIPE PULIDO GOMEZ', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1668';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1668' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1668' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1668', 'BRAYAN JOSE SALINAS MARTINEZ', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E2082';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2082' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2082' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2082', 'FERNEY ALEXANDER VARGAS SERRANO', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1699';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1699' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1699' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1699', 'FREDY RICARDO AGUDELO SALAMANCA', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1503';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1503' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1503' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1503', 'HANNER STIVEN GUZMAN PENCUA', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0029';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0029' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0029' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0029', 'JHOBERGS JESUS PARRA DE ARCO', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0268';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0268' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0268' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0268', 'JOHNNY JAVIER BORJA MANGA', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0260';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0260' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0260' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0260', 'JOSE FERNANDO VEGA BUITRAGO', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0263';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0263' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0263' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0263', 'JUAN DANIEL MORA PEÑALOZA', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0344';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0344' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0344' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0344', 'LUIS ALBERTO DIAZ CLAVIJO', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1797';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1797' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1797' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1797', 'MANUEL TCHIMBINJA GOMBACASSI', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E2085';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2085' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2085' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2085', 'MARCO ALEXIS VILLAMIL SUAREZ', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0273';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0273' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0273' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0273', 'NELSON JAVIER ACOSTA SANTISTEBAN', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0264';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0264' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0264' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0264', 'RAMON EDUARDO JIMENEZ PEREZ', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0626';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0626' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0626' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0626', 'ORLANDO RODRIGUEZ MADARIAGA', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1301';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1301' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1301' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1301', 'VICTOR DANIEL ARIAS GONZALEZ', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1711';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1711' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1711' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1711', 'WENDI ALBERTO GARCIA ARRIETA', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1729';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1729' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1729' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1729', 'RAFAEL ELIAS VALDERRAMA VERGARA', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecánico/Montador', ''), funcion)
WHERE cod_colab = 'E1816';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1816' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1816' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1816', 'RAFAEL ALEJANDRO HERRERA URBANO', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Baja',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E0266';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0266' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0266' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0266', 'WILMAR ESTUPIÑAN ANGULO', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E0269';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0269' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0269' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0269', 'YONY ALEXANDER BERNAL ARCINIEGAS', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1663';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1663' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1663' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1663', 'DARIO CARLOS MANUEL PEREIRA', v_idcliente, '83', 'VALLISOLETANA DE ELEMENTOS METÁLICOS, S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1402';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1402' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1402' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1402', 'ALBEIRO CARDOZO HEREDIA', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0362';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0362' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0362' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0362', 'ALEXANDER ANTHONY ZAMORA ALMENDARIZ', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Pendiente Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1723';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1723' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1723' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1723', 'ARLEY GUTIERREZ CORREDOR', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;
COMMIT;\n\nBEGIN;\n
UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0402';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0402' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0402' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0402', 'CARLOS AUGUSTO SALDARRIAGA MONTEALBAN', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1854';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1854' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1854' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1854', 'CARLOS JULIO LOZANO SIERRA', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0507';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0507' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0507' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0507', 'EDWARD IGNACIO DIAZ AVILA', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1856';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1856' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1856' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1856', 'FREDDY ANDRES BAYONA CASTRO', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E2076';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2076' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2076' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2076', 'HAYDER RAFAEL DIAZ MANAURE', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0040';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0040' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0040' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0040', 'JHON JAIRO CASTAÑO POSADA', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E2077';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2077' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2077' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2077', 'JULIAN JAVIER PEARSON GUERRERO', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0780';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0780' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0780' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0780', 'MIGUEL ANGEL CHUQUIZAPON VASQUEZ', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E2009';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2009' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2009' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2009', 'NELSON RODRIGO MOSSOS ANDRADE', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0349';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0349' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0349' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0349', 'NICOLAS RAUL MACIAS MEJIA', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0327';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0327' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0327' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0327', 'RAFAEL ARTURO REYES ROMERO', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0620';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0620' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0620' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0620', 'REMY SENNDER FARIAS ACARO', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E2006';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2006' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2006' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2006', 'RICHAR TAYLOR JIMENEZ CORONADO', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1875';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1875' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1875' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1875', 'JOSE ANTONIO RUEDA CAMARGO', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1825';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1825' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1825' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1825', 'JOSE LISARDO LINARES', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0102';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0102' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0102' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0102', 'JUAN SEBASTIAN GARCIA GARCIA', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1814';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1814' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1814' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1814', 'LEISER DONCEL AVILA', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1953';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1953' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1953' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1953', 'LUIS ALFREDO MALAVER CARDENAS', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1705';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1705' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1705' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1705', 'LUIS FERNANDO BENJUMEA ORTIZ', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Pendiente Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1745';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1745' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1745' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1745', 'LUYSMER DAVID PEÑARANDA CABRERA', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1754';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1754' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1754' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1754', 'NORVEY GONZALEZ LOPEZ', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1906';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1906' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1906' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1906', 'RICHARD ANTONIO GUERRA HERRERA', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E2068';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2068' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2068' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2068', 'RUBEN DARIO RINCON CORTES', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0316';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0316' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0316' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0316', 'ULISES HERNAN CORDOVA HERNANDEZ', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2139';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2139' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2139' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2139', 'LUCAS VINICIUS FRANCO NOVAKOWSKI', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0467';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0467' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HGL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0467' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0467', 'MARIO FERNANDO ALBERCA PUICON', v_idcliente, '87', 'HGL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0315';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0315' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INDUSTRIAS BALMES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0315' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0315', 'SERGIO ALONSO ANDRADE CASTRILLON', v_idcliente, '97', 'INDUSTRIAS BALMES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1076';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1076' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INGENIERIA PARA EL DESAROLLO TECNOLOGICO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1076' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1076', 'ODAR JOHN REYES RAMIREZ', v_idcliente, '105', 'INGENIERIA PARA EL DESAROLLO TECNOLOGICO', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0354';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0354' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INGENIERIA PARA EL DESAROLLO TECNOLOGICO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0354' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0354', 'YUBYINER SANTIAGO CELIS', v_idcliente, '105', 'INGENIERIA PARA EL DESAROLLO TECNOLOGICO', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0388';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0388' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0388' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0388', 'ALEX DAVID GOMEZ VILLADA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Ayudante', ''), funcion)
WHERE cod_colab = 'E0386';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0386' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0386' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0386', 'ALEXANDER MANUEL LOPEZ ROJAS', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0359';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0359' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0359' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0359', 'ANDRES FELIPE GOMEZ PUERTA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador/Armador/Soldador', ''), funcion)
WHERE cod_colab = 'E1979';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1979' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1979' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1979', 'BRANDON RAMIREZ ZAPATA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1897';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1897' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1897' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1897', 'BRAYAN JOSE ALARCON MORALES', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2020';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2020' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2020' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2020', 'CARLOS ANDRES ARROYO BERTEL', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2026';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2026' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2026' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2026', 'CARLOS ANDRES SILVA CORREA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador/Armador/Soldador', ''), funcion)
WHERE cod_colab = 'E2021';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2021' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2021' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2021', 'DEWIN DE JESUS DE LEON BARRERA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1826';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1826' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1826' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1826', 'DOMINGO RAMON VEGA HUMANEZ', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0356';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0356' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0356' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0356', 'DUAN ANTONIO AVILA NORIEGA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1806';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1806' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1806' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1806', 'EDILSON TORRES SALCEDO', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0363';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0363' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0363' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0363', 'EDUARD YOVANNY LOZANO OSORIO', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1412';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1412' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1412' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1412', 'EDWAR ARIEL VELEZ POSADA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0364';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0364' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0364' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0364', 'EDWIN DIAZ MARULANDA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0389';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0389' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0389' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0389', 'FABIAN ARTURO RUIZ GARCIA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0387';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0387' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0387' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0387', 'GUILLERMO ARCINIEGAS MURILLO', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1829';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1829' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1829' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1829', 'GUSTAVO ANDRES PORRAS MORALES', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0365';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0365' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0365' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0365', 'ISAIAS MUNOZ MACHADO', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0384';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0384' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0384' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0384', 'JAIVER JOSE POLANCO PEREZ', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E2037';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2037' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2037' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2037', 'JEAN CARLO SUAREZ VALENCIA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1518';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1518' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1518' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1518', 'JEENVINSON ADALBERTO IGUARAN GRANADILLO', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0381';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0381' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0381' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0381', 'JHONNY ESTID QUIJANO TREJO', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0377';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0377' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0377' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0377', 'JOSE ANTONIO MORALES HURTADO', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0371';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0371' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0371' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0371', 'OSCAR ASTORGA MUÑOZ', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0539';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0539' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0539' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0539', 'OSCAR EDUARDO ORTEGA LOPEZ', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1827';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1827' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1827' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1827', 'JULIO CESAR VERA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Pintor Industrial', ''), funcion)
WHERE cod_colab = 'E0366';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0366' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0366' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0366', 'MARLON SERNA URBANO', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0367';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0367' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0367' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0367', 'OMAR STEVEEN SANCHEZ ROJAS', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1719';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1719' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1719' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1719', 'OSCAR GIOVANNI DIAZ MARTINEZ', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0368';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0368' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0368' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0368', 'VICTOR AUGUSTO RAMIREZ GRANDA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Solador', ''), funcion)
WHERE cod_colab = 'E0358';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0358' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES Y SISTEMAS HIDRAULICOS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0358' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0358', 'YESID DAVID GOMEZ ARZUAGA', v_idcliente, '108', 'INSTALACIONES Y SISTEMAS HIDRAULICOS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0396';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0396' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%IQUORD%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0396' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0396', 'CARLOS ANDRES JIMENEZ RAMIREZ', v_idcliente, '111', 'IQUORD', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0394';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0394' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%IQUORD%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0394' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0394', 'FREDY MANCERA URIBE', v_idcliente, '111', 'IQUORD', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1435';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1435' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%IQUORD%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1435' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1435', 'JAVIER FRANCISCO BALDOVINO ORTEGA', v_idcliente, '111', 'IQUORD', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0398';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0398' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%IQUORD%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0398' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0398', 'JEFFERSON ANDRES OROZCO RODRIGUEZ', v_idcliente, '111', 'IQUORD', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0395';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0395' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%IQUORD%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0395' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0395', 'JUAN CARLOS BENAVIDES RODRIGUEZ', v_idcliente, '111', 'IQUORD', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0392';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0392' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%IQUORD%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0392' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0392', 'MILTON DAVID SOSA PALLAS', v_idcliente, '111', 'IQUORD', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0400';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0400' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%IQUORD%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0400' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0400', 'NORBEY VARON ESQUIVEL', v_idcliente, '111', 'IQUORD', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0393';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0393' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%IQUORD%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0393' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0393', 'VICTOR BLANCO BRAVO', v_idcliente, '111', 'IQUORD', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0401';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0401' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%JACKSON S.A%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0401' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0401', 'ARMANDO DENIS ENRIQUEZ BLAS', v_idcliente, '113', 'JACKSON S.A', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero/soldador', ''), funcion)
WHERE cod_colab = 'E0406';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0406' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%LASAFE SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0406' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0406', 'ALAN GERSON RAMIREZ ACARO', v_idcliente, '119', 'LASAFE SLU', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1813';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1813' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%LASAFE SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1813' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1813', 'LEONARDO JAVIER RIOS CORREA', v_idcliente, '119', 'LASAFE SLU', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0405';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0405' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%LASAFE SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0405' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0405', 'YULDOR MAURICIO BOLAÑOS', v_idcliente, '119', 'LASAFE SLU', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1799';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1799' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MATEU INOXWELDING SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1799' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1799', 'JOSE LEONARDO CALDERON MANZANO', v_idcliente, '124', 'MATEU INOXWELDING SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1785';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1785' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MATEU INOXWELDING SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1785' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1785', 'LUIS ALFREDO APONTE ANTON', v_idcliente, '124', 'MATEU INOXWELDING SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1926';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1926' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MATEU INOXWELDING SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1926' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1926', 'WILMER ANDRES AREVALO MARIN', v_idcliente, '124', 'MATEU INOXWELDING SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1912';

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tornero', ''), funcion)
WHERE cod_colab = 'E0422';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0422' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MECAONDO SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0422' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0422', 'SERGIO DANIEL GOMEZ ARAMBURO', v_idcliente, '128', 'MECAONDO SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tornero', ''), funcion)
WHERE cod_colab = 'E1787';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1787' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MECAONDO SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1787' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1787', 'EDWIN CASTANEDA HENAO', v_idcliente, '128', 'MECAONDO SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E2131';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2131' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MEN MONTAJES INDUSTRIALES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2131' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2131', 'CLAUDEMIR DO NASCIMENTO FURTADO', v_idcliente, '130', 'MEN MONTAJES INDUSTRIALES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0424';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0424' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MEN MONTAJES INDUSTRIALES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0424' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0424', 'ENRI JAIME CALDAS BERMUDES', v_idcliente, '130', 'MEN MONTAJES INDUSTRIALES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1117';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1117' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MEN MONTAJES INDUSTRIALES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1117' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1117', 'ERIK RUBEN RAMIREZ SIMANCAS', v_idcliente, '130', 'MEN MONTAJES INDUSTRIALES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2056';

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0300';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0300' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MEN MONTAJES INDUSTRIALES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0300' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0300', 'HERNAN GERONIMO ALEJANDRO TARAZONA', v_idcliente, '130', 'MEN MONTAJES INDUSTRIALES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0426';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0426' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MEN MONTAJES INDUSTRIALES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0426' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0426', 'JUAN ALBERTO RODRIGUEZ', v_idcliente, '130', 'MEN MONTAJES INDUSTRIALES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0425';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0425' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MEN MONTAJES INDUSTRIALES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0425' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0425', 'KEVIN FRANKLYN LESCANO REYES', v_idcliente, '130', 'MEN MONTAJES INDUSTRIALES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0147';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0147' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MEN MONTAJES INDUSTRIALES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0147' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0147', 'MAURICIO TORO RAMIREZ', v_idcliente, '130', 'MEN MONTAJES INDUSTRIALES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0423';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0423' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MEN MONTAJES INDUSTRIALES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0423' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0423', 'NASSER MOHAMAD MERES LUNA', v_idcliente, '130', 'MEN MONTAJES INDUSTRIALES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2128';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2128' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MEN MONTAJES INDUSTRIALES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2128' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2128', 'RANDYS MIGUEL NIEBLES HURTADO', v_idcliente, '130', 'MEN MONTAJES INDUSTRIALES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0310';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0310' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MEN MONTAJES INDUSTRIALES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0310' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0310', 'SANTOS PAULO ARCAYA NORIEGA', v_idcliente, '130', 'MEN MONTAJES INDUSTRIALES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1055';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1055' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MEN MONTAJES INDUSTRIALES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1055' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1055', 'YUSSED MURADT CHAVES AMEZQUITA', v_idcliente, '130', 'MEN MONTAJES INDUSTRIALES', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1701';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1701' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%METALLIC SOLUTIONS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1701' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1701', 'JAIRO ALFONSO MUNOZ VALLE', v_idcliente, '136', 'METALLIC SOLUTIONS', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1547';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1547' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%METALLIC SOLUTIONS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1547' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1547', 'JULIO CESAR MANJARRES', v_idcliente, '136', 'METALLIC SOLUTIONS', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0447';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0447' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%METALLIC SOLUTIONS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0447' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0447', 'NORBEY BALLESTEROS CRUZ', v_idcliente, '136', 'METALLIC SOLUTIONS', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0445';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0445' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%METALLIC SOLUTIONS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0445' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0445', 'SERGIO ANDRES LANDINES BARRIOS', v_idcliente, '136', 'METALLIC SOLUTIONS', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0446';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0446' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%METALLIC SOLUTIONS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0446' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0446', 'SERGIO DAVID CORDOBA TUTA', v_idcliente, '136', 'METALLIC SOLUTIONS', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E0452';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0452' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SERRALLERIA MILLAN MARTINEZ S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0452' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0452', 'ADRIAN CARLOSAMA CHAVEZ', v_idcliente, '141', 'SERRALLERIA MILLAN MARTINEZ S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1513';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1513' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SERRALLERIA MILLAN MARTINEZ S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1513' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1513', 'JAPSIN STEVEN RUIZ PARRA', v_idcliente, '141', 'SERRALLERIA MILLAN MARTINEZ S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0239';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0239' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MOINTER S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0239' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0239', 'YODARLI GONZALEZ BRAVO', v_idcliente, '144', 'MOINTER S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0474';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0474' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MONTAJES GOMUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0474' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0474', 'JOSUE ENRIQUE ZEVALLOS BENITES', v_idcliente, '148', 'MONTAJES GOMUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1800';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1800' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MONTAJES GOMUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1800' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1800', 'PABLO MANOLO ROMERO HUERTAS', v_idcliente, '148', 'MONTAJES GOMUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;
COMMIT;\n\nBEGIN;\n
UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0475';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0475' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MONTAJES GOMUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0475' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0475', 'VICTOR ARTURO GALVEZ PALACIOS', v_idcliente, '148', 'MONTAJES GOMUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0449';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0449' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%NORCAL INSTALACIONES INDUSTIRALES S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0449' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0449', 'ALBERTO ISMAEL MENDIETA CACERES', v_idcliente, '154', 'NORCAL INSTALACIONES INDUSTIRALES S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Pendiente Baja',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1776';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1776' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%NORCAL INSTALACIONES INDUSTIRALES S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1776' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1776', 'CRISTIAN ADRIAN QUIROS RAMOS', v_idcliente, '154', 'NORCAL INSTALACIONES INDUSTIRALES S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2115';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2115' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%NORCAL INSTALACIONES INDUSTIRALES S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2115' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2115', 'FRANKLIN JOSE DIAZ LINCE', v_idcliente, '154', 'NORCAL INSTALACIONES INDUSTIRALES S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E2116';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2116' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%NORCAL INSTALACIONES INDUSTIRALES S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2116' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2116', 'LUIS ENRIQUE LOPEZ CRESPO', v_idcliente, '154', 'NORCAL INSTALACIONES INDUSTIRALES S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E2014';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2014' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%NORCAL INSTALACIONES INDUSTIRALES S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2014' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2014', 'LUIS HERNANDO HINESTROZA VALENCIA', v_idcliente, '154', 'NORCAL INSTALACIONES INDUSTIRALES S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Mecánico', ''), funcion)
WHERE cod_colab = 'E0462';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0462' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%NORCAL INSTALACIONES INDUSTIRALES S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0462' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0462', 'RAYMOND JOSE GARRIDO FERRER', v_idcliente, '154', 'NORCAL INSTALACIONES INDUSTIRALES S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0491';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0491' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%PMA ESTRUCTURAS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0491' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0491', 'CARLOS MARIO JARAMILLO LOPEZ', v_idcliente, '158', 'PMA ESTRUCTURAS', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0492';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0492' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%PMA ESTRUCTURAS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0492' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0492', 'JOHN FREDY CASTRO JIMENEZ', v_idcliente, '158', 'PMA ESTRUCTURAS', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0553';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0553' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SISTEMAS DE FILTRADO Y TRATAMIENTO DE FLUIDOS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0553' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0553', 'CARLOS JULIO ACOSTA CAMACHO', v_idcliente, '176', 'SISTEMAS DE FILTRADO Y TRATAMIENTO DE FLUIDOS SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1853';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1853' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SISTEMAS DE FILTRADO Y TRATAMIENTO DE FLUIDOS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1853' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1853', 'DANIER CALDERON SALAS', v_idcliente, '176', 'SISTEMAS DE FILTRADO Y TRATAMIENTO DE FLUIDOS SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Mecanico/Montador', ''), funcion)
WHERE cod_colab = 'E2032';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2032' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TACMAN 2000%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2032' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2032', 'LUIS ANTONIO SOTO VIDAL', v_idcliente, '186', 'TACMAN 2000', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0557';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0557' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TACMAN 2000%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0557' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0557', 'HECTOR FABIO MAHETE CEDEÑO', v_idcliente, '186', 'TACMAN 2000', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E2110';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2110' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TACMAN 2000%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2110' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2110', 'JEISON ALEXANDER GONZALEZ FARFAN', v_idcliente, '186', 'TACMAN 2000', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E2113';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2113' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TACMAN 2000%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2113' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2113', 'JONNY ENRIQUE CURA VARGAS', v_idcliente, '186', 'TACMAN 2000', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0578';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0578' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES QUINTANA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0578' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0578', 'DIEGO ROBERTO SOUZA SCAVACINI', v_idcliente, '197', 'TALLERES QUINTANA S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0576';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0576' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES QUINTANA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0576' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0576', 'TIRZO GONZALEZ BOLIVAR', v_idcliente, '197', 'TALLERES QUINTANA S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0577';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0577' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES QUINTANA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0577' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0577', 'WALLACE DA SILVA GOMES', v_idcliente, '197', 'TALLERES QUINTANA S.L', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Pendiente Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0585';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0585' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TAPIA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0585' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0585', 'JONATHAN FELACIO FISGATIVA', v_idcliente, '198', 'TAPIA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E2061';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2061' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TAPIA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2061' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2061', 'JOSE ANTONIO GUIZAO SANDOVAL', v_idcliente, '198', 'TAPIA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Pendiente Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0584';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0584' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TAPIA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0584' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0584', 'KEVIN STEVEN RAMIREZ CARDONA', v_idcliente, '198', 'TAPIA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Pendiente Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0583';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0583' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TAPIA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0583' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0583', 'STEVEN SUAREZ BETANCOURT', v_idcliente, '198', 'TAPIA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Pendiente Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0582';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0582' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TAPIA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0582' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0582', 'WALTER GOMEZ ROJAS', v_idcliente, '198', 'TAPIA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('', ''), funcion)
WHERE cod_colab = 'E0592';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0592' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TECNOLOGIA MECANICA I ELECTRA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0592' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0592', 'DARWIN JOSE VASQUEZ ORTEGA', v_idcliente, '203', 'TECNOLOGIA MECANICA I ELECTRA SLU', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0591';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0591' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TECNOLOGIA MECANICA I ELECTRA SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0591' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0591', 'JONATHAN BLANDON HINCAPIE', v_idcliente, '203', 'TECNOLOGIA MECANICA I ELECTRA SLU', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Cerrajero', ''), funcion)
WHERE cod_colab = 'E0593';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0593' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TOKIO METAL SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0593' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0593', 'ALEX MAURICIO CARDONA RAMIREZ', v_idcliente, '205', 'TOKIO METAL SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0257';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0257' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%AUTOMATISMES ELECTRICS GRANOLLERS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0257' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0257', 'EDWAR ANDRES BENACHI ARCE', v_idcliente, '214', 'AUTOMATISMES ELECTRICS GRANOLLERS, S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0258';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0258' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%AUTOMATISMES ELECTRICS GRANOLLERS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0258' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0258', 'LUIS MIGUEL VEGA FUENTES', v_idcliente, '214', 'AUTOMATISMES ELECTRICS GRANOLLERS, S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0403';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0403' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%AUTOMATISMES ELECTRICS GRANOLLERS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0403' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0403', 'DAVID GUSTAVO DE LOS ANGELES PATIÑO RAMOS', v_idcliente, '214', 'AUTOMATISMES ELECTRICS GRANOLLERS, S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1556';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1556' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%AUTOMATISMES ELECTRICS GRANOLLERS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1556' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1556', 'MARCOS RAFAEL CASANI VALDEZ', v_idcliente, '214', 'AUTOMATISMES ELECTRICS GRANOLLERS, S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1579';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1579' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%AUTOMATISMES ELECTRICS GRANOLLERS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1579' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1579', 'RUBEN DARIO HURTADO MURCIA', v_idcliente, '214', 'AUTOMATISMES ELECTRICS GRANOLLERS, S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1076';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1076' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO VENTO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1076' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1076', 'ODAR JOHN REYES RAMIREZ', v_idcliente, '216', 'GRUPO VENTO', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1407';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1407' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INAGAL SOLDADURA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1407' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1407', 'CARLOS ANDRES MANTILLA URREGO', v_idcliente, '218', 'INAGAL SOLDADURA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1820';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1820' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INAGAL SOLDADURA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1820' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1820', 'JOSE YOVANNY LOZANO GOMEZ', v_idcliente, '218', 'INAGAL SOLDADURA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1423';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1423' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INAGAL SOLDADURA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1423' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1423', 'LENNIN JESUS CANON CARDENAS', v_idcliente, '218', 'INAGAL SOLDADURA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E2109';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2109' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INAGAL SOLDADURA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2109' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2109', 'OLMEDO ARIEL HERNANDEZ GONZALEZ', v_idcliente, '218', 'INAGAL SOLDADURA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1424';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1424' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INAGAL SOLDADURA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1424' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1424', 'PEDRO DE JESUS DE LA HOZ SALCEDO', v_idcliente, '218', 'INAGAL SOLDADURA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1436';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1436' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INAGAL SOLDADURA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1436' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1436', 'RIGOBERTO ROMERO REINA', v_idcliente, '218', 'INAGAL SOLDADURA SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Pendiente Baja',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1776';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1776' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BEKOTER INSTALACIONES INDUSTRIALES SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1776' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1776', 'CRISTIAN ADRIAN QUIROS RAMOS', v_idcliente, '224', 'BEKOTER INSTALACIONES INDUSTRIALES SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1287';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1287' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BEKOTER INSTALACIONES INDUSTRIALES SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1287' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1287', 'ORLANDO JANNCARLO ACEVEDO GUZMAN', v_idcliente, '224', 'BEKOTER INSTALACIONES INDUSTRIALES SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0045';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0045' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%BEKOTER INSTALACIONES INDUSTRIALES SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0045' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0045', 'VICTOR RAMON TUANAMA GARCIA', v_idcliente, '224', 'BEKOTER INSTALACIONES INDUSTRIALES SL', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1590';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1590' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CARVISA CONTAINER S.L.U%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1590' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1590', 'BAIRON RENE BURBANO MORALES', v_idcliente, '225', 'CARVISA CONTAINER S.L.U', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0873';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0873' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CARVISA CONTAINER S.L.U%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0873' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0873', 'ELKIN ARMANDO GARZON LOPEZ', v_idcliente, '225', 'CARVISA CONTAINER S.L.U', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0890';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0890' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CARVISA CONTAINER S.L.U%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0890' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0890', 'FABIAN LEONARDO CERON VALENCIA', v_idcliente, '225', 'CARVISA CONTAINER S.L.U', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1289';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1289' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INOXIDABLES DE MEDINA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1289' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1289', 'OSCAR BALTAZAR GUTIERREZ PACHECO', v_idcliente, '230', 'INOXIDABLES DE MEDINA S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0128';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0128' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INOXIDABLES DE MEDINA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0128' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0128', 'ALEJANDRO JOSE BORJA MANGA', v_idcliente, '230', 'INOXIDABLES DE MEDINA S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1268';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1268' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INOXIDABLES DE MEDINA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1268' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1268', 'ERIK CHARLY GOMEZ RIOS', v_idcliente, '230', 'INOXIDABLES DE MEDINA S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1502';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1502' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INOXIDABLES DE MEDINA S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1502' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1502', 'GRAVIEL ISIDRO DIAZ OROPEZA', v_idcliente, '230', 'INOXIDABLES DE MEDINA S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1485';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1485' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MANUFACTURES DFERRO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1485' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1485', 'EDWIN BERNAL ARCINIEGAS', v_idcliente, '233', 'MANUFACTURES DFERRO', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1497';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1497' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MANUFACTURES DFERRO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1497' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1497', 'FREDY ALEXANDER GOMEZ CORTES', v_idcliente, '233', 'MANUFACTURES DFERRO', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador (3P)', ''), funcion)
WHERE cod_colab = 'E0818';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0818' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MANUFACTURES DFERRO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0818' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0818', 'JORGE IVAN SARRIA ORTIZ', v_idcliente, '233', 'MANUFACTURES DFERRO', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0465';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0465' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MANUFACTURES DFERRO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0465' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0465', 'OSCAR JESUS MENDEZ BELLO', v_idcliente, '233', 'MANUFACTURES DFERRO', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('CaLderero', ''), funcion)
WHERE cod_colab = 'E1996';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1996' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MANUFACTURES DFERRO SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1996' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1996', 'PEDRO LUIS PADILLA VALDEZ', v_idcliente, '233', 'MANUFACTURES DFERRO SLU', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1707';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1707' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TINCASUR SUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1707' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1707', 'ALVARO ARIZA CONTRERAS', v_idcliente, '234', 'TINCASUR SUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1995';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1995' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TINCASUR SUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1995' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1995', 'CAMILO ANDRES RUBIO LEON', v_idcliente, '234', 'TINCASUR SUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1496';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1496' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TINCASUR SUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1496' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1496', 'FREDIS BOLAÑOS GARCIA', v_idcliente, '234', 'TINCASUR SUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2049';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2049' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TINCASUR SUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2049' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2049', 'JHON ALEXANDER ARENAS CASTRILLON', v_idcliente, '234', 'TINCASUR SUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1994';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1994' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TINCASUR SUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1994' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1994', 'MICHAEL ANDRES AHUMADA RUBIO', v_idcliente, '234', 'TINCASUR SUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2143';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2143' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TINCASUR SUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2143' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2143', 'NESTOR JAVIER BARRIOS PENA', v_idcliente, '234', 'TINCASUR SUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1753';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1753' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TINCASUR SUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1753' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1753', 'OMAR DAVID DIAZ MORALES', v_idcliente, '234', 'TINCASUR SUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0082';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0082' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TINCASUR SUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0082' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0082', 'ROBER HENRRY CHUMBES ROJAS', v_idcliente, '234', 'TINCASUR SUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E2063';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2063' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TINCASUR SUR S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2063' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2063', 'YIMIS ALFREDO FERNANDEZ PENA', v_idcliente, '234', 'TINCASUR SUR S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2144';

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0279';

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1764';

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Plegador CNC', ''), funcion)
WHERE cod_colab = 'E1448';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1448' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDERERIA URRETXU, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1448' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1448', 'ALBERTO LUIS MALDONADO BARRERA', v_idcliente, '241', 'CALDERERIA URRETXU, S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0407';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0407' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%LANDETA BURDIN LANAK BERRIA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0407' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0407', 'EMILIANO CUADROS LAGUADO', v_idcliente, '243', 'LANDETA BURDIN LANAK BERRIA SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0770';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0770' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%LANDETA BURDIN LANAK BERRIA SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0770' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0770', 'JUAN PABLO PORTILLA ZAMBRANO', v_idcliente, '243', 'LANDETA BURDIN LANAK BERRIA SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Mecanico', ''), funcion)
WHERE cod_colab = 'E0625';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0625' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%REMOMEC%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0625' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0625', 'ANSONY RODRIGUEZ PORRAS', v_idcliente, '244', 'REMOMEC', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1465';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1465' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%REMOMEC%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1465' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1465', 'CARLOS JESUS MENDIGUETE VILLA', v_idcliente, '244', 'REMOMEC', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1486';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1486' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%REMOMEC%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1486' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1486', 'EDWIN RAUL LIMA NARCISO', v_idcliente, '244', 'REMOMEC', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1509';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1509' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%REMOMEC%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1509' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1509', 'HUERLIN MANGLIO ALVARADO GUZMÁN', v_idcliente, '244', 'REMOMEC', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1557';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1557' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%REMOMEC%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1557' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1557', 'MARLO CESAR CASTILLO SILUPU', v_idcliente, '244', 'REMOMEC', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0779';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0779' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GOITEK LANON SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0779' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0779', 'SANTIAGO AGUILAR HURTADO', v_idcliente, '246', 'GOITEK LANON SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1453';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1453' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VICME SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1453' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1453', 'ANGEL ANDRES BARDALES RAMIREZ', v_idcliente, '247', 'VICME SA', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1515';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1515' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%VICME SA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1515' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1515', 'JASIR ENRIQUE DIAZ MANJARREZ', v_idcliente, '247', 'VICME SA', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0006';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0006' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INMETOL S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0006' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0006', 'ESTEBAN DARIO ACOSTA MARTINEZ', v_idcliente, '249', 'INMETOL S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1546';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1546' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INMETOL S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1546' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1546', 'JULIO CESAR ELJACH BERROCAL', v_idcliente, '249', 'INMETOL S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0792';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0792' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INMETOL S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0792' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0792', 'MILTHON WALTER PORRAS JIMENEZ', v_idcliente, '249', 'INMETOL S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1560';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1560' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TECNICAS DE VENTILACIÓN CALGE%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1560' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1560', 'MIGUEL ANGEL MARTINEZ ISAZA', v_idcliente, '251', 'TECNICAS DE VENTILACIÓN CALGE', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0797';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0797' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HIERROS Y ESTRUCTURAS SEGORBE SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0797' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0797', 'CARLOS URIEL CASTRO NIEVA', v_idcliente, '254', 'HIERROS Y ESTRUCTURAS SEGORBE SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0984';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0984' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HIERROS Y ESTRUCTURAS SEGORBE SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0984' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0984', 'EDINSON LOZANO TELLEZ', v_idcliente, '254', 'HIERROS Y ESTRUCTURAS SEGORBE SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1204';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1204' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HIERROS Y ESTRUCTURAS SEGORBE SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1204' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1204', 'JESUS HEYBER YELA MELO', v_idcliente, '254', 'HIERROS Y ESTRUCTURAS SEGORBE SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0204';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0204' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HIERROS Y ESTRUCTURAS SEGORBE SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0204' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0204', 'MILTON OMAR MEDINA PANTA', v_idcliente, '254', 'HIERROS Y ESTRUCTURAS SEGORBE SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0001';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0001' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HIERROS Y ESTRUCTURAS SEGORBE SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0001' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0001', 'SERGIO ANDRES FLOREZ MARIN', v_idcliente, '254', 'HIERROS Y ESTRUCTURAS SEGORBE SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0178';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0178' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HIERROS Y ESTRUCTURAS SEGORBE SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0178' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0178', 'SEVERO PABON CASTRO', v_idcliente, '254', 'HIERROS Y ESTRUCTURAS SEGORBE SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Mecanico', ''), funcion)
WHERE cod_colab = 'E1684';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1684' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES RO DA JE%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1684' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1684', 'ALEXANDER PEREIRA HERNANDEZ', v_idcliente, '257', 'TALLERES RO DA JE', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Mecanico', ''), funcion)
WHERE cod_colab = 'E1459';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1459' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES RO DA JE%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1459' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1459', 'CAMILO ANDRES DUEÑAS NIÑO', v_idcliente, '257', 'TALLERES RO DA JE', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Mecanico', ''), funcion)
WHERE cod_colab = 'E0466';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0466' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES RO DA JE%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0466' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0466', 'HUMBERTO ENRIQUE MARTINEZ', v_idcliente, '257', 'TALLERES RO DA JE', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador TIG', ''), funcion)
WHERE cod_colab = 'E1783';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1783' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES RO DA JE%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1783' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1783', 'RIGOBERTO RIOS PACHECO', v_idcliente, '257', 'TALLERES RO DA JE', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Baja',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1151';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1151' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%REVERTER INDUSTRIES SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1151' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1151', 'GUBERNEY HURTADO SAUCEDO', v_idcliente, '258', 'REVERTER INDUSTRIES SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador/Montador', ''), funcion)
WHERE cod_colab = 'E1992';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1992' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%REVERTER INDUSTRIES SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1992' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1992', 'ISMAEL MENDEZ GAITAN', v_idcliente, '258', 'REVERTER INDUSTRIES SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1525';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1525' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%REVERTER INDUSTRIES SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1525' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1525', 'JHON JAIRO PAREJA JARAMILLO', v_idcliente, '258', 'REVERTER INDUSTRIES SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador/Montador', ''), funcion)
WHERE cod_colab = 'E2065';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2065' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%REVERTER INDUSTRIES SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2065' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2065', 'JUAN DANIEL ROA ROSAS', v_idcliente, '258', 'REVERTER INDUSTRIES SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1649';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1649' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%REVERTER INDUSTRIES SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1649' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1649', 'SAIR PERALTA GARCIA', v_idcliente, '258', 'REVERTER INDUSTRIES SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador/Montador', ''), funcion)
WHERE cod_colab = 'E2058';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2058' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%REVERTER INDUSTRIES SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2058' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2058', 'WILMER SEGOVIA GARCIA', v_idcliente, '258', 'REVERTER INDUSTRIES SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1492';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1492' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDERERIA LA NOGUERA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1492' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1492', 'FELIPE OQUENDO CALLEJAS', v_idcliente, '260', 'CALDERERIA LA NOGUERA', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0002';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0002' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ENTRERRIOS AUTOMATIZACION S.A%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0002' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0002', 'JORGE LUIS HUERTA OBREGON', v_idcliente, '263', 'ENTRERRIOS AUTOMATIZACION S.A', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E0299';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0299' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ENTRERRIOS AUTOMATIZACION S.A%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0299' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0299', 'ROBINSON DE FEX DIAZ', v_idcliente, '263', 'ENTRERRIOS AUTOMATIZACION S.A', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1558';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1558' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ENTRERRIOS AUTOMATIZACION S.A%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1558' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1558', 'MARLON BUJATO SILVERA', v_idcliente, '263', 'ENTRERRIOS AUTOMATIZACION S.A', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;
COMMIT;\n\nBEGIN;\n
UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0003';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0003' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%ENTRERRIOS AUTOMATIZACION S.A%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0003' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0003', 'MELBIN JULIO ALBOR SUAREZ', v_idcliente, '263', 'ENTRERRIOS AUTOMATIZACION S.A', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1811';

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0262';

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1810';

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1769';

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1615';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1615' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SINFINES FACTORY S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1615' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1615', 'HECTOR FABIO GUZMAN CAICEDO', v_idcliente, '265', 'SINFINES FACTORY S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1306';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1306' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SINFINES FACTORY S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1306' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1306', 'HENRY ALEXANDER RAMIREZ', v_idcliente, '265', 'SINFINES FACTORY S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1698';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1698' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SINFINES FACTORY S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1698' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1698', 'JORGE ANDRES VEGA DELGADO', v_idcliente, '265', 'SINFINES FACTORY S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1687';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1687' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SINFINES FACTORY S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1687' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1687', 'JOSE JULIAN LEMOS ZUNIGA', v_idcliente, '265', 'SINFINES FACTORY S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0324';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0324' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SINFINES FACTORY S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0324' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0324', 'JOSE STEVAN MURILLO MARTINEZ', v_idcliente, '265', 'SINFINES FACTORY S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0190';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0190' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SINFINES FACTORY S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0190' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0190', 'JUAN BERNARDO PALACIOS RUIZ', v_idcliente, '265', 'SINFINES FACTORY S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0027';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0027' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SINFINES FACTORY S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0027' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0027', 'LUIGUI ARMANDO QUINES GRANADOS', v_idcliente, '265', 'SINFINES FACTORY S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0200';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0200' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%SINFINES FACTORY S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0200' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0200', 'PERCY ROMEO SAAVEDRA VELASQUEZ', v_idcliente, '265', 'SINFINES FACTORY S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1454';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1454' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALVO CONTRUCCIONES Y MONTAJES S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1454' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1454', 'ANGEL TEHERAN CARABALLO', v_idcliente, '266', 'CALVO CONTRUCCIONES Y MONTAJES S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1504';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1504' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALVO CONTRUCCIONES Y MONTAJES S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1504' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1504', 'HARRIS HUMBERTO MENDOZA ANGULO', v_idcliente, '266', 'CALVO CONTRUCCIONES Y MONTAJES S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1709';

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0303';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0303' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERS VIDAL AMILL, SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0303' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0303', 'DANIEL DOMINGO MARCHENA AGURTO', v_idcliente, '267', 'TALLERS VIDAL AMILL, SLU', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E2033';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2033' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERS VIDAL AMILL, SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2033' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2033', 'FERNANDO ANTONIO CARDENAS CARDENAS', v_idcliente, '267', 'TALLERS VIDAL AMILL, SLU', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1506';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1506' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERS VIDAL AMILL, SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1506' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1506', 'HELMER STIWAR MONTAÑA', v_idcliente, '267', 'TALLERS VIDAL AMILL, SLU', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E1080';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1080' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERS VIDAL AMILL, SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1080' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1080', 'JOSE EDUARDO NUÑEZ ESCARATE', v_idcliente, '267', 'TALLERS VIDAL AMILL, SLU', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2036';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2036' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERS VIDAL AMILL, SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2036' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2036', 'JOSE LUIS ARENAS DIAZ', v_idcliente, '267', 'TALLERS VIDAL AMILL, SLU', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1702';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1702' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERS VIDAL AMILL, SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1702' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1702', 'RUBEN DARIO GUAPACHA GUARIN', v_idcliente, '267', 'TALLERS VIDAL AMILL, SLU', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Delineante', ''), funcion)
WHERE cod_colab = 'E0126';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0126' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%PROYECTOS DPTA PIPING S.L.U%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0126' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0126', 'MILTON JONATHAN OSORIO MARTINEZ', v_idcliente, '269', 'PROYECTOS DPTA PIPING S.L.U', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1500';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1500' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HERRERIA MITXEL S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1500' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1500', 'GERSON STEVENS BELTRAN CASTELLANOS', v_idcliente, '273', 'HERRERIA MITXEL S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E2091';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2091' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HERRERIA MITXEL S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2091' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2091', 'RICARDO RAFAEL BONILLA BLANCO', v_idcliente, '273', 'HERRERIA MITXEL S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1540';

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2054';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2054' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GAMOHER CONSTRUCCIONES METÁLICAS S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2054' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2054', 'CARLOS MARIO ROCHA ARIZ', v_idcliente, '279', 'GAMOHER CONSTRUCCIONES METÁLICAS S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2052';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2052' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GAMOHER CONSTRUCCIONES METÁLICAS S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2052' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2052', 'FARID JOSE ROJAS GUERRA', v_idcliente, '279', 'GAMOHER CONSTRUCCIONES METÁLICAS S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E1574';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1574' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GAMOHER CONSTRUCCIONES METÁLICAS S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1574' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1574', 'PEDRO PABLO ZAVALA GALLARDO', v_idcliente, '279', 'GAMOHER CONSTRUCCIONES METÁLICAS S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2053';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2053' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GAMOHER CONSTRUCCIONES METÁLICAS S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2053' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2053', 'MISAEL SUAREZ SIJONA', v_idcliente, '279', 'GAMOHER CONSTRUCCIONES METÁLICAS S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1681';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1681' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES METACA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1681' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1681', 'LUIS ALBERTO BUSTOS CALDERON', v_idcliente, '285', 'TALLERES METACA', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E1940';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1940' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%COMMSAL ESTRUCTURAS METÁLICAS S.L.U%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1940' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1940', 'NICXON GARCIA FIERRO', v_idcliente, '580', 'COMMSAL ESTRUCTURAS METÁLICAS S.L.U', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0500';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0500' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%OBRESIEDIFICACIONS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0500' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0500', 'ANDRES CAMILO ALVAREZ CUERVO', v_idcliente, '581', 'OBRESIEDIFICACIONS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0587';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0587' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%OBRESIEDIFICACIONS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0587' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0587', 'JAIME ALEJANDRO RETIS TOLENTINO', v_idcliente, '581', 'OBRESIEDIFICACIONS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1786';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1786' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%OBRESIEDIFICACIONS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1786' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1786', 'JAVIER RODRIGUEZ CONTRERAS', v_idcliente, '581', 'OBRESIEDIFICACIONS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1670';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1670' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%OBRESIEDIFICACIONS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1670' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1670', 'JOHAN ANDRES HERRERA RUGE', v_idcliente, '581', 'OBRESIEDIFICACIONS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Cerrajero', ''), funcion)
WHERE cod_colab = 'E0464';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0464' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%OBRESIEDIFICACIONS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0464' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0464', 'MIGUEL ANGEL ARCAYA NORIEGA', v_idcliente, '581', 'OBRESIEDIFICACIONS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0501';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0501' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%OBRESIEDIFICACIONS%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0501' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0501', 'HERNAN RODRIGUEZ CUY', v_idcliente, '581', 'OBRESIEDIFICACIONS', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador smaw', ''), funcion)
WHERE cod_colab = 'E1801';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1801' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO ANRO%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1801' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1801', 'ANUAR JIMENEZ DELGADO', v_idcliente, '582', 'GRUPO ANRO', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1961';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1961' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%JUNSASTEEL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1961' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1961', 'JHON FREDY VELEIZANO PULIDO', v_idcliente, '583', 'JUNSASTEEL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1534';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1534' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%JUNSASTEEL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1534' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1534', 'JORGE LUIS JIMENEZ BISCUMICHE', v_idcliente, '583', 'JUNSASTEEL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E2107';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2107' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%JUNSASTEEL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2107' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2107', 'JOSE ALEXANDER CALDERON AGUDELO', v_idcliente, '583', 'JUNSASTEEL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1790';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1790' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INTUYMA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1790' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1790', 'ARMANDO QUIROGA JOVEN', v_idcliente, '587', 'INTUYMA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1948';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1948' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INTUYMA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1948' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1948', 'FRANKLYN OMAR DE LA CRUZ SERNAQUE', v_idcliente, '587', 'INTUYMA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E0571';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0571' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INTUYMA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0571' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0571', 'GERMAN GASPAR GODOY', v_idcliente, '587', 'INTUYMA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0408';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0408' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INTUYMA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0408' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0408', 'HERNANDO AUGUSTO GALINDO GOMEZ', v_idcliente, '587', 'INTUYMA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1791';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1791' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INTUYMA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1791' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1791', 'RAUL AUGUSTO MIRANDA', v_idcliente, '587', 'INTUYMA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1789';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1789' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INTUYMA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1789' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1789', 'RAUL ERNESTO MORA MARTINEZ', v_idcliente, '587', 'INTUYMA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1792';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1792' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INTUYMA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1792' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1792', 'VICENCIO VILLAMIZAR LEON', v_idcliente, '587', 'INTUYMA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1949';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1949' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INTUYMA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1949' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1949', 'WILLIAN VARGAS CACERES', v_idcliente, '587', 'INTUYMA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E0802';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0802' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CALDERERIA CAVESA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0802' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0802', 'JAIME NICOLAS GOYES', v_idcliente, '592', 'CALDERERIA CAVESA', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E0272';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0272' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO FERRERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0272' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0272', 'ALBEIRO OBANDO MICOLTA', v_idcliente, '593', 'GRUPO FERRERAS SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1668';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1668' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO FERRERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1668' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1668', 'BRAYAN JOSE SALINAS MARTINEZ', v_idcliente, '593', 'GRUPO FERRERAS SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1503';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1503' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO FERRERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1503' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1503', 'HANNER STIVEN GUZMAN PENCUA', v_idcliente, '593', 'GRUPO FERRERAS SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0029';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0029' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO FERRERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0029' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0029', 'JHOBERGS JESUS PARRA DE ARCO', v_idcliente, '593', 'GRUPO FERRERAS SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0344';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0344' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO FERRERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0344' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0344', 'LUIS ALBERTO DIAZ CLAVIJO', v_idcliente, '593', 'GRUPO FERRERAS SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1797';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1797' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO FERRERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1797' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1797', 'MANUEL TCHIMBINJA GOMBACASSI', v_idcliente, '593', 'GRUPO FERRERAS SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0626';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0626' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO FERRERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0626' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0626', 'ORLANDO RODRIGUEZ MADARIAGA', v_idcliente, '593', 'GRUPO FERRERAS SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Armador', ''), funcion)
WHERE cod_colab = 'E0269';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0269' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO FERRERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0269' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0269', 'YONY ALEXANDER BERNAL ARCINIEGAS', v_idcliente, '593', 'GRUPO FERRERAS SL', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Pintor Industrial', ''), funcion)
WHERE cod_colab = 'E1129';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1129' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%JOUSSEAU MECANO SOUDURE%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1129' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1129', 'CICERO LIMA BATISTA', v_idcliente, '596', 'JOUSSEAU MECANO SOUDURE', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('montador/soldador', ''), funcion)
WHERE cod_colab = 'E1744';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1744' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HERMANOS DJ 2000%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1744' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1744', 'JHOJAN ESNEIDER NIÑO PARRA', v_idcliente, '597', 'HERMANOS DJ 2000', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1795';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1795' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HIDROSISTEMAS Y MONTAJES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1795' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1795', 'JOSE MIGUEL ZACARIAS CHIRINOS', v_idcliente, '599', 'HIDROSISTEMAS Y MONTAJES', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Tubero', ''), funcion)
WHERE cod_colab = 'E1045';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1045' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%HIDROSISTEMAS Y MONTAJES%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1045' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1045', 'VICTOR ALFONSO LUQUE CONDORI', v_idcliente, '599', 'HIDROSISTEMAS Y MONTAJES', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Ayudante', ''), funcion)
WHERE cod_colab = 'E2050';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2050' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DINAT 2006 SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2050' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2050', 'CESAR EDUARDO RAMIREZ TOVAR', v_idcliente, '600', 'DINAT 2006 SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1832';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1832' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DINAT 2006 SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1832' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1832', 'FRANK ESNEIDER PEREZ TABARES', v_idcliente, '600', 'DINAT 2006 SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico', ''), funcion)
WHERE cod_colab = 'E0291';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0291' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DINAT 2006 SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0291' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0291', 'JOSE DAYNER ACOSTA LENIS', v_idcliente, '600', 'DINAT 2006 SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Mecanico', ''), funcion)
WHERE cod_colab = 'E0101';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0101' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DINAT 2006 SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0101' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0101', 'JESUS ANTONIO PAJARO ARCIRIA', v_idcliente, '600', 'DINAT 2006 SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Electricista', ''), funcion)
WHERE cod_colab = 'E1841';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1841' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DINAT 2006 SLU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1841' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1841', 'SANTIAGO HIGUITA ARBOLEDA', v_idcliente, '600', 'DINAT 2006 SLU', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1857';

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0490';

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1678';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1678' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%STOKES FLUID SYSTEMS S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1678' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1678', 'RODNEY NEFTALI RODRIGUEZ HERRERA', v_idcliente, '602', 'STOKES FLUID SYSTEMS S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Tornero cnc', ''), funcion)
WHERE cod_colab = 'E1911';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1911' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MECANIZADOS LLANOS, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1911' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1911', 'FREDERICK AU BLANQUICETT', v_idcliente, '605', 'MECANIZADOS LLANOS, S.L', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1523';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1523' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%CAYMO CRUCES SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1523' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1523', 'JHON EDER CASTRO MONTAÑO', v_idcliente, '608', 'CAYMO CRUCES SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1216';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1216' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO LECRU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1216' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1216', 'GONZALO QUINTANA PIMIENTO', v_idcliente, '610', 'GRUPO LECRU', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0892';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0892' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO LECRU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0892' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0892', 'LEANDRO VARGAS BETANCOURTH', v_idcliente, '610', 'GRUPO LECRU', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1548';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1548' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO LECRU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1548' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1548', 'JUSED CHAMORRO MENDEZ', v_idcliente, '610', 'GRUPO LECRU', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0635';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0635' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO LECRU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0635' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0635', 'NELSON ENRIQUE MARTINEZ VEGA', v_idcliente, '610', 'GRUPO LECRU', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1729';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1729' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO LECRU%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1729' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1729', 'RAFAEL ELIAS VALDERRAMA VERGARA', v_idcliente, '610', 'GRUPO LECRU', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1982';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1982' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DUROFELGUERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1982' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1982', 'CESAR AUGUSTO ANGARITA RIVERA', v_idcliente, '611', 'DUROFELGUERAS SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1484';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1484' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DUROFELGUERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1484' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1484', 'EDWIN ALBERTO CABRERA AGUILAR', v_idcliente, '611', 'DUROFELGUERAS SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E0634';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0634' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DUROFELGUERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0634' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0634', 'RAFAEL CALDERON CAVIEDES', v_idcliente, '611', 'DUROFELGUERAS SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1669';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1669' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DUROFELGUERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1669' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1669', 'JORGE HERNANDO AGUIRRE VELANDIA', v_idcliente, '611', 'DUROFELGUERAS SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1873';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1873' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DUROFELGUERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1873' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1873', 'LUIS CARLOS CASTELLAR VILLARREAL', v_idcliente, '611', 'DUROFELGUERAS SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('STOCCO', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1072';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1072' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%STOCCO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%DUROFELGUERAS SL%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1072' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1072', 'RONAL TAYPE HUAMAN', v_idcliente, '611', 'DUROFELGUERAS SL', v_idempresa, 'STOCCO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1891';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1891' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO MICESA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1891' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1891', 'ANDRES ALEXANDER BEJARANO PEREZ', v_idcliente, '615', 'GRUPO MICESA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1990';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1990' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO MICESA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1990' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1990', 'HECTOR JAUMEN GUEVARA FORERO', v_idcliente, '615', 'GRUPO MICESA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0510';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0510' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO MICESA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0510' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0510', 'ROBERTO CARLOS MARQUINA CABRERA', v_idcliente, '615', 'GRUPO MICESA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E0066';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0066' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO MICESA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0066' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0066', 'LUIS ALBERTO RAMIREZ PINEDO', v_idcliente, '615', 'GRUPO MICESA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('WISEOWE', ''),
    funcion = COALESCE(NULLIF('Montador', ''), funcion)
WHERE cod_colab = 'E1779';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1779' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%WISEOWE%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%GRUPO MICESA%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1779' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1779', 'PABLO ALBERTO RIANO BONILLA', v_idcliente, '615', 'GRUPO MICESA', v_idempresa, 'WISEOWE', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E2095';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2095' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%INSTALACIONES MDV%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2095' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2095', 'CARLOS JULIO CANON', v_idcliente, '616', 'INSTALACIONES MDV', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1074';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1074' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%METALFLEXJAM%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1074' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1074', 'HECTOR FABIO VASQUEZ MAYORGA', v_idcliente, '617', 'METALFLEXJAM', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1975';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1975' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%METALFLEXJAM%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1975' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1975', 'JAIME HERNAN ARANGO MONSALVE', v_idcliente, '617', 'METALFLEXJAM', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E2098';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2098' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES CRANTE S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2098' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2098', 'ALEXANDER GUZMAN', v_idcliente, '620', 'TALLERES CRANTE S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1240';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1240' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES CRANTE S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1240' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1240', 'JUAN CARLOS NUÑEZ MORALES', v_idcliente, '620', 'TALLERES CRANTE S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E1881';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1881' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES CRANTE S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1881' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1881', 'LUIS GUILLERMO ARTEAGA AGUDELO', v_idcliente, '620', 'TALLERES CRANTE S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1999';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1999' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES CRANTE S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1999' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1999', 'HENRY MARTINEZ CABEZAS', v_idcliente, '620', 'TALLERES CRANTE S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Soldador', ''), funcion)
WHERE cod_colab = 'E1851';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1851' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES CRANTE S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1851' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1851', 'JEISON HERRERA LOZANO', v_idcliente, '620', 'TALLERES CRANTE S.L', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0274';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0274' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES METALICOS LEZIAGA S.L.U%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0274' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0274', 'HECTOR GIOVANNI MORENO SUSA', v_idcliente, '621', 'TALLERES METALICOS LEZIAGA S.L.U', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('LUMINOUS', ''),
    funcion = COALESCE(NULLIF('Montador/Soldador', ''), funcion)
WHERE cod_colab = 'E0503';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0503' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%LUMINOUS%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%TALLERES METALICOS LEZIAGA S.L.U%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0503' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0503', 'RODRIGO ALEXANDRO AVILA DIEGO', v_idcliente, '621', 'TALLERES METALICOS LEZIAGA S.L.U', v_idempresa, 'LUMINOUS', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Calderero', ''), funcion)
WHERE cod_colab = 'E2129';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2129' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%METALVENT, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2129' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2129', 'YEISON HUGO ANGEL CALDERON', v_idcliente, '628', 'METALVENT, S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;
COMMIT;\n\nBEGIN;\n
UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Pendiente Alta',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Ayudante', ''), funcion)
WHERE cod_colab = 'E1824';

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Ayudante', ''), funcion)
WHERE cod_colab = 'E2138';

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Mecánico/Montador', ''), funcion)
WHERE cod_colab = 'E0083';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0083' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0083' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0083', 'DAVID RICARDO SANCHEZ ZAPATA', v_idcliente, '631', 'MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Mecánico/Montador', ''), funcion)
WHERE cod_colab = 'E1406';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1406' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1406' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1406', 'ANDRES FELIPE LOPEZ FONTALVO', v_idcliente, '631', 'MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Mecánico/Montador', ''), funcion)
WHERE cod_colab = 'E0487';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0487' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0487' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0487', 'ANDY LYONEL CARRASCO VARGAS', v_idcliente, '631', 'MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Mecánico/Montador', ''), funcion)
WHERE cod_colab = 'E0560';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0560' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0560' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0560', 'JORGE REINALDO GOMEZ ROJAS', v_idcliente, '631', 'MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Mecánico/Montador', ''), funcion)
WHERE cod_colab = 'E0399';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E0399' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E0399' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E0399', 'JOSE LUIS CAUSADO TAMAYO', v_idcliente, '631', 'MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Mecánico/Montador', ''), funcion)
WHERE cod_colab = 'E2132';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2132' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2132' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2132', 'KLINSMANN ANDRE COLINA MARIN', v_idcliente, '631', 'MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Mecánico/Montador', ''), funcion)
WHERE cod_colab = 'E1816';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E1816' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E1816' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E1816', 'RAFAEL ALEJANDRO HERRERA URBANO', v_idcliente, '631', 'MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Ativo', 
    status_seguridad = 'Em regularização',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Mecánico/Montador', ''), funcion)
WHERE cod_colab = 'E2146';

-- Upsert or insert assignment
DO $$
DECLARE
    v_idcolab integer;
    v_idempresa integer;
    v_idcliente integer;
BEGIN
    SELECT id INTO v_idcolab FROM public.colaboradores WHERE cod_colab = 'E2146' LIMIT 1;
    SELECT id INTO v_idempresa FROM public.empresas WHERE nome_pbi ILIKE '%TRIANGULO%' LIMIT 1;
    SELECT sp_id INTO v_idcliente FROM public.clientes WHERE nombre_comercial ILIKE '%MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L%' LIMIT 1;
    
    IF v_idcolab IS NOT NULL THEN
        -- Close all active ones for this worker to ensure clean state
        UPDATE public.colaborador_por_pedido 
        SET fechasalidatrabajador = CURRENT_DATE 
        WHERE cod_colab = 'E2146' AND (fechasalidatrabajador IS NULL OR fechasalidatrabajador > CURRENT_DATE);
        
        -- Insert new active assignment
        INSERT INTO public.colaborador_por_pedido 
        (idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
        VALUES 
        (v_idcolab::text, 'E2146', 'RICHARD ANDERSON RUIZ BARRETO', v_idcliente, '631', 'MONTAJE DE TRANSPORTADORES Y SISTEMAS INDUSTRIALES, S.L', v_idempresa, 'TRIANGULO', CURRENT_DATE);
    END IF;
END $$;

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Albañil (oficial 1a)', ''), funcion)
WHERE cod_colab = 'E2151';

UPDATE public.colaboradores 
SET status_trabajador = 'Inativo', 
    status_seguridad = 'Alta',
    contratante = NULLIF('TRIANGULO', ''),
    funcion = COALESCE(NULLIF('Albañil (oficial 2a)', ''), funcion)
WHERE cod_colab = 'E2153';
COMMIT;\n