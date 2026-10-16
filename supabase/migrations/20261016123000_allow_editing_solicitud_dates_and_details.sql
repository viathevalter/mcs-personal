-- ============================================================================
-- Migration: 20261016123000_allow_editing_solicitud_dates_and_details.sql
-- Description: Permite editar/alterar a data programada (prorrogar/adiar),
--              destino, alojamento, prioridade e observações de qualquer
--              Solicitação Operacional na Torre de Controle sem quebrar o
--              Playbook, sincronizando alocações, pedidos, tarefas e timeline.
--              Também habilita Reubicación na tela de Adiamento de Início.
-- ============================================================================

-- 1. RPC para listar Reubicações (Relocations) para a tela de Adiamento de Início
DROP FUNCTION IF EXISTS public.listar_reubicacoes_para_adiamento(UUID);
DROP FUNCTION IF EXISTS core_operacoes.listar_reubicacoes_para_adiamento(UUID);

CREATE OR REPLACE FUNCTION public.listar_reubicacoes_para_adiamento(p_empresa_id UUID DEFAULT NULL)
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
    source_worker_id UUID,
    source_worker_cod VARCHAR,
    source_worker_nome VARCHAR,
    requires_housing BOOLEAN,
    housing_start_date DATE,
    housing_end_date DATE,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id,
           s.codigo::VARCHAR,
           s.title::VARCHAR,
           s.due_date::DATE,
           s.status::VARCHAR,
           COALESCE(s.client_id, t.target_client_id, t.source_client_id, p.client_id) AS client_id,
           COALESCE(c.trade_name, c.legal_name, 'Cliente')::TEXT AS client_name,
           COALESCE(s.client_site_id, t.target_client_site_id, t.source_client_site_id, p.client_site_id) AS client_site_id,
           COALESCE(cs.name, 'Local não informado')::TEXT AS client_site_name,
           s.pedido_id,
           p.codigo::VARCHAR AS pedido_codigo,
           sw.id AS source_worker_id,
           sw.cod_colab::VARCHAR AS source_worker_cod,
           sw.nome::VARCHAR AS source_worker_nome,
           COALESCE(t.requires_housing, false) AS requires_housing,
           t.housing_start_date,
           t.housing_end_date,
           s.created_at
    FROM core_operacoes.solicitudes_operativas s
    LEFT JOIN LATERAL (
        SELECT st.*
        FROM core_operacoes.solicitud_targets st
        WHERE st.solicitud_id = s.id
        ORDER BY st.created_at ASC
        LIMIT 1
    ) t ON true
    LEFT JOIN core_common.clients c ON c.id = COALESCE(s.client_id, t.target_client_id, t.source_client_id)
    LEFT JOIN core_common.client_sites cs ON cs.id = COALESCE(s.client_site_id, t.target_client_site_id, t.source_client_site_id)
    LEFT JOIN core_comercial.pedidos p ON p.id = s.pedido_id
    LEFT JOIN core_personal.workers sw ON sw.id = t.source_worker_id
    WHERE s.tipo = 'relocation'
      AND (p_empresa_id IS NULL OR s.empresa_id = p_empresa_id)
    ORDER BY s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION core_operacoes.listar_reubicacoes_para_adiamento(p_empresa_id UUID DEFAULT NULL)
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
    source_worker_id UUID,
    source_worker_cod VARCHAR,
    source_worker_nome VARCHAR,
    requires_housing BOOLEAN,
    housing_start_date DATE,
    housing_end_date DATE,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.listar_reubicacoes_para_adiamento(p_empresa_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_reubicacoes_para_adiamento(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION core_operacoes.listar_reubicacoes_para_adiamento(UUID) TO authenticated, anon, service_role;


-- 2. RPC principal para Editar / Alterar Data e Dados de qualquer Solicitação Operacional na Torre de Controle
DROP FUNCTION IF EXISTS core_operacoes.atualizar_solicitud_operativa(JSONB);
DROP FUNCTION IF EXISTS public.atualizar_solicitud_operativa(JSONB);

CREATE OR REPLACE FUNCTION core_operacoes.atualizar_solicitud_operativa(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_solicitud_id UUID;
    v_nova_data DATE;
    v_title VARCHAR;
    v_priority VARCHAR;
    v_reason TEXT;
    v_notes TEXT;
    v_client_id UUID;
    v_client_site_id UUID;
    v_requires_housing BOOLEAN;
    v_housing_start_date DATE;
    v_housing_end_date DATE;
    v_reopen_completed_tasks BOOLEAN;

    v_sol RECORD;
    v_old_due_date DATE;
    v_date_changed BOOLEAN := false;
    v_tasks_reopened INT := 0;
    v_assignments_updated INT := 0;
    v_source_assignment_id UUID;
    v_client_name TEXT;
    v_timeline_title VARCHAR;
    v_timeline_desc TEXT;

    v_dep_rh UUID;
    v_dep_doc UUID;
    v_dep_log UUID;
    v_dep_com UUID;
    v_msg TEXT;
    v_link VARCHAR;
BEGIN
    v_solicitud_id := NULLIF(TRIM(payload->>'solicitud_id'), '')::UUID;
    IF v_solicitud_id IS NULL THEN
        RAISE EXCEPTION 'O campo solicitud_id é obrigatório.';
    END IF;

    SELECT * INTO v_sol
    FROM core_operacoes.solicitudes_operativas
    WHERE id = v_solicitud_id;

    IF v_sol.id IS NULL THEN
        RAISE EXCEPTION 'Solicitação Operativa % não encontrada.', v_solicitud_id;
    END IF;

    v_old_due_date := v_sol.due_date::DATE;

    IF payload ? 'due_date' AND NULLIF(TRIM(payload->>'due_date'), '') IS NOT NULL THEN
        v_nova_data := (SPLIT_PART(TRIM(payload->>'due_date'), 'T', 1))::DATE;
    ELSE
        v_nova_data := v_old_due_date;
    END IF;

    v_date_changed := (v_nova_data IS DISTINCT FROM v_old_due_date);

    v_title := COALESCE(NULLIF(TRIM(payload->>'title'), ''), v_sol.title);
    v_priority := COALESCE(NULLIF(TRIM(payload->>'priority'), ''), v_sol.priority);
    v_reason := COALESCE(NULLIF(TRIM(payload->>'reason'), ''), v_sol.reason);
    v_notes := COALESCE(payload->>'notes', v_sol.description);
    v_reopen_completed_tasks := COALESCE((payload->>'reopen_completed_tasks')::BOOLEAN, false);

    IF payload ? 'client_id' THEN
        v_client_id := NULLIF(TRIM(payload->>'client_id'), '')::UUID;
    ELSE
        v_client_id := v_sol.client_id;
    END IF;

    IF payload ? 'client_site_id' THEN
        v_client_site_id := NULLIF(TRIM(payload->>'client_site_id'), '')::UUID;
    ELSE
        v_client_site_id := v_sol.client_site_id;
    END IF;

    -- 1. Atualizar cabeçalho da Solicitud Operativa
    UPDATE core_operacoes.solicitudes_operativas
    SET title = v_title,
        priority = v_priority,
        due_date = CASE WHEN v_nova_data IS NOT NULL THEN (v_nova_data::TEXT || 'T12:00:00.000Z')::TIMESTAMPTZ ELSE due_date END,
        reason = v_reason,
        description = v_notes,
        client_id = v_client_id,
        client_site_id = v_client_site_id,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = v_solicitud_id;

    -- 2. Atualizar Solicitud Targets vinculados
    IF v_sol.tipo = 'relocation' THEN
        v_requires_housing := COALESCE((payload->>'requires_housing')::BOOLEAN, false);
        v_housing_start_date := NULLIF(SPLIT_PART(TRIM(COALESCE(payload->>'housing_start_date', '')), 'T', 1), '')::DATE;
        v_housing_end_date := NULLIF(SPLIT_PART(TRIM(COALESCE(payload->>'housing_end_date', '')), 'T', 1), '')::DATE;

        UPDATE core_operacoes.solicitud_targets
        SET reason = COALESCE(v_reason, reason),
            notes = COALESCE(v_notes, notes),
            target_client_id = COALESCE(v_client_id, target_client_id),
            target_client_site_id = COALESCE(v_client_site_id, target_client_site_id),
            requires_housing = CASE WHEN payload ? 'requires_housing' THEN v_requires_housing ELSE requires_housing END,
            housing_start_date = CASE WHEN payload ? 'housing_start_date' THEN v_housing_start_date ELSE housing_start_date END,
            housing_end_date = CASE WHEN payload ? 'housing_end_date' THEN v_housing_end_date ELSE housing_end_date END,
            updated_at = NOW()
        WHERE solicitud_id = v_solicitud_id;
    ELSE
        UPDATE core_operacoes.solicitud_targets
        SET reason = COALESCE(v_reason, reason),
            notes = COALESCE(v_notes, notes),
            updated_at = NOW()
        WHERE solicitud_id = v_solicitud_id;
    END IF;

    -- 3. Se a data foi alterada, sincronizar alocações e pedidos conforme o tipo da operação
    IF v_nova_data IS NOT NULL AND v_date_changed THEN
        IF v_sol.tipo IN ('replacement', 'relocation', 'technical_test', 'field_trial') THEN
            -- Atualizar alocação de destino vinculada à solicitação (se já houver)
            UPDATE core_personal.worker_assignments
            SET planned_start_date = v_nova_data,
                start_date = CASE WHEN start_date IS NOT NULL THEN v_nova_data ELSE start_date END,
                updated_at = NOW()
            WHERE (
                solicitud_id = v_solicitud_id
                OR id IN (
                    SELECT target_assignment_id
                    FROM core_operacoes.solicitud_targets
                    WHERE solicitud_id = v_solicitud_id AND target_assignment_id IS NOT NULL
                )
            )
            AND status NOT IN ('terminated', 'cancelled');

            GET DIAGNOSTICS v_assignments_updated = ROW_COUNT;

            -- No caso de reemplazo, reajustar end_date do trabalhador substituído para (nova_data - 1)
            IF v_sol.tipo = 'replacement' THEN
                SELECT source_assignment_id INTO v_source_assignment_id
                FROM core_operacoes.solicitud_targets
                WHERE solicitud_id = v_solicitud_id AND source_assignment_id IS NOT NULL
                LIMIT 1;

                IF v_source_assignment_id IS NOT NULL THEN
                    UPDATE core_personal.worker_assignments
                    SET end_date = (v_nova_data - 1),
                        updated_at = NOW()
                    WHERE id = v_source_assignment_id
                      AND (end_date IS NOT NULL OR status = 'terminated');
                END IF;
            END IF;

            -- Sincronizar tabela espelho colaborador_por_pedido se houver registro com este código
            UPDATE public.colaborador_por_pedido
            SET fechainiciopedido = v_nova_data,
                updated_at = NOW()
            WHERE codpedido = v_sol.codigo;

        ELSIF v_sol.tipo IN ('new_order', 'order_postponement') AND v_sol.pedido_id IS NOT NULL THEN
            UPDATE core_comercial.pedidos
            SET expected_start_date = v_nova_data,
                updated_at = NOW()
            WHERE id = v_sol.pedido_id;

            UPDATE core_personal.worker_assignments
            SET planned_start_date = v_nova_data,
                start_date = v_nova_data,
                updated_at = NOW()
            WHERE pedido_id = v_sol.pedido_id
              AND status NOT IN ('terminated', 'cancelled');

            GET DIAGNOSTICS v_assignments_updated = ROW_COUNT;

        ELSIF v_sol.tipo IN ('order_extension', 'order_termination') AND v_sol.pedido_id IS NOT NULL THEN
            UPDATE core_comercial.pedidos
            SET expected_end_date = v_nova_data,
                updated_at = NOW()
            WHERE id = v_sol.pedido_id;

            UPDATE core_personal.worker_assignments
            SET planned_end_date = v_nova_data,
                updated_at = NOW()
            WHERE pedido_id = v_sol.pedido_id
              AND status IN ('active', 'planned');

            GET DIAGNOSTICS v_assignments_updated = ROW_COUNT;

        ELSIF v_sol.tipo IN ('offboarding', 'worker_resignation') THEN
            UPDATE core_personal.worker_assignments
            SET planned_end_date = v_nova_data,
                end_date = CASE WHEN end_date IS NOT NULL THEN v_nova_data ELSE end_date END,
                updated_at = NOW()
            WHERE id IN (
                SELECT source_assignment_id
                FROM core_operacoes.solicitud_targets
                WHERE solicitud_id = v_solicitud_id AND source_assignment_id IS NOT NULL
            );

            GET DIAGNOSTICS v_assignments_updated = ROW_COUNT;
        END IF;

        -- Atualizar data de vencimento das tarefas em aberto do Playbook
        UPDATE core_operacoes.solicitud_tareas
        SET due_date = v_nova_data,
            updated_at = NOW()
        WHERE solicitud_id = v_solicitud_id
          AND status IN ('pending', 'in_progress', 'blocked');
    END IF;

    -- 4. Se solicitado pelo usuário, reabrir tarefas concluídas do Playbook para nova conferência dos departamentos
    IF v_reopen_completed_tasks THEN
        UPDATE core_operacoes.solicitud_tareas
        SET status = 'pending',
            completed_at = NULL,
            due_date = COALESCE(v_nova_data, due_date),
            description = COALESCE(description, '') || ' [Reaberta por alteração de data para ' || COALESCE(TO_CHAR(v_nova_data, 'DD/MM/YYYY'), 'nova data') || ']',
            updated_at = NOW()
        WHERE solicitud_id = v_solicitud_id
          AND status = 'completed';

        GET DIAGNOSTICS v_tasks_reopened = ROW_COUNT;

        IF v_tasks_reopened > 0 AND v_sol.status = 'completed' THEN
            UPDATE core_operacoes.solicitudes_operativas
            SET status = 'in_progress',
                completed_at = NULL,
                updated_at = NOW()
            WHERE id = v_solicitud_id;
        END IF;
    END IF;

    -- 5. Registrar na Timeline da Solicitação
    IF v_date_changed THEN
        IF v_sol.tipo = 'order_extension' THEN
            v_timeline_title := 'Prazo Prorrogado';
        ELSE
            v_timeline_title := 'Início Adiado';
        END IF;

        v_timeline_desc := 'Data alterada de ' || COALESCE(TO_CHAR(v_old_due_date, 'DD/MM/YYYY'), 'Não definida') ||
                           ' para ' || COALESCE(TO_CHAR(v_nova_data, 'DD/MM/YYYY'), 'Não definida') || '.' ||
                           CASE WHEN COALESCE(v_reason, '') != '' THEN ' Motivo: ' || v_reason ELSE '' END ||
                           CASE WHEN v_tasks_reopened > 0 THEN ' (' || v_tasks_reopened || ' tarefa(s) reaberta(s) no Playbook).' ELSE '' END;
    ELSE
        v_timeline_title := 'Solicitação Atualizada';
        v_timeline_desc := 'Dados operacionais da solicitação foram atualizados.' ||
                           CASE WHEN COALESCE(v_reason, '') != '' THEN ' Motivo: ' || v_reason ELSE '' END;
    END IF;

    INSERT INTO core_operacoes.solicitud_timeline (
        empresa_id,
        solicitud_id,
        event_type,
        title,
        description,
        created_by
    ) VALUES (
        v_sol.empresa_id,
        v_solicitud_id,
        'other',
        v_timeline_title,
        v_timeline_desc,
        v_user_id
    );

    -- 6. Enviar notificações internas aos departamentos quando houver mudança de data
    IF v_date_changed THEN
        SELECT COALESCE(trade_name, legal_name, 'Cliente') INTO v_client_name
        FROM core_common.clients
        WHERE id = v_client_id;

        SELECT id INTO v_dep_rh  FROM core_common.departments WHERE empresa_id = v_sol.empresa_id AND code = 'RH' LIMIT 1;
        SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = v_sol.empresa_id AND code = 'DOCUMENTACION' LIMIT 1;
        SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = v_sol.empresa_id AND code = 'LOGISTICA' LIMIT 1;
        SELECT id INTO v_dep_com FROM core_common.departments WHERE empresa_id = v_sol.empresa_id AND code = 'COMERCIAL' LIMIT 1;

        v_link := '/operacoes/solicitudes/' || v_solicitud_id;
        v_msg := 'A solicitação ' || v_sol.codigo || ' (' || COALESCE(v_client_name, 'Operação') || ') teve sua data alterada de ' ||
                 COALESCE(TO_CHAR(v_old_due_date, 'DD/MM/YYYY'), 'N/A') || ' para ' ||
                 COALESCE(TO_CHAR(v_nova_data, 'DD/MM/YYYY'), 'N/A') || '. Verifique os ajustes necessários no seu setor.';

        PERFORM core_common.create_notification(v_sol.empresa_id, v_dep_rh,  NULL, 'Data Alterada - ' || v_sol.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(v_sol.empresa_id, v_dep_doc, NULL, 'Data Alterada - ' || v_sol.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(v_sol.empresa_id, v_dep_log, NULL, 'Data Alterada - ' || v_sol.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(v_sol.empresa_id, v_dep_com, NULL, 'Data Alterada - ' || v_sol.codigo, v_msg, 'date_change', 'warning', v_link);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'solicitud_id', v_solicitud_id,
        'codigo', v_sol.codigo,
        'old_due_date', v_old_due_date,
        'new_due_date', v_nova_data,
        'date_changed', v_date_changed,
        'tasks_reopened', v_tasks_reopened,
        'assignments_updated', v_assignments_updated
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_solicitud_operativa(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN core_operacoes.atualizar_solicitud_operativa(payload);
END;
$$;

GRANT EXECUTE ON FUNCTION core_operacoes.atualizar_solicitud_operativa(JSONB) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.atualizar_solicitud_operativa(JSONB) TO authenticated, anon, service_role;


-- 3. Expandir core_operacoes.processar_adiamento_inicio para suportar também 'reubicacion' / 'relocation'
CREATE OR REPLACE FUNCTION core_operacoes.processar_adiamento_inicio(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_origem_tipo VARCHAR;
    v_origem_id UUID;
    v_nova_data_inicio DATE;
    v_motivo TEXT;
    v_observacoes TEXT;
    
    v_solicitud_id UUID;
    v_solicitud_codigo VARCHAR;
    v_new_postpone_solicitud_id UUID := gen_random_uuid();
    v_new_postpone_codigo VARCHAR;
    v_solicitudes_count INT;
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
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_origem_tipo := LOWER(TRIM(payload->>'origem_tipo'));
    v_origem_id := (payload->>'origem_id')::uuid;
    v_nova_data_inicio := (payload->>'nova_data_inicio')::date;
    v_motivo := payload->>'motivo';
    v_observacoes := payload->>'observacoes';

    IF v_empresa_id IS NULL OR v_origem_id IS NULL OR v_nova_data_inicio IS NULL THEN
        RAISE EXCEPTION 'empresa_id, origem_id e nova_data_inicio são obrigatórios.';
    END IF;

    IF v_origem_tipo = 'pedido' THEN
        v_pedido_id := v_origem_id;

        SELECT p.codigo, p.client_id, p.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
        INTO v_pedido_codigo, v_client_id, v_client_site_id, v_client_name
        FROM core_comercial.pedidos p
        LEFT JOIN core_common.clients c ON c.id = p.client_id
        WHERE p.id = v_pedido_id;

        IF v_pedido_codigo IS NULL THEN
            RAISE EXCEPTION 'Pedido com ID % não encontrado.', v_pedido_id;
        END IF;

        v_codigo_ref := v_pedido_codigo;

        UPDATE core_comercial.pedidos
        SET expected_start_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE id = v_pedido_id;

        UPDATE core_personal.worker_assignments
        SET planned_start_date = v_nova_data_inicio,
            start_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE pedido_id = v_pedido_id
          AND status != 'terminated';
        
        GET DIAGNOSTICS v_workers_updated = ROW_COUNT;

        UPDATE public.colaborador_por_pedido
        SET fechainiciopedido = v_nova_data_inicio,
            updated_at = NOW()
        WHERE codpedido = v_pedido_codigo;

        GET DIAGNOSTICS v_cpp_updated = ROW_COUNT;
        v_link := '/operacoes/pedidos/' || v_pedido_id;

    ELSIF v_origem_tipo IN ('reemplazo', 'relocation', 'reubicacion') THEN
        v_solicitud_id := v_origem_id;

        SELECT s.codigo, s.pedido_id, s.client_id, s.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
        INTO v_solicitud_codigo, v_pedido_id, v_client_id, v_client_site_id, v_client_name
        FROM core_operacoes.solicitudes_operativas s
        LEFT JOIN core_common.clients c ON c.id = s.client_id
        WHERE s.id = v_solicitud_id;

        IF v_solicitud_codigo IS NULL THEN
            RAISE EXCEPTION 'Solicitação com ID % não encontrada.', v_solicitud_id;
        END IF;

        v_codigo_ref := v_solicitud_codigo;

        UPDATE core_operacoes.solicitudes_operativas
        SET due_date = (v_nova_data_inicio::TEXT || 'T12:00:00.000Z')::TIMESTAMPTZ,
            updated_at = NOW()
        WHERE id = v_solicitud_id;

        -- Se for reubicação e tinha data de início de alojamento, atualiza também
        IF v_origem_tipo IN ('relocation', 'reubicacion') THEN
            UPDATE core_operacoes.solicitud_targets
            SET housing_start_date = CASE WHEN requires_housing THEN v_nova_data_inicio ELSE housing_start_date END,
                updated_at = NOW()
            WHERE solicitud_id = v_solicitud_id;
        END IF;

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

        IF v_origem_tipo = 'reemplazo' THEN
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
        END IF;

        UPDATE public.colaborador_por_pedido
        SET fechainiciopedido = v_nova_data_inicio,
            updated_at = NOW()
        WHERE codpedido = v_solicitud_codigo;

        GET DIAGNOSTICS v_cpp_updated = ROW_COUNT;
        v_link := '/operacoes/solicitudes/' || v_solicitud_id;

        -- Registrar na timeline da solicitação original também
        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id, solicitud_id, event_type, title, description, created_by
        ) VALUES (
            v_empresa_id,
            v_solicitud_id,
            'other',
            'Início Adiado',
            'Data prorrogada/adiada para ' || TO_CHAR(v_nova_data_inicio, 'DD/MM/YYYY') || '. Motivo: ' || COALESCE(v_motivo, 'Não informado'),
            v_user_id
        );
    END IF;

    -- Criar Solicitud Operativa 'order_postponement' e disparar Playbook ORDER_POSTPONEMENT
    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      AND (tipo IS NULL OR tipo != 'replacement');

    v_new_postpone_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        pedido_id, client_id, client_site_id, tipo, title, description, priority, status, reason, due_date, created_by
    ) VALUES (
        v_new_postpone_solicitud_id,
        v_empresa_id,
        v_new_postpone_codigo,
        'operacoes',
        v_origem_tipo,
        v_origem_id,
        v_pedido_id,
        v_client_id,
        v_client_site_id,
        'order_postponement',
        'Prorrogação de Início - ' || v_codigo_ref || ' (' || COALESCE(v_client_name, 'Cliente') || ') -> ' || TO_CHAR(v_nova_data_inicio, 'DD/MM/YYYY'),
        COALESCE(v_motivo, '') || CASE WHEN COALESCE(v_observacoes, '') != '' THEN ' | Obs: ' || v_observacoes ELSE '' END,
        'high',
        'pending',
        v_motivo,
        v_nova_data_inicio,
        v_user_id
    );

    IF v_solicitud_id IS NOT NULL THEN
        INSERT INTO core_operacoes.solicitud_targets (
            empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id,
            source_client_id, source_client_site_id, target_client_id, target_client_site_id,
            action_type, status, reason, notes
        )
        SELECT v_empresa_id, v_new_postpone_solicitud_id, st.source_assignment_id, st.source_worker_id, st.source_pedido_id,
               st.source_client_id, st.source_client_site_id, st.target_client_id, st.target_client_site_id,
               'postpone', 'pending', v_motivo, v_observacoes
        FROM core_operacoes.solicitud_targets st
        WHERE st.solicitud_id = v_solicitud_id;
    ELSIF v_pedido_id IS NOT NULL THEN
        INSERT INTO core_operacoes.solicitud_targets (
            empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id,
            source_client_id, source_client_site_id, action_type, status, reason, notes
        )
        SELECT v_empresa_id, v_new_postpone_solicitud_id, wa.id, wa.worker_id, wa.pedido_id,
               wa.client_id, wa.client_site_id, 'postpone', 'pending', v_motivo, v_observacoes
        FROM core_personal.worker_assignments wa
        WHERE wa.pedido_id = v_pedido_id AND wa.status NOT IN ('cancelled', 'terminated');
    END IF;

    PERFORM core_operacoes.iniciar_playbook(v_new_postpone_solicitud_id);

    -- Notificar departamentos
    SELECT id INTO v_dep_rh FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'RH';
    SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'DOCUMENTACION';
    SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'LOGISTICA';
    SELECT id INTO v_dep_com FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'COMERCIAL';

    v_msg := 'O início de ' || v_codigo_ref || ' (' || COALESCE(v_client_name, 'Cliente') || ') foi adiado para ' || TO_CHAR(v_nova_data_inicio, 'DD/MM/YYYY') || '. Tarefas operacionais foram geradas para os setores.';

    PERFORM core_common.create_notification(v_empresa_id, v_dep_rh,  NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_doc, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_log, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_com, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);

    RETURN jsonb_build_object(
        'success', true,
        'origem_tipo', v_origem_tipo,
        'codigo_ref', v_codigo_ref,
        'nova_data_inicio', v_nova_data_inicio,
        'solicitud_id', COALESCE(v_solicitud_id, v_new_postpone_solicitud_id),
        'postpone_solicitud_id', v_new_postpone_solicitud_id,
        'pedido_id', v_pedido_id,
        'workers_assignments_updated', v_workers_updated,
        'cpp_records_updated', v_cpp_updated
    );
END;
$function$;
