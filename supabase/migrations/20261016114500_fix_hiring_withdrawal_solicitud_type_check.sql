-- ========================================================================================
-- MIGRATION: FIX HIRING WITHDRAWAL & WORKER RESIGNATION IN SOLICITUDES_OPERATIVAS_TIPO_CHECK
-- Description:
-- 1. Updates check constraint solicitudes_operativas_tipo_check to allow 'hiring_withdrawal'
--    and 'worker_resignation' types.
-- 2. Updates core_personal.cancelar_alocacao_trabalhador to ensure:
--    - collision-free SOL codigo generation
--    - global super_admin access support
--    - exact recalculation of quantity_fulfilled on pedido_items from active assignments
--    - requires_replacement = false on the hiring_withdrawal target so it does not create
--      a duplicate Reemplazo card on top of the reopened pedido_items slot.
-- ========================================================================================

BEGIN;

ALTER TABLE core_operacoes.solicitudes_operativas
DROP CONSTRAINT IF EXISTS solicitudes_operativas_tipo_check;

ALTER TABLE core_operacoes.solicitudes_operativas
ADD CONSTRAINT solicitudes_operativas_tipo_check
CHECK (tipo::text = ANY (ARRAY[
    'new_order',
    'replacement',
    'relocation',
    'technical_test',
    'field_trial',
    'offboarding',
    'scope_change',
    'cancellation',
    'document_request',
    'logistics_request',
    'billing_request',
    'incident',
    'order_extension',
    'order_termination',
    'order_postponement',
    'order_cancellation',
    'order_pause',
    'order_resume',
    'hiring_withdrawal',
    'worker_resignation'
]::text[]));

CREATE OR REPLACE FUNCTION core_personal.cancelar_alocacao_trabalhador(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_assignment_id UUID;
    v_reason TEXT;
    
    v_has_access BOOLEAN;
    v_worker_id UUID;
    v_worker_nome TEXT;
    v_pedido_item_id UUID;
    v_pedido_id UUID;
    v_client_id UUID;
    v_client_site_id UUID;
    v_empresa_id UUID;
    v_status_anterior VARCHAR;
    v_solicitud_id UUID;
    
    v_pedido_codigo VARCHAR;
    v_total_items INT;
    v_fulfilled_items INT;
    v_new_operational_status VARCHAR;

    v_withdrawal_solicitud_id UUID := gen_random_uuid();
    v_withdrawal_codigo VARCHAR;
    v_solicitudes_count INT;
BEGIN
    v_assignment_id := (payload->>'assignment_id')::uuid;
    v_reason := payload->>'reason';
    
    IF v_assignment_id IS NULL THEN
        RAISE EXCEPTION 'O campo assignment_id é obrigatório.';
    END IF;

    SELECT wa.worker_id, w.nome, wa.pedido_item_id, wa.pedido_id, wa.client_id, wa.client_site_id, wa.empresa_id, wa.status, wa.solicitud_id
    INTO v_worker_id, v_worker_nome, v_pedido_item_id, v_pedido_id, v_client_id, v_client_site_id, v_empresa_id, v_status_anterior, v_solicitud_id
    FROM core_personal.worker_assignments wa
    LEFT JOIN core_personal.workers w ON w.id = wa.worker_id
    WHERE wa.id = v_assignment_id;

    IF v_worker_id IS NULL THEN
        RAISE EXCEPTION 'Alocação não encontrada.';
    END IF;

    IF v_pedido_id IS NOT NULL THEN
        SELECT codigo, COALESCE(v_client_id, client_id), COALESCE(v_client_site_id, client_site_id)
        INTO v_pedido_codigo, v_client_id, v_client_site_id
        FROM core_comercial.pedidos
        WHERE id = v_pedido_id;
    END IF;

    SELECT (
        public.get_my_role() = 'super_admin'
        OR EXISTS (
            SELECT 1 FROM core_common.user_memberships
            WHERE user_id = v_user_id 
              AND empresa_id = v_empresa_id 
              AND is_active = true
              AND role IN ('admin', 'rh', 'super_admin', 'admin_rh', 'operador')
        )
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Acesso negado. Apenas RH ou Operação (Admin) podem cancelar alocações.';
    END IF;

    IF v_status_anterior = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Alocação já está cancelada.');
    END IF;

    -- 1. Atualizar status da alocação para cancelled
    UPDATE core_personal.worker_assignments
    SET status = 'cancelled',
        notes = COALESCE(notes || E'\n', '') || 'Cancelado em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || COALESCE(' - Motivo: ' || v_reason, ' - Desistência do trabalhador')
    WHERE id = v_assignment_id;

    -- 2. Se a alocação era um reemplazo, reabrir o target original
    IF v_solicitud_id IS NOT NULL THEN
        UPDATE core_operacoes.solicitud_targets
        SET status = 'pending',
            target_worker_id = NULL,
            target_assignment_id = NULL,
            updated_at = now()
        WHERE target_assignment_id = v_assignment_id;

        UPDATE core_operacoes.solicitudes_operativas
        SET status = 'in_progress',
            updated_at = now()
        WHERE id = v_solicitud_id;
    END IF;

    -- 3. Recalcular a vaga correspondente no pedido item com base nas alocações ativas/planejadas reais
    IF v_pedido_item_id IS NOT NULL THEN
        UPDATE core_comercial.pedido_items pi
        SET quantity_fulfilled = (
            SELECT COUNT(*)::int
            FROM core_personal.worker_assignments wa
            WHERE wa.pedido_item_id = pi.id
              AND wa.status IN ('planned', 'active', 'paused')
        )
        WHERE pi.id = v_pedido_item_id;
    END IF;

    -- 4. Recalcular o status operacional do Pedido Principal
    IF v_pedido_id IS NOT NULL THEN
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
        SET operational_status = v_new_operational_status,
            updated_at = now()
        WHERE id = v_pedido_id;
    END IF;

    -- 5. Atualizar o cadastro geral do trabalhador
    UPDATE core_personal.workers
    SET status_trabajador = 'Desistiu',
        departure_reason = COALESCE(v_reason, 'Desistência do trabalhador'),
        notes = COALESCE(notes || E'\n', '') || 'Desistiu da contratação em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || COALESCE(': ' || v_reason, '')
    WHERE id = v_worker_id;

    -- 6. Cancelar registros pendentes da Seguridade Social
    UPDATE core_personal.seguridade_status
    SET status = 'cancelado',
        observacoes = COALESCE(observacoes || E'\n', '') || 'Alocação cancelada: ' || COALESCE(v_reason, 'Desistência do trabalhador')
    WHERE worker_id = v_worker_id 
      AND status IN ('pendente', 'erro');

    -- 7. Cancelar contratos pendentes de assinatura vinculados a esta alocação
    UPDATE core_personal.contracts
    SET status = 'cancelled'
    WHERE assignment_id = v_assignment_id 
      AND signed_at IS NULL;

    -- 8. Criar Solicitud Operativa 'hiring_withdrawal' e acionar o Playbook HIRING_WITHDRAWAL
    -- IMPORTANTE: requires_replacement = false pois a vaga já foi reaberta diretamente no pedido_items!
    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      AND (tipo IS NULL OR tipo != 'replacement');

    LOOP
        v_solicitudes_count := v_solicitudes_count + 1;
        v_withdrawal_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_solicitudes_count::TEXT, 6, '0');
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM core_operacoes.solicitudes_operativas WHERE codigo = v_withdrawal_codigo
        );
    END LOOP;

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        pedido_id, pedido_item_id, client_id, client_site_id, target_worker_id, target_assignment_id,
        tipo, title, description, priority, status, reason, due_date, created_by
    ) VALUES (
        v_withdrawal_solicitud_id,
        v_empresa_id,
        v_withdrawal_codigo,
        'rh',
        'worker_assignment',
        v_assignment_id,
        v_pedido_id,
        v_pedido_item_id,
        v_client_id,
        v_client_site_id,
        v_worker_id,
        v_assignment_id,
        'hiring_withdrawal',
        'Desistência na Contratação - ' || COALESCE(v_worker_nome, 'Trabalhador') || COALESCE(' (' || v_pedido_codigo || ')', ''),
        'Trabalhador desistiu na etapa de contratação/assinatura de contrato. Motivo: ' || COALESCE(v_reason, 'Não informado'),
        'urgent',
        'pending',
        v_reason,
        CURRENT_DATE + 1,
        v_user_id
    );

    INSERT INTO core_operacoes.solicitud_targets (
        empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id, source_pedido_item_id,
        source_client_id, source_client_site_id, action_type, requires_replacement, status, reason
    ) VALUES (
        v_empresa_id, v_withdrawal_solicitud_id, v_assignment_id, v_worker_id, v_pedido_id, v_pedido_item_id,
        v_client_id, v_client_site_id, 'offboard', false, 'completed', v_reason
    );

    PERFORM core_operacoes.iniciar_playbook(v_withdrawal_solicitud_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Alocação cancelada e tarefas de desistência distribuídas aos setores.',
        'assignment_id', v_assignment_id,
        'worker_id', v_worker_id,
        'solicitud_id', v_withdrawal_solicitud_id
    );
END;
$function$;

COMMIT;
