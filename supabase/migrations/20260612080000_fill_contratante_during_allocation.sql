-- 1. Redefine core_personal.alocar_trabalhador_em_vaga to populate contratante and funcion
CREATE OR REPLACE FUNCTION core_personal.alocar_trabalhador_em_vaga(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_pedido_item_id UUID;
    v_worker_id UUID;
    v_worker_name TEXT;
    v_worker_document TEXT;
    v_planned_start_date DATE;
    v_solicitud_id UUID;
    v_notes TEXT;
    
    -- Novos campos no payload
    v_camiseta TEXT;
    v_pantalones TEXT;
    v_licencia_conducir TEXT;
    v_movil TEXT;
    v_tarifa_acordada NUMERIC(10,2);
    
    v_has_access BOOLEAN;
    
    -- Dados do Item
    v_pedido_id UUID;
    v_job_function_id UUID;
    v_job_function_name VARCHAR;
    v_qty_requested INT;
    v_qty_fulfilled INT;
    v_item_status VARCHAR;
    
    -- Dados do Pedido Principal
    v_client_id UUID;
    v_client_site_id UUID;
    v_pedido_codigo VARCHAR;
    
    -- Alocação
    v_new_assignment_id UUID := gen_random_uuid();
    v_assignment_status VARCHAR;
    v_start_date DATE;
    v_source_type VARCHAR;
    v_source_id UUID;
    
    -- Verificacao
    v_existing_active_assignment UUID;
    
    -- Recalculo de Pedido
    v_total_items INT;
    v_fulfilled_items INT;
    v_new_operational_status VARCHAR;

    -- Empresa/Contratante
    v_contratante_nome TEXT;
BEGIN
    -- 1. Extração do payload
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_pedido_item_id := (payload->>'pedido_item_id')::uuid;
    
    IF payload->>'worker_id' IS NOT NULL AND payload->>'worker_id' != '' THEN
        v_worker_id := (payload->>'worker_id')::uuid;
    END IF;
    
    v_worker_name := payload->>'worker_name';
    v_worker_document := payload->>'worker_document';
    v_planned_start_date := (payload->>'planned_start_date')::date;
    
    IF payload->>'solicitud_id' IS NOT NULL AND payload->>'solicitud_id' != '' THEN
        v_solicitud_id := (payload->>'solicitud_id')::uuid;
    END IF;
    
    v_notes := payload->>'notes';
    
    -- Novos campos opcionais
    v_camiseta := payload->>'camiseta';
    v_pantalones := payload->>'pantalones';
    v_licencia_conducir := payload->>'licencia_conducir';
    v_movil := payload->>'movil';
    
    IF payload->>'tarifa_acordada' IS NOT NULL AND payload->>'tarifa_acordada' != '' THEN
        v_tarifa_acordada := (payload->>'tarifa_acordada')::numeric;
    END IF;

    -- Validação Básica
    IF v_empresa_id IS NULL OR v_pedido_item_id IS NULL OR v_planned_start_date IS NULL THEN
        RAISE EXCEPTION 'empresa_id, pedido_item_id e planned_start_date são obrigatórios.';
    END IF;

    -- 2. Validação de Acesso (RH, Admin, etc)
    SELECT EXISTS (
        SELECT 1 FROM core_common.user_memberships
        WHERE user_id = v_user_id 
          AND empresa_id = v_empresa_id 
          AND is_active = true
          AND role IN ('admin', 'rh', 'super_admin', 'admin_rh', 'operador')
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Acesso negado. Apenas RH ou Operação (Admin) podem alocar trabalhadores.';
    END IF;

    -- 3. Buscar dados do Pedido e Item
    SELECT 
        pi.pedido_id, 
        pi.job_function_id, 
        COALESCE(NULLIF(TRIM(pi.job_function_name_snapshot), ''), NULLIF(TRIM(jf.name), ''), 'Desconhecida'),
        pi.quantity_requested, 
        pi.quantity_fulfilled,
        p.client_id,
        p.client_site_id,
        p.codigo
    INTO 
        v_pedido_id, 
        v_job_function_id, 
        v_job_function_name, 
        v_qty_requested, 
        v_qty_fulfilled,
        v_client_id,
        v_client_site_id,
        v_pedido_codigo
    FROM core_comercial.pedido_items pi
    JOIN core_comercial.pedidos p ON p.id = pi.pedido_id
    LEFT JOIN core_comercial.job_functions jf ON jf.id = pi.job_function_id
    WHERE pi.id = v_pedido_item_id AND pi.empresa_id = v_empresa_id;

    IF v_pedido_id IS NULL THEN
        RAISE EXCEPTION 'Pedido Item não encontrado.';
    END IF;

    -- 4. Validar saldo da vaga
    IF v_qty_fulfilled >= v_qty_requested THEN
        RAISE EXCEPTION 'Este item já teve todas as suas vagas preenchidas.';
    END IF;

    -- Buscar nome da empresa contratante
    SELECT nome INTO v_contratante_nome 
    FROM core_common.empresas 
    WHERE id = v_empresa_id;

    -- 5. Lidar com o Worker (Criar se não existir, atualizar se já existir)
    IF v_worker_id IS NULL THEN
        IF v_worker_name IS NULL OR v_worker_name = '' THEN
            RAISE EXCEPTION 'Se worker_id não for informado, worker_name é obrigatório para cadastro.';
        END IF;
        
        v_worker_id := gen_random_uuid();
        
        INSERT INTO core_personal.workers (
            id, empresa_id, nome, nif, status_trabajador,
            camiseta, pantalones, licencia_conducir, movil, cod_colab,
            contratante, funcion
        )
        VALUES (
            v_worker_id, 
            v_empresa_id, 
            v_worker_name, 
            v_worker_document, 
            'Ativo',
            v_camiseta,
            v_pantalones,
            v_licencia_conducir,
            v_movil,
            'TEMP-' || substring(gen_random_uuid()::text from 1 for 8), -- código temporário
            v_contratante_nome,
            v_job_function_name
        );
    ELSE
        -- Validar se o worker já não está ativamente alocado nesta mesma vaga
        SELECT id INTO v_existing_active_assignment
        FROM core_personal.worker_assignments
        WHERE worker_id = v_worker_id 
          AND pedido_item_id = v_pedido_item_id 
          AND status IN ('planned', 'active', 'paused');
          
        IF v_existing_active_assignment IS NOT NULL THEN
            RAISE EXCEPTION 'O trabalhador já possui uma alocação ativa neste pedido.';
        END IF;

        -- Atualizar os dados de tamanho/CNH/celular no cadastro do trabalhador
        UPDATE core_personal.workers
        SET camiseta = COALESCE(NULLIF(v_camiseta, ''), camiseta),
            pantalones = COALESCE(NULLIF(v_pantalones, ''), pantalones),
            licencia_conducir = COALESCE(NULLIF(v_licencia_conducir, ''), licencia_conducir),
            movil = COALESCE(NULLIF(v_movil, ''), movil),
            contratante = COALESCE(contratante, v_contratante_nome),
            funcion = COALESCE(funcion, v_job_function_name)
        WHERE id = v_worker_id;
    END IF;

    -- 6. Calcular Status da Alocação e Source
    IF v_planned_start_date <= CURRENT_DATE THEN
        v_assignment_status := 'active';
        v_start_date := v_planned_start_date;
    ELSE
        v_assignment_status := 'planned';
        v_start_date := NULL;
    END IF;
    
    IF v_solicitud_id IS NOT NULL THEN
        v_source_type := 'solicitud';
        v_source_id := v_solicitud_id;
    ELSE
        v_source_type := 'pedido';
        v_source_id := v_pedido_id;
    END IF;

    -- 7. Inserir Worker Assignment
    INSERT INTO core_personal.worker_assignments (
        id,
        empresa_id,
        worker_id,
        pedido_id,
        pedido_item_id,
        solicitud_id,
        client_id,
        client_site_id,
        job_function_id,
        job_function_name_snapshot,
        assignment_type,
        status,
        planned_start_date,
        start_date,
        source_type,
        source_id,
        notes,
        root_assignment_id,
        created_by,
        tarifa_acordada
    ) VALUES (
        v_new_assignment_id,
        v_empresa_id,
        v_worker_id,
        v_pedido_id,
        v_pedido_item_id,
        v_solicitud_id,
        v_client_id,
        v_client_site_id,
        v_job_function_id,
        v_job_function_name,
        'new_hire',
        v_assignment_status,
        v_planned_start_date,
        v_start_date,
        v_source_type,
        v_source_id,
        v_notes,
        v_new_assignment_id,
        v_user_id,
        v_tarifa_acordada
    );

    -- 8. Atualizar pedido_item
    v_qty_fulfilled := v_qty_fulfilled + 1;
    
    IF v_qty_fulfilled >= v_qty_requested THEN
        v_item_status := 'fulfilled';
    ELSE
        IF v_qty_fulfilled > 0 THEN
            v_item_status := 'active';
        ELSE
            v_item_status := 'pending';
        END IF;
    END IF;
    
    UPDATE core_comercial.pedido_items
    SET quantity_fulfilled = v_qty_fulfilled,
        status = v_item_status,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = v_pedido_item_id;

    -- 9. Recalcular operational_status do Pedido Inteiro
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'fulfilled' THEN 1 END)
    INTO v_total_items, v_fulfilled_items
    FROM core_comercial.pedido_items
    WHERE pedido_id = v_pedido_id AND status != 'cancelled';
    
    IF v_fulfilled_items = 0 THEN
        IF EXISTS (SELECT 1 FROM core_comercial.pedido_items WHERE pedido_id = v_pedido_id AND quantity_fulfilled > 0 AND status != 'cancelled') THEN
            v_new_operational_status := 'partially_fulfilled';
        ELSE
            v_new_operational_status := 'pending_operations';
        END IF;
    ELSIF v_fulfilled_items = v_total_items THEN
        v_new_operational_status := 'fulfilled';
    ELSE
        v_new_operational_status := 'partially_fulfilled';
    END IF;

    UPDATE core_comercial.pedidos
    SET operational_status = v_new_operational_status,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = v_pedido_id;

    -- 10. Registrar Evento e Timeline
    INSERT INTO core_comercial.pedido_events (
        empresa_id, pedido_id, event_type, title, description, created_by
    ) VALUES (
        v_empresa_id, 
        v_pedido_id, 
        'other', 
        'Trabalhador alocado à vaga', 
        'Alocação gerada para a função ' || v_job_function_name, 
        v_user_id
    );

    IF v_solicitud_id IS NOT NULL THEN
        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id, solicitud_id, event_type, title, description, created_by
        ) VALUES (
            v_empresa_id,
            v_solicitud_id,
            'other',
            'Alocação Efetivada',
            'Trabalhador alocado à vaga ' || v_job_function_name,
            v_user_id
        );
    END IF;

    -- 11. Retorno
    RETURN jsonb_build_object(
        'assignment_id', v_new_assignment_id,
        'worker_id', v_worker_id,
        'pedido_id', v_pedido_id,
        'pedido_item_id', v_pedido_item_id,
        'assignment_status', v_assignment_status,
        'operational_status', v_new_operational_status,
        'item_status', v_item_status,
        'qty_requested', v_qty_requested,
        'qty_fulfilled', v_qty_fulfilled
    );

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao alocar trabalhador: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION core_personal.alocar_trabalhador_em_vaga(jsonb) TO authenticated;

-- 2. Redefine core_personal.search_workers to query COALESCE(w.contratante, c.contratante) and COALESCE(w.funcion, c.funcion)
CREATE OR REPLACE FUNCTION core_personal.search_workers(
  p_empresa_id uuid,
  p_search text DEFAULT NULL::text,
  p_cliente_nombre text DEFAULT NULL::text,
  p_status_trabajador_filter text[] DEFAULT NULL::text[],
  p_status_seguridad_filter text[] DEFAULT NULL::text[],
  p_contratante text DEFAULT NULL::text,
  p_funcion text DEFAULT NULL::text,
  p_sort_column text DEFAULT 'nome'::text,
  p_sort_direction text DEFAULT 'asc'::text,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 10
)
 RETURNS TABLE(
   total_count bigint,
   id uuid,
   empresa_id uuid,
   cod_colab text,
   nome text,
   email text,
   movil text,
   niss text,
   nif text,
   nie text,
   dni text,
   pasaporte text,
   status_seguridad text,
   status_trabajador text,
   contratante text,
   funcion text,
   cliente_nombre text,
   created_at timestamp with time zone
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_offset int := (p_page - 1) * p_page_size;
BEGIN
  RETURN QUERY
  WITH base_workers AS (
    SELECT 
      w.id,
      w.empresa_id,
      w.cod_colab,
      w.nome,
      w.email,
      w.movil,
      w.niss,
      w.nie,
      w.dni,
      w.pasaporte,
      w.status_seguridad,
      w.status_trabajador,
      COALESCE(w.contratante, c.contratante) as contratante,
      COALESCE(w.funcion, c.funcion) as funcion,
      core_personal.fn_get_active_client_for_worker(w.cod_colab) as active_client_nombre,
      w.created_at
    FROM core_personal.workers w
    LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
    WHERE w.empresa_id = p_empresa_id
      AND (p_search IS NULL OR p_search = '' OR w.nome ILIKE '%' || p_search || '%' OR w.cod_colab ILIKE '%' || p_search || '%' OR w.dni ILIKE '%' || p_search || '%' OR w.pasaporte ILIKE '%' || p_search || '%' OR w.niss ILIKE '%' || p_search || '%' OR w.nie ILIKE '%' || p_search || '%')
      AND (p_contratante IS NULL OR p_contratante = '' OR COALESCE(w.contratante, c.contratante) = p_contratante)
      AND (p_funcion IS NULL OR p_funcion = '' OR COALESCE(w.funcion, c.funcion) = p_funcion)
      AND (p_status_trabajador_filter IS NULL OR array_length(p_status_trabajador_filter, 1) IS NULL OR (
        EXISTS (
          SELECT 1 FROM unnest(p_status_trabajador_filter) AS sf
          WHERE (sf = 'ativos' AND (w.status_trabajador ILIKE 'Ativo' OR w.status_trabajador ILIKE 'Activo')) OR
                (sf = 'inativos' AND (w.status_trabajador ILIKE 'Inativo' OR w.status_trabajador ILIKE 'Inactivo')) OR
                (sf = 'pendientes_ingreso' AND (w.status_trabajador ILIKE 'Pendente Ingresso' OR w.status_trabajador ILIKE 'Pendiente Ingresar'))
        )
      ))
      AND (p_status_seguridad_filter IS NULL OR array_length(p_status_seguridad_filter, 1) IS NULL OR (
        EXISTS (
          SELECT 1 FROM unnest(p_status_seguridad_filter) AS sf
          WHERE (sf = 'alta' AND w.status_seguridad ILIKE 'Alta') OR
                (sf = 'pendentes_alta' AND (w.status_seguridad ILIKE 'Pendente Alta' OR w.status_seguridad ILIKE 'Pendiente Alta')) OR
                (sf = 'baixa' AND (w.status_seguridad ILIKE 'Baixa' OR w.status_seguridad ILIKE 'Baja' OR w.status_seguridad ILIKE 'Anulado')) OR
                (sf = 'pendentes_baixa' AND (w.status_seguridad ILIKE 'Pendente Baixa' OR w.status_seguridad ILIKE 'Pendiente Baja'))
        )
      ))
  ),
  filtered AS (
    SELECT *
    FROM base_workers bw
    WHERE (p_cliente_nombre IS NULL OR p_cliente_nombre = '' OR bw.active_client_nombre ILIKE '%' || p_cliente_nombre || '%')
  ),
  total AS (
    SELECT COUNT(*) AS exact_count FROM filtered
  )
  SELECT 
    (SELECT exact_count FROM total) AS total_count,
    f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.active_client_nombre as cliente_nombre, f.created_at
  FROM filtered f
  ORDER BY 
    CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'asc' THEN f.nome END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'desc' THEN f.nome END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'asc' THEN f.cod_colab END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'desc' THEN f.cod_colab END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'asc' THEN f.contratante END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'desc' THEN f.contratante END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'asc' THEN f.funcion END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'desc' THEN f.funcion END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'asc' THEN f.active_client_nombre END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'desc' THEN f.active_client_nombre END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'asc' THEN f.status_trabajador END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'desc' THEN f.status_trabajador END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'status_seguridad' AND p_sort_direction = 'asc' THEN f.status_seguridad END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'status_seguridad' AND p_sort_direction = 'desc' THEN f.status_seguridad END DESC NULLS LAST,
    f.nome ASC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;

-- 3. Redefine core_personal.get_client_worker_kpis to query COALESCE(w.contratante, c.contratante) and COALESCE(w.funcion, c.funcion)
CREATE OR REPLACE FUNCTION core_personal.get_client_worker_kpis(
  p_empresa_id uuid,
  p_search text DEFAULT NULL::text,
  p_cliente_nombre text DEFAULT NULL::text,
  p_contratante text DEFAULT NULL::text,
  p_funcion text DEFAULT NULL::text
)
 RETURNS TABLE(
   ativos bigint,
   inativos bigint,
   pendentes_ingreso bigint,
   seguridade_alta bigint,
   seguridade_pendente_alta bigint,
   seguridade_baixa bigint,
   seguridade_pendente_baixa bigint
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $function$
BEGIN
    RETURN QUERY
    WITH worker_active_clients AS (
        SELECT 
            w.id,
            w.status_trabajador,
            w.status_seguridad,
            w.nome,
            w.cod_colab,
            w.dni,
            w.pasaporte,
            w.niss,
            w.nie,
            COALESCE(w.contratante, c.contratante) as contratante,
            COALESCE(w.funcion, c.funcion) as funcion,
            core_personal.fn_get_active_client_for_worker(w.cod_colab) as active_client
        FROM core_personal.workers w
        LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
        WHERE w.empresa_id = p_empresa_id
          AND (p_search IS NULL OR p_search = '' OR w.nome ILIKE '%' || p_search || '%' OR w.cod_colab ILIKE '%' || p_search || '%' OR w.dni ILIKE '%' || p_search || '%' OR w.pasaporte ILIKE '%' || p_search || '%' OR w.niss ILIKE '%' || p_search || '%' OR w.nie ILIKE '%' || p_search || '%')
          AND (p_contratante IS NULL OR p_contratante = '' OR COALESCE(w.contratante, c.contratante) = p_contratante)
          AND (p_funcion IS NULL OR p_funcion = '' OR COALESCE(w.funcion, c.funcion) = p_funcion)
    ),
    filtered_kpis AS (
        SELECT *
        FROM worker_active_clients wk
        WHERE (p_cliente_nombre IS NULL OR p_cliente_nombre = '' OR wk.active_client ILIKE '%' || p_cliente_nombre || '%')
    )
    SELECT 
        -- Status do Trabalhador
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Activo' OR wk.status_trabajador ILIKE 'Ativo') AS ativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Inactivo' OR wk.status_trabajador ILIKE 'Inativo') AS inativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE '%Pendente%') AS pendentes_ingreso,
        
        -- Status de Seguridade
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Alta' OR wk.status_seguridad ILIKE 'Alta Confirmada') AS seguridade_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendiente de Alta' OR wk.status_seguridad ILIKE 'Pendente de Alta') AS seguridade_pendente_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Baja' OR wk.status_seguridad ILIKE 'Baixa' OR wk.status_seguridad ILIKE 'Anulado') AS seguridade_baixa,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendiente de Baja' OR wk.status_seguridad ILIKE 'Pendente de Baixa') AS seguridade_pendente_baixa

    FROM filtered_kpis wk;
END;
$function$;
