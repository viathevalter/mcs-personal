-- Migration: 20260908120000_postpone_pedido_and_reemplazo.sql
-- Description: Cria RPCs para listar Reemplazos para adiamento e processar o adiamento de início de Pedidos e Reemplazos,
-- sincronizando todas as alocações dos trabalhadores contratados em worker_assignments e colaborador_por_pedido,
-- e notificando os departamentos envolvidos.

-- 1. RPC para listar Reemplazos com dados de cliente e trabalhadores para a tela de adiamento
DROP FUNCTION IF EXISTS public.listar_reemplazos_para_adiamento(UUID);
DROP FUNCTION IF EXISTS core_operacoes.listar_reemplazos_para_adiamento(UUID);

CREATE OR REPLACE FUNCTION public.listar_reemplazos_para_adiamento(p_empresa_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    codigo VARCHAR,
    title VARCHAR,
    due_date DATE,
    status VARCHAR,
    client_id UUID,
    client_name TEXT,
    client_site_id UUID,
    client_site_name TEXT,
    pedido_id UUID,
    pedido_codigo VARCHAR,
    target_job_function_name VARCHAR,
    target_worker_id UUID,
    target_worker_cod VARCHAR,
    target_worker_nome VARCHAR,
    source_worker_id UUID,
    source_worker_cod VARCHAR,
    source_worker_nome VARCHAR,
    target_planned_start DATE,
    target_start_date DATE,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.codigo, s.title, s.due_date, s.status,
           COALESCE(s.client_id, t.source_client_id, p.client_id) AS client_id,
           COALESCE(c.trade_name, c.legal_name, 'Cliente')::TEXT AS client_name,
           COALESCE(s.client_site_id, t.source_client_site_id, p.client_site_id) AS client_site_id,
           COALESCE(cs.name, 'Local não informado')::TEXT AS client_site_name,
           s.pedido_id,
           p.codigo::VARCHAR AS pedido_codigo,
           t.target_job_function_name,
           tw.id AS target_worker_id, tw.cod_colab::VARCHAR AS target_worker_cod, tw.nome::VARCHAR AS target_worker_nome,
           sw.id AS source_worker_id, sw.cod_colab::VARCHAR AS source_worker_cod, sw.nome::VARCHAR AS source_worker_nome,
           wa.planned_start_date AS target_planned_start, wa.start_date AS target_start_date,
           s.created_at
    FROM core_operacoes.solicitudes_operativas s
    LEFT JOIN core_operacoes.solicitud_targets t ON t.solicitud_id = s.id
    LEFT JOIN core_common.clients c ON c.id = COALESCE(s.client_id, t.source_client_id)
    LEFT JOIN core_common.client_sites cs ON cs.id = COALESCE(s.client_site_id, t.source_client_site_id)
    LEFT JOIN core_comercial.pedidos p ON p.id = s.pedido_id
    LEFT JOIN core_personal.workers tw ON tw.id = t.target_worker_id
    LEFT JOIN core_personal.workers sw ON sw.id = t.source_worker_id
    LEFT JOIN core_personal.worker_assignments wa ON wa.id = t.target_assignment_id
    WHERE (s.tipo IN ('replacement', 'reemplazo') OR s.codigo LIKE 'R-%')
      AND (p_empresa_id IS NULL OR s.empresa_id = p_empresa_id)
    ORDER BY s.created_at DESC;
END;
$$;

-- Alias in core_operacoes as well
CREATE OR REPLACE FUNCTION core_operacoes.listar_reemplazos_para_adiamento(p_empresa_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    codigo VARCHAR,
    title VARCHAR,
    due_date DATE,
    status VARCHAR,
    client_id UUID,
    client_name TEXT,
    client_site_id UUID,
    client_site_name TEXT,
    pedido_id UUID,
    pedido_codigo VARCHAR,
    target_job_function_name VARCHAR,
    target_worker_id UUID,
    target_worker_cod VARCHAR,
    target_worker_nome VARCHAR,
    source_worker_id UUID,
    source_worker_cod VARCHAR,
    source_worker_nome VARCHAR,
    target_planned_start DATE,
    target_start_date DATE,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.listar_reemplazos_para_adiamento(p_empresa_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_reemplazos_para_adiamento(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION core_operacoes.listar_reemplazos_para_adiamento(UUID) TO authenticated, anon, service_role;

-- 2. RPC para processar o adiamento de Pedido ou Reemplazo atomicamente
DROP FUNCTION IF EXISTS core_operacoes.processar_adiamento_inicio(JSONB);

CREATE OR REPLACE FUNCTION core_operacoes.processar_adiamento_inicio(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_origem_tipo VARCHAR; -- 'pedido' ou 'reemplazo'
    v_origem_id UUID;
    v_nova_data_inicio DATE;
    v_motivo TEXT;
    v_observacoes TEXT;
    
    v_solicitud_id UUID;
    v_solicitud_codigo VARCHAR;
    v_pedido_id UUID;
    v_pedido_codigo VARCHAR;
    v_client_id UUID;
    v_client_site_id UUID;
    v_client_name TEXT;
    v_codigo_ref VARCHAR;
    
    v_workers_updated INT := 0;
    v_cpp_updated INT := 0;
    
    v_dep_rh UUID;
    v_dep_doc UUID;
    v_dep_log UUID;
    v_dep_com UUID;
    v_msg TEXT;
    v_link VARCHAR;
    v_source_assignment_id UUID;
BEGIN
    -- 1. Extrair e validar parâmetros
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_origem_tipo := LOWER(TRIM(payload->>'origem_tipo'));
    v_origem_id := (payload->>'origem_id')::uuid;
    v_nova_data_inicio := (payload->>'nova_data_inicio')::date;
    v_motivo := payload->>'motivo';
    v_observacoes := payload->>'observacoes';

    IF v_empresa_id IS NULL OR v_origem_id IS NULL OR v_nova_data_inicio IS NULL THEN
        RAISE EXCEPTION 'empresa_id, origem_id e nova_data_inicio são obrigatórios.';
    END IF;

    IF v_origem_tipo NOT IN ('pedido', 'reemplazo') THEN
        RAISE EXCEPTION 'origem_tipo deve ser "pedido" ou "reemplazo".';
    END IF;

    -- 2. Processar conforme o tipo de origem
    IF v_origem_tipo = 'pedido' THEN
        v_pedido_id := v_origem_id;

        -- Buscar dados do Pedido
        SELECT p.codigo, p.client_id, p.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
        INTO v_pedido_codigo, v_client_id, v_client_site_id, v_client_name
        FROM core_comercial.pedidos p
        LEFT JOIN core_common.clients c ON c.id = p.client_id
        WHERE p.id = v_pedido_id;

        IF v_pedido_codigo IS NULL THEN
            RAISE EXCEPTION 'Pedido com ID % não encontrado.', v_pedido_id;
        END IF;

        v_codigo_ref := v_pedido_codigo;

        -- 2.1 Atualizar expected_start_date no Pedido
        UPDATE core_comercial.pedidos
        SET expected_start_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE id = v_pedido_id;

        -- 2.2 Localizar ou vincular solicitude-mãe (tipo 'new_order')
        SELECT id, codigo INTO v_solicitud_id, v_solicitud_codigo
        FROM core_operacoes.solicitudes_operativas
        WHERE pedido_id = v_pedido_id AND tipo = 'new_order'
        LIMIT 1;

        IF v_solicitud_id IS NOT NULL THEN
            UPDATE core_operacoes.solicitudes_operativas
            SET due_date = v_nova_data_inicio,
                updated_at = NOW()
            WHERE id = v_solicitud_id;
        END IF;

        -- 2.3 Atualizar TODAS as alocações dos trabalhadores vinculados ao Pedido
        UPDATE core_personal.worker_assignments
        SET planned_start_date = v_nova_data_inicio,
            start_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE pedido_id = v_pedido_id
          AND status != 'terminated';
        
        GET DIAGNOSTICS v_workers_updated = ROW_COUNT;

        -- 2.4 Atualizar em public.colaborador_por_pedido se houver registros
        UPDATE public.colaborador_por_pedido
        SET fechainiciopedido = v_nova_data_inicio,
            updated_at = NOW()
        WHERE codpedido = v_pedido_codigo;

        GET DIAGNOSTICS v_cpp_updated = ROW_COUNT;

        v_link := '/operacoes/pedidos/' || v_pedido_id;

    ELSIF v_origem_tipo = 'reemplazo' THEN
        v_solicitud_id := v_origem_id;

        -- Buscar dados da solicitude de Reemplazo
        SELECT s.codigo, s.pedido_id, s.client_id, s.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
        INTO v_solicitud_codigo, v_pedido_id, v_client_id, v_client_site_id, v_client_name
        FROM core_operacoes.solicitudes_operativas s
        LEFT JOIN core_common.clients c ON c.id = s.client_id
        WHERE s.id = v_solicitud_id AND s.tipo = 'replacement';

        IF v_solicitud_codigo IS NULL THEN
            RAISE EXCEPTION 'Solicitação de Reemplazo com ID % não encontrada.', v_solicitud_id;
        END IF;

        v_codigo_ref := v_solicitud_codigo;

        -- 2.1 Atualizar due_date na solicitude de Reemplazo
        UPDATE core_operacoes.solicitudes_operativas
        SET due_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE id = v_solicitud_id;

        -- 2.2 Atualizar alocações do trabalhador substituto / alocado no Reemplazo
        UPDATE core_personal.worker_assignments
        SET planned_start_date = v_nova_data_inicio,
            start_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE (
            solicitud_id = v_solicitud_id 
            OR id IN (
                SELECT target_assignment_id 
                FROM core_operacoes.solicitud_targets 
                WHERE solicitud_id = v_solicitud_id AND target_assignment_id IS NOT NULL
            )
        )
        AND status != 'terminated';

        GET DIAGNOSTICS v_workers_updated = ROW_COUNT;

        -- 2.3 Reajustar a data final do trabalhador sendo substituído para o dia anterior ao novo início
        SELECT source_assignment_id INTO v_source_assignment_id
        FROM core_operacoes.solicitud_targets
        WHERE solicitud_id = v_solicitud_id AND source_assignment_id IS NOT NULL
        LIMIT 1;

        IF v_source_assignment_id IS NOT NULL THEN
            UPDATE core_personal.worker_assignments
            SET end_date = (v_nova_data_inicio - 1),
                updated_at = NOW()
            WHERE id = v_source_assignment_id;
        END IF;

        -- 2.4 Atualizar em public.colaborador_por_pedido se houver registros vinculados ao código do Reemplazo
        UPDATE public.colaborador_por_pedido
        SET fechainiciopedido = v_nova_data_inicio,
            updated_at = NOW()
        WHERE codpedido = v_solicitud_codigo;

        GET DIAGNOSTICS v_cpp_updated = ROW_COUNT;

        v_link := '/operacoes/solicitudes/' || v_solicitud_id;
    END IF;

    -- 3. Inserir evento na linha do tempo (Timeline)
    IF v_solicitud_id IS NOT NULL THEN
        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id,
            solicitud_id,
            event_type,
            title,
            description,
            created_by
        ) VALUES (
            v_empresa_id,
            v_solicitud_id,
            'other',
            'Início Adiado',
            COALESCE(v_motivo, 'Data de início adiada para ' || TO_CHAR(v_nova_data_inicio, 'DD/MM/YYYY')),
            v_user_id
        );
    END IF;

    -- 4. Notificar departamentos (RH, DOCUMENTACION, LOGISTICA, COMERCIAL)
    SELECT id INTO v_dep_rh FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'RH';
    SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'DOCUMENTACION';
    SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'LOGISTICA';
    SELECT id INTO v_dep_com FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'COMERCIAL';

    v_msg := 'O início de ' || v_codigo_ref || ' (' || v_client_name || ') foi adiado para ' || TO_CHAR(v_nova_data_inicio, 'DD/MM/YYYY') || '. Verifique as novas datas operacionais e alocações.';

    PERFORM core_common.create_notification(v_empresa_id, v_dep_rh,  NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_doc, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_log, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_com, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);

    -- 5. Retornar dados da operação
    RETURN jsonb_build_object(
        'success', true,
        'origem_tipo', v_origem_tipo,
        'codigo_ref', v_codigo_ref,
        'nova_data_inicio', v_nova_data_inicio,
        'solicitud_id', v_solicitud_id,
        'pedido_id', v_pedido_id,
        'workers_assignments_updated', v_workers_updated,
        'cpp_records_updated', v_cpp_updated
    );
END;
$$;

GRANT EXECUTE ON FUNCTION core_operacoes.processar_adiamento_inicio(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION core_operacoes.processar_adiamento_inicio(jsonb) TO service_role;

-- Expose processar_adiamento_inicio in public schema as well
DROP FUNCTION IF EXISTS public.processar_adiamento_inicio(JSONB);
CREATE OR REPLACE FUNCTION public.processar_adiamento_inicio(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN core_operacoes.processar_adiamento_inicio(payload);
END;
$$;

GRANT EXECUTE ON FUNCTION public.processar_adiamento_inicio(JSONB) TO authenticated, anon, service_role;
