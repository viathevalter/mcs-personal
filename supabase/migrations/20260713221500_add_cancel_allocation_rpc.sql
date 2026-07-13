-- 1. Create the function to cancel a worker allocation dynamically and atomically
CREATE OR REPLACE FUNCTION core_personal.cancelar_alocacao_trabalhador(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_assignment_id UUID;
    v_reason TEXT;
    
    v_has_access BOOLEAN;
    v_worker_id UUID;
    v_pedido_item_id UUID;
    v_pedido_id UUID;
    v_empresa_id UUID;
    v_status_anterior VARCHAR;
    v_solicitud_id UUID;
    
    -- Pedido info
    v_pedido_codigo VARCHAR;
    
    -- Recalculo de Pedido
    v_total_items INT;
    v_fulfilled_items INT;
    v_new_operational_status VARCHAR;
BEGIN
    -- Extração do payload
    v_assignment_id := (payload->>'assignment_id')::uuid;
    v_reason := payload->>'reason';
    
    IF v_assignment_id IS NULL THEN
        RAISE EXCEPTION 'O campo assignment_id é obrigatório.';
    END IF;

    -- Buscar detalhes da alocação
    SELECT worker_id, pedido_item_id, pedido_id, empresa_id, status, solicitud_id
    INTO v_worker_id, v_pedido_item_id, v_pedido_id, v_empresa_id, v_status_anterior, v_solicitud_id
    FROM core_personal.worker_assignments
    WHERE id = v_assignment_id;

    IF v_pedido_item_id IS NULL THEN
        RAISE EXCEPTION 'Alocação não encontrada.';
    END IF;

    -- Buscar código do pedido principal para histórico nas observações
    SELECT codigo INTO v_pedido_codigo
    FROM core_comercial.pedidos
    WHERE id = v_pedido_id;

    -- Validação de Acesso (RH, Admin, etc)
    SELECT EXISTS (
        SELECT 1 FROM core_common.user_memberships
        WHERE user_id = v_user_id 
          AND empresa_id = v_empresa_id 
          AND is_active = true
          AND role IN ('admin', 'rh', 'super_admin', 'admin_rh', 'operador')
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Acesso negado. Apenas RH ou Operação (Admin) podem cancelar alocações.';
    END IF;

    -- Se já estiver cancelada, não faz nada
    IF v_status_anterior = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Alocação já está cancelada.');
    END IF;

    -- 1. Atualizar status da alocação para cancelled
    UPDATE core_personal.worker_assignments
    SET status = 'cancelled',
        notes = COALESCE(notes || E'\n', '') || 'Cancelado em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || COALESCE(' - Motivo: ' || v_reason, ' - Desistência do trabalhador')
    WHERE id = v_assignment_id;

    -- 2. Se a alocação estava ativa/planejada, reabrir a vaga correspondente no pedido item
    IF v_status_anterior IN ('planned', 'active', 'paused') AND v_solicitud_id IS NULL THEN
        UPDATE core_comercial.pedido_items
        SET quantity_fulfilled = GREATEST(0, quantity_fulfilled - 1)
        WHERE id = v_pedido_item_id;
    END IF;

    -- 3. Recalcular o status operacional do Pedido Principal
    SELECT COUNT(*), COUNT(CASE WHEN quantity_fulfilled >= quantity_requested THEN 1 END)
    INTO v_total_items, v_fulfilled_items
    FROM core_comercial.pedido_items
    WHERE pedido_id = v_pedido_id;

    IF v_fulfilled_items = 0 THEN
        v_new_operational_status := 'pending_operations';
    ELSIF v_fulfilled_items < v_total_items THEN
        v_new_operational_status := 'partially_fulfilled';
    ELSE
        v_new_operational_status := 'fulfilled';
    END IF;

    UPDATE core_comercial.pedidos
    SET operational_status = v_new_operational_status
    WHERE id = v_pedido_id;

    -- 4. Atualizar o cadastro geral do trabalhador
    UPDATE core_personal.workers
    SET status_trabajador = 'Desistiu',
        departure_reason = COALESCE(v_reason, 'Desistência do trabalhador'),
        notes = COALESCE(notes || E'\n', '') || 'Desistiu da contratação para o pedido ' || COALESCE(v_pedido_codigo, '') || ' em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || COALESCE(': ' || v_reason, '')
    WHERE id = v_worker_id;

    -- 5. Cancelar registros pendentes/com erro da Seguridade Social referentes a esta alocação/trabalhador
    UPDATE core_personal.seguridade_status
    SET status = 'cancelado',
        observacoes = COALESCE(observacoes || E'\n', '') || 'Alocação cancelada: ' || COALESCE(v_reason, 'Desistência do trabalhador')
    WHERE worker_id = v_worker_id 
      AND status IN ('pendente', 'erro');

    -- 6. Cancelar contratos pendentes de assinatura vinculados a esta alocação
    UPDATE core_personal.contracts
    SET status = 'cancelled'
    WHERE assignment_id = v_assignment_id 
      AND signed_at IS NULL;

    -- 7. Se a alocação era uma substituição (reemplazo) com target, reabrir a solicitude e o target
    IF v_solicitud_id IS NOT NULL THEN
        UPDATE core_operacoes.solicitud_targets
        SET status = 'pending',
            target_worker_id = NULL,
            target_assignment_id = NULL,
            completed_at = NULL
        WHERE solicitud_id = v_solicitud_id AND target_assignment_id = v_assignment_id;

        UPDATE core_operacoes.solicitudes
        SET status = 'in_progress',
            completed_at = NULL
        WHERE id = v_solicitud_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Alocação cancelada com sucesso.',
        'assignment_id', v_assignment_id,
        'worker_id', v_worker_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION core_personal.cancelar_alocacao_trabalhador(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION core_personal.cancelar_alocacao_trabalhador(jsonb) TO service_role;
