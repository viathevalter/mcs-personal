-- Migration: 20260916140000_order_cancellation_flow.sql
-- Description: Adiciona constraints para cancelamento de pedido, atualiza tipos de solicitude e evento de notificação, e cria a RPC processar_cancelamento_pedido para desmobilização completa e reversão de contratações.

BEGIN;

-- 1. Atualizar constraint de operational_status em core_comercial.pedidos para permitir 'cancelled'
ALTER TABLE core_comercial.pedidos DROP CONSTRAINT IF EXISTS pedidos_operational_status_check;
ALTER TABLE core_comercial.pedidos ADD CONSTRAINT pedidos_operational_status_check 
CHECK (operational_status IN ('pending_operations', 'partially_fulfilled', 'fulfilled', 'cancelled'));

-- 2. Atualizar constraint de tipo em core_operacoes.solicitudes_operativas para permitir 'order_cancellation'
ALTER TABLE core_operacoes.solicitudes_operativas DROP CONSTRAINT IF EXISTS solicitudes_operativas_tipo_check;
ALTER TABLE core_operacoes.solicitudes_operativas ADD CONSTRAINT solicitudes_operativas_tipo_check 
CHECK (tipo IN (
    'new_order', 'replacement', 'relocation', 'technical_test', 'field_trial', 
    'offboarding', 'scope_change', 'cancellation', 'document_request', 
    'logistics_request', 'billing_request', 'incident', 'order_extension', 
    'order_termination', 'order_postponement', 'order_cancellation'
));

-- 3. Atualizar constraint de action_type em core_operacoes.solicitud_targets para permitir 'cancel'
ALTER TABLE core_operacoes.solicitud_targets DROP CONSTRAINT IF EXISTS solicitud_targets_action_type_check;
ALTER TABLE core_operacoes.solicitud_targets ADD CONSTRAINT solicitud_targets_action_type_check 
CHECK (action_type IN ('replace', 'relocate', 'test', 'offboard', 'extend', 'postpone', 'cancel'));

-- 4. Atualizar constraint de event_type em core_comercial.notification_emails para permitir 'cancelamento'
ALTER TABLE core_comercial.notification_emails DROP CONSTRAINT IF EXISTS notification_emails_event_type_check;
ALTER TABLE core_comercial.notification_emails ADD CONSTRAINT notification_emails_event_type_check 
CHECK (event_type IN ('pedido', 'reemplazo', 'reubicacion', 'prueba', 'baja', 'prorrogacao', 'finalizacao', 'adiamento', 'cancelamento'));

-- 5. RPC para processar o cancelamento do pedido atomicamente
CREATE OR REPLACE FUNCTION core_operacoes.processar_cancelamento_pedido(payload jsonb)
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
    v_cancel_assignments BOOLEAN;
    v_worker_destination_status VARCHAR;
    
    v_pedido_codigo VARCHAR;
    v_client_id UUID;
    v_client_site_id UUID;
    v_client_name TEXT;
    
    v_initial_solicitud_id UUID;
    v_initial_solicitud_codigo VARCHAR;
    
    v_new_solicitud_id UUID := gen_random_uuid();
    v_new_solicitud_codigo VARCHAR;
    v_solicitudes_count INT;
    
    v_workers_cancelled INT := 0;
    v_tasks_cancelled INT := 0;
    v_items_cancelled INT := 0;
    
    r_assign RECORD;
    
    v_msg TEXT;
    v_link VARCHAR;
BEGIN
    -- Extrair parâmetros
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_pedido_id := (payload->>'pedido_id')::uuid;
    v_motivo := TRIM(COALESCE(payload->>'motivo', ''));
    v_observacoes := TRIM(COALESCE(payload->>'observacoes', ''));
    v_cancel_assignments := COALESCE((payload->>'cancel_assignments')::boolean, true);
    v_worker_destination_status := COALESCE(payload->>'worker_destination_status', 'Disponível');

    IF v_pedido_id IS NULL THEN
        RAISE EXCEPTION 'O campo pedido_id é obrigatório.';
    END IF;

    IF v_motivo = '' THEN
        RAISE EXCEPTION 'O motivo do cancelamento é obrigatório.';
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

    -- 1. Atualizar o Pedido para Cancelado
    UPDATE core_comercial.pedidos
    SET commercial_status = 'cancelled',
        operational_status = 'cancelled',
        notes = COALESCE(notes || E'

', '') || '[CANCELAMENTO DE PEDIDO - ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || E']
Motivo: ' || v_motivo || CASE WHEN v_observacoes != '' THEN E'
Obs: ' || v_observacoes ELSE '' END,
        updated_at = NOW()
    WHERE id = v_pedido_id;

    -- 2. Cancelar itens do pedido
    UPDATE core_comercial.pedido_items
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE pedido_id = v_pedido_id;
    GET DIAGNOSTICS v_items_cancelled = ROW_COUNT;

    -- 3. Localizar solicitude-mãe inicial (tipo 'new_order')
    SELECT id, codigo INTO v_initial_solicitud_id, v_initial_solicitud_codigo
    FROM core_operacoes.solicitudes_operativas
    WHERE pedido_id = v_pedido_id AND tipo = 'new_order'
    LIMIT 1;

    IF v_initial_solicitud_id IS NOT NULL THEN
        UPDATE core_operacoes.solicitudes_operativas
        SET status = 'cancelled',
            description = COALESCE(description || E'
', '') || '[Cancelada em ' || to_char(NOW(), 'DD/MM/YYYY') || ']: ' || v_motivo,
            updated_at = NOW()
        WHERE id = v_initial_solicitud_id;
    END IF;

    -- 4. Cancelar tarefas pendentes / em progresso / bloqueadas vinculadas às solicitudes deste pedido
    UPDATE core_operacoes.solicitud_tareas
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE solicitud_id IN (
        SELECT id FROM core_operacoes.solicitudes_operativas WHERE pedido_id = v_pedido_id
    )
    AND status NOT IN ('completed', 'cancelled');
    GET DIAGNOSTICS v_tasks_cancelled = ROW_COUNT;

    -- 5. Se cancel_assignments for true, cancelar alocações, contratos e seguridade social
    IF v_cancel_assignments THEN
        FOR r_assign IN
            SELECT wa.id AS assignment_id, wa.worker_id, wa.job_function_id, wa.job_function_name_snapshot,
                   w.nome AS worker_nome, w.cod_colab
            FROM core_personal.worker_assignments wa
            JOIN core_personal.workers w ON w.id = wa.worker_id
            WHERE wa.pedido_id = v_pedido_id
              AND wa.status NOT IN ('cancelled', 'terminated')
        LOOP
            -- 5.1 Cancelar alocação
            UPDATE core_personal.worker_assignments
            SET status = 'cancelled',
                notes = COALESCE(notes || E'
', '') || 'Cancelado em ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || ' - Pedido Cancelado pelo Cliente: ' || v_motivo,
                updated_at = NOW()
            WHERE id = r_assign.assignment_id;

            -- 5.2 Cancelar contratos não assinados
            UPDATE core_personal.contracts
            SET status = 'cancelled',
                updated_at = NOW()
            WHERE assignment_id = r_assign.assignment_id
              AND signed_at IS NULL;

            -- 5.3 Cancelar pendências de Seguridade Social
            UPDATE core_personal.seguridade_status
            SET status = 'cancelado',
                observacoes = COALESCE(observacoes || E'
', '') || 'Cancelado por cancelamento do pedido ' || v_pedido_codigo || ': ' || v_motivo,
                updated_at = NOW()
            WHERE worker_id = r_assign.worker_id
              AND status IN ('pendente', 'erro');

            -- 5.4 Atualizar cadastro do trabalhador liberando para o banco de talentos
            UPDATE core_personal.workers
            SET status_trabajador = CASE 
                    WHEN status_trabajador = 'Desistiu' THEN status_trabajador
                    ELSE COALESCE(v_worker_destination_status, 'Disponível')
                END,
                departure_reason = 'Pedido cancelado pelo cliente: ' || v_motivo,
                notes = COALESCE(notes || E'
', '') || 'Alocação cancelada por cancelamento do pedido ' || v_pedido_codigo || ' em ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || ': ' || v_motivo
            WHERE id = r_assign.worker_id
              AND status_trabajador = 'Pendente Ingresso';

            v_workers_cancelled := v_workers_cancelled + 1;
        END LOOP;

        -- Atualizar public.colaborador_por_pedido se houver
        UPDATE public.colaborador_por_pedido
        SET updated_at = NOW()
        WHERE codpedido = v_pedido_codigo;
    END IF;

    -- 6. Gerar código sequencial global para a solicitude de cancelamento
    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      AND (tipo IS NULL OR tipo != 'replacement');

    v_new_solicitud_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');

    -- 7. Criar solicitude de cancelamento na Torre de Controle
    INSERT INTO core_operacoes.solicitudes_operativas (
        id,
        empresa_id,
        codigo,
        source_module,
        source_entity_type,
        source_entity_id,
        tipo,
        title,
        description,
        priority,
        status,
        pedido_id,
        due_date,
        client_id,
        client_site_id,
        reason
    ) VALUES (
        v_new_solicitud_id,
        v_empresa_id,
        v_new_solicitud_codigo,
        'comercial',
        'pedido',
        v_pedido_id,
        'order_cancellation',
        'Cancelamento de Pedido - ' || v_pedido_codigo || ' - ' || v_client_name,
        'Cancelamento operacional efetuado pelo cliente. Motivo: ' || v_motivo || CASE WHEN v_observacoes != '' THEN E'
Obs: ' || v_observacoes ELSE '' END,
        'urgent',
        'completed',
        v_pedido_id,
        NOW(),
        v_client_id,
        v_client_site_id,
        v_motivo
    );

    -- 8. Registrar targets na solicitude de cancelamento para cada trabalhador desmobilizado
    INSERT INTO core_operacoes.solicitud_targets (
        empresa_id,
        solicitud_id,
        source_assignment_id,
        source_worker_id,
        source_pedido_id,
        source_client_id,
        source_client_site_id,
        action_type,
        status,
        reason,
        notes
    )
    SELECT 
        v_empresa_id,
        v_new_solicitud_id,
        wa.id,
        wa.worker_id,
        wa.pedido_id,
        wa.client_id,
        wa.client_site_id,
        'cancel',
        'completed',
        v_motivo,
        v_observacoes
    FROM core_personal.worker_assignments wa
    WHERE wa.pedido_id = v_pedido_id;

    -- 9. Registrar evento na timeline
    IF v_initial_solicitud_id IS NOT NULL THEN
        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id,
            solicitud_id,
            event_type,
            title,
            description,
            created_by
        ) VALUES (
            v_empresa_id,
            v_initial_solicitud_id,
            'other',
            'Pedido Cancelado pelo Cliente',
            'Cancelamento operacional executado. Motivo: ' || v_motivo,
            v_user_id
        );
    END IF;

    -- 10. Inserir notificações para os departamentos
    v_msg := 'O Pedido ' || v_pedido_codigo || ' (' || v_client_name || ') foi cancelado pelo cliente. Motivo: ' || v_motivo || '. Processos de admissão, contratos e logística devem ser suspensos imediatamente.';
    v_link := '/operacoes/pedidos/' || v_pedido_id;

    INSERT INTO core_common.notifications (empresa_id, user_id, department_id, title, message, type, severity, link_url)
    SELECT v_empresa_id, dm.user_id, d.id, 'Pedido Cancelado - ' || v_pedido_codigo, v_msg, 'incident', 'critical', v_link
    FROM core_common.departments d
    JOIN core_common.department_members dm ON dm.department_id = d.id AND dm.status = 'active'
    WHERE d.empresa_id = v_empresa_id
      AND d.code IN ('RH', 'LOGISTICA', 'DOCUMENTACION', 'COMERCIAL', 'OPERACOES');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pedido cancelado com sucesso.',
        'pedido_id', v_pedido_id,
        'pedido_codigo', v_pedido_codigo,
        'solicitud_id', v_new_solicitud_id,
        'solicitud_codigo', v_new_solicitud_codigo,
        'workers_cancelled', v_workers_cancelled,
        'tasks_cancelled', v_tasks_cancelled,
        'items_cancelled', v_items_cancelled
    );
END;
$$;

GRANT EXECUTE ON FUNCTION core_operacoes.processar_cancelamento_pedido(JSONB) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.processar_cancelamento_pedido(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN core_operacoes.processar_cancelamento_pedido(payload);
END;
$$;

GRANT EXECUTE ON FUNCTION public.processar_cancelamento_pedido(JSONB) TO authenticated, anon, service_role;

COMMIT;
