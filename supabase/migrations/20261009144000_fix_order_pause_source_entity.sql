-- Migration: 20261009144000_fix_order_pause_source_entity.sql
-- Description: Corrige a RPC processar_pausa_pedido adicionando source_entity_type e source_entity_id 
--              obrigatórios em core_operacoes.solicitudes_operativas e empresa_id em solicitud_targets.
--              Adiciona também wrappers no schema public para chamada via Supabase RPC.

CREATE OR REPLACE FUNCTION core_operacoes.processar_pausa_pedido(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_pedido_id UUID;
    v_motivo TEXT;
    v_observacoes TEXT;
    v_previsao_retomada TEXT;
    
    v_pedido_codigo VARCHAR;
    v_client_id UUID;
    v_client_site_id UUID;
    v_client_name TEXT;
    
    v_new_solicitud_id UUID := gen_random_uuid();
    v_new_solicitud_codigo VARCHAR;
    v_solicitudes_count INT;
    v_workers_affected INT := 0;
    
    r_assign RECORD;
BEGIN
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_pedido_id := (payload->>'pedido_id')::uuid;
    v_motivo := TRIM(COALESCE(payload->>'motivo', ''));
    v_observacoes := TRIM(COALESCE(payload->>'observacoes', ''));
    v_previsao_retomada := TRIM(COALESCE(payload->>'previsao_retomada', ''));

    IF v_pedido_id IS NULL THEN
        RAISE EXCEPTION 'O campo pedido_id é obrigatório.';
    END IF;

    IF v_motivo = '' THEN
        RAISE EXCEPTION 'O motivo da pausa é obrigatório.';
    END IF;

    -- Buscar dados do Pedido
    SELECT p.codigo, p.empresa_id, p.client_id, p.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
    INTO v_pedido_codigo, v_empresa_id, v_client_id, v_client_site_id, v_client_name
    FROM core_comercial.pedidos p
    LEFT JOIN core_common.clients c ON c.id = p.client_id
    WHERE p.id = v_pedido_id;

    IF v_pedido_codigo IS NULL THEN
        RAISE EXCEPTION 'Pedido com ID % não encontrado.', v_pedido_id;
    END IF;

    -- 1. Atualizar o Pedido para Pausado
    UPDATE core_comercial.pedidos
    SET operational_status = 'paused',
        notes = COALESCE(notes || E'\n\n', '') || '[PAUSA DE PEDIDO - ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || E']\nMotivo: ' || v_motivo || 
                CASE WHEN v_previsao_retomada != '' THEN E'\nPrevisão Retomada: ' || v_previsao_retomada ELSE '' END ||
                CASE WHEN v_observacoes != '' THEN E'\nObs: ' || v_observacoes ELSE '' END,
        updated_at = NOW()
    WHERE id = v_pedido_id;

    -- 2. Gerar código sequencial global para a solicitude de pausa
    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      AND (tipo IS NULL OR tipo != 'replacement');

    v_new_solicitud_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');

    -- 3. Criar a Solicitude Operativa de Pausa com source_entity_type e source_entity_id
    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, pedido_id, client_id, client_site_id,
        source_module, source_entity_type, source_entity_id,
        tipo, title, description, priority, status, created_by, reason, due_date
    )
    VALUES (
        v_new_solicitud_id,
        v_empresa_id,
        v_new_solicitud_codigo,
        v_pedido_id,
        v_client_id,
        v_client_site_id,
        'operacoes',
        'pedido',
        v_pedido_id,
        'order_pause',
        'Pausa de Pedido - ' || v_pedido_codigo || ' (' || v_client_name || ')',
        'Pausa solicitada pelo cliente. Motivo: ' || v_motivo || 
        CASE WHEN v_previsao_retomada != '' THEN ' | Previsão: ' || v_previsao_retomada ELSE '' END ||
        CASE WHEN v_observacoes != '' THEN ' | Detalhes: ' || v_observacoes ELSE '' END,
        'high',
        'pending',
        v_user_id,
        v_motivo,
        NOW()
    );

    -- 4. Registrar targets para cada trabalhador já alocado neste pedido
    FOR r_assign IN
        SELECT wa.id AS assignment_id, wa.worker_id, wa.job_function_id, wa.job_function_name_snapshot,
               w.nome AS worker_nome, w.cod_colab
        FROM core_personal.worker_assignments wa
        JOIN core_personal.workers w ON w.id = wa.worker_id
        WHERE wa.pedido_id = v_pedido_id
          AND wa.status NOT IN ('cancelled', 'terminated')
    LOOP
        INSERT INTO core_operacoes.solicitud_targets (
            empresa_id,
            solicitud_id,
            source_assignment_id,
            source_worker_id,
            source_pedido_id,
            source_client_id,
            source_client_site_id,
            target_assignment_id,
            target_worker_id,
            target_job_function_id,
            target_job_function_name,
            action_type,
            status,
            reason,
            notes
        )
        VALUES (
            v_empresa_id,
            v_new_solicitud_id,
            r_assign.assignment_id,
            r_assign.worker_id,
            v_pedido_id,
            v_client_id,
            v_client_site_id,
            r_assign.assignment_id,
            r_assign.worker_id,
            r_assign.job_function_id,
            r_assign.job_function_name_snapshot,
            'pause',
            'pending',
            v_motivo,
            v_observacoes
        );

        -- Registrar observação na alocação do colaborador
        UPDATE core_personal.worker_assignments
        SET notes = COALESCE(notes || E'\n', '') || '[Início Pausado em ' || to_char(NOW(), 'DD/MM/YYYY') || ']: ' || v_motivo,
            updated_at = NOW()
        WHERE id = r_assign.assignment_id;

        v_workers_affected := v_workers_affected + 1;
    END LOOP;

    -- 5. Disparar Playbook de Tarefas de Pausa se existir
    BEGIN
        PERFORM core_operacoes.iniciar_playbook(v_new_solicitud_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Aviso ao iniciar playbook para solicitude %: %', v_new_solicitud_id, SQLERRM;
    END;

    -- 6. Adicionar evento na timeline da solicitude
    INSERT INTO core_operacoes.solicitud_timeline (
        empresa_id, solicitud_id, event_type, title, description, created_by
    )
    VALUES (
        v_empresa_id,
        v_new_solicitud_id,
        'status_changed',
        'Pausa Registrada',
        'Pedido ' || v_pedido_codigo || ' pausado. Motivo: ' || v_motivo || '. Trabalhadores afetados: ' || v_workers_affected::TEXT,
        v_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'solicitud_id', v_new_solicitud_id,
        'solicitud_codigo', v_new_solicitud_codigo,
        'pedido_codigo', v_pedido_codigo,
        'workers_affected', v_workers_affected
    );
END;
$$;

-- Criar wrapper no schema public
CREATE OR REPLACE FUNCTION public.processar_pausa_pedido(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN core_operacoes.processar_pausa_pedido(payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.processar_retomada_pedido(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN core_operacoes.processar_retomada_pedido(payload);
END;
$$;

GRANT EXECUTE ON FUNCTION core_operacoes.processar_pausa_pedido(jsonb) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION core_operacoes.processar_retomada_pedido(jsonb) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.processar_pausa_pedido(jsonb) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.processar_retomada_pedido(jsonb) TO authenticated, anon, service_role;
