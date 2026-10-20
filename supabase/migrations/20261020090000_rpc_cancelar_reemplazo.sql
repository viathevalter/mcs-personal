-- Migration: 20261020090000_rpc_cancelar_reemplazo.sql
-- Description: RPC to cancel an operational replacement (reemplazo) from Torre de Controle

CREATE OR REPLACE FUNCTION core_operacoes.processar_cancelamento_reemplazo(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_solicitud_id UUID;
    v_target_id UUID;
    v_motivo TEXT;
    v_observacoes TEXT;

    v_solicitud RECORD;
    v_pedido RECORD;
    v_client_name TEXT;
    v_targets_cancelled INT := 0;
    v_tasks_cancelled INT := 0;
    r_target RECORD;
BEGIN
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_solicitud_id := (payload->>'solicitud_id')::uuid;
    v_target_id := (payload->>'target_id')::uuid;
    v_motivo := COALESCE(NULLIF(TRIM(payload->>'motivo'), ''), 'Desistência do cliente / Substituição não mais necessária');
    v_observacoes := COALESCE(NULLIF(TRIM(payload->>'observacoes'), ''), '');

    IF v_empresa_id IS NULL OR v_solicitud_id IS NULL THEN
        RAISE EXCEPTION 'empresa_id e solicitud_id são obrigatórios.';
    END IF;

    -- Buscar dados da solicitude de reemplazo
    SELECT so.id, so.codigo, so.pedido_id, so.client_id, so.status,
           COALESCE(c.trade_name, c.legal_name, 'Cliente') as client_name
    INTO v_solicitud
    FROM core_operacoes.solicitudes_operativas so
    LEFT JOIN core_common.clients c ON c.id = so.client_id
    WHERE so.id = v_solicitud_id;

    IF v_solicitud.id IS NULL THEN
        RAISE EXCEPTION 'Solicitação com ID % não encontrada.', v_solicitud_id;
    END IF;

    -- Cancelar targets pendentes ou em progresso
    FOR r_target IN
        SELECT id, source_worker_id, source_pedido_id, source_pedido_item_id, target_assignment_id
        FROM core_operacoes.solicitud_targets
        WHERE solicitud_id = v_solicitud_id
          AND (v_target_id IS NULL OR id = v_target_id)
          AND status IN ('pending', 'in_progress')
    LOOP
        UPDATE core_operacoes.solicitud_targets
        SET status = 'cancelled',
            notes = COALESCE(notes || E'\n', '') || '[CANCELADO EM ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || '] Motivo: ' || v_motivo || CASE WHEN v_observacoes != '' THEN E' | Obs: ' || v_observacoes ELSE '' END,
            updated_at = NOW()
        WHERE id = r_target.id;

        -- Se foi gerada uma alocação planejada que ainda não iniciou, cancelar também
        IF r_target.target_assignment_id IS NOT NULL THEN
            UPDATE core_personal.worker_assignments
            SET status = 'cancelled',
                notes = COALESCE(notes || E'\n', '') || 'Cancelado por cancelamento do Reemplazo ' || v_solicitud.codigo || ': ' || v_motivo,
                updated_at = NOW()
            WHERE id = r_target.target_assignment_id
              AND status IN ('planned', 'paused');
        END IF;

        v_targets_cancelled := v_targets_cancelled + 1;
    END LOOP;

    -- Marcar a solicitude como completed (ou cancelled se nenhum target foi atendido)
    UPDATE core_operacoes.solicitudes_operativas
    SET status = 'completed',
        description = COALESCE(description || E'\n', '') || '[Cancelamento registrado em ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || ']: ' || v_motivo || CASE WHEN v_observacoes != '' THEN E'\nObs: ' || v_observacoes ELSE '' END,
        updated_at = NOW()
    WHERE id = v_solicitud_id;

    -- Cancelar tarefas pendentes da solicitude
    UPDATE core_operacoes.solicitud_tareas
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE solicitud_id = v_solicitud_id
      AND status NOT IN ('completed', 'cancelled');
    GET DIAGNOSTICS v_tasks_cancelled = ROW_COUNT;

    -- Inserir evento na timeline
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
        'Reemplazo Cancelado',
        'Substituição cancelada por desistência/ajuste do cliente. Motivo: ' || v_motivo,
        v_user_id
    );

    -- Recalcular status do Pedido Comercial de origem se houver
    IF v_solicitud.pedido_id IS NOT NULL THEN
        -- Se todos os itens estão atendidos (ou sem reemplazos ativos pendentes), marcar pedido como fulfilled
        UPDATE core_comercial.pedido_items
        SET status = 'fulfilled',
            updated_at = NOW()
        WHERE pedido_id = v_solicitud.pedido_id
          AND quantity_fulfilled >= quantity_requested
          AND status != 'fulfilled';

        UPDATE core_comercial.pedidos
        SET operational_status = 'fulfilled',
            updated_at = NOW()
        WHERE id = v_solicitud.pedido_id
          AND operational_status != 'fulfilled'
          AND NOT EXISTS (
              SELECT 1 FROM core_comercial.pedido_items
              WHERE pedido_id = v_solicitud.pedido_id
                AND quantity_fulfilled < quantity_requested
          )
          AND NOT EXISTS (
              SELECT 1 FROM core_operacoes.solicitud_targets st
              JOIN core_operacoes.solicitudes_operativas so ON so.id = st.solicitud_id
              WHERE so.pedido_id = v_solicitud.pedido_id
                AND st.status IN ('pending', 'in_progress')
                AND st.action_type IN ('replace', 'replacement')
          );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Substituição (Reemplazo) cancelada com sucesso.',
        'solicitud_id', v_solicitud_id,
        'solicitud_codigo', v_solicitud.codigo,
        'targets_cancelled', v_targets_cancelled,
        'tasks_cancelled', v_tasks_cancelled
    );
END;
$$;

GRANT EXECUTE ON FUNCTION core_operacoes.processar_cancelamento_reemplazo(jsonb) TO anon, authenticated, service_role;

-- Expor também no schema public se houver chamadas via RPC direto
CREATE OR REPLACE FUNCTION public.processar_cancelamento_reemplazo(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN core_operacoes.processar_cancelamento_reemplazo(payload);
END;
$$;

GRANT EXECUTE ON FUNCTION public.processar_cancelamento_reemplazo(jsonb) TO anon, authenticated, service_role;
