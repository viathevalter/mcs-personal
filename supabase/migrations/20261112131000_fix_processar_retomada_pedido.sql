-- Fix core_operacoes.processar_retomada_pedido:
-- Remove non-existent column completed_at from UPDATE on core_operacoes.solicitudes_operativas
-- Also mark solicitud_targets of order_pause as completed and log timeline entry

CREATE OR REPLACE FUNCTION core_operacoes.processar_retomada_pedido(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_pedido_id UUID;
    v_nova_data_inicio DATE;
    v_observacoes TEXT;
    
    v_empresa_id UUID;
    v_pedido_codigo VARCHAR;
    v_client_id UUID;
    v_client_name TEXT;
    v_workers_updated INT := 0;
    v_total_requested INT := 0;
    v_total_fulfilled INT := 0;
    v_novo_operational_status VARCHAR := 'pending_operations';
    
    r_sol RECORD;
BEGIN
    v_pedido_id := (payload->>'pedido_id')::uuid;
    v_nova_data_inicio := (payload->>'nova_data_inicio')::date;
    v_observacoes := TRIM(COALESCE(payload->>'observacoes', ''));

    IF v_pedido_id IS NULL THEN
        RAISE EXCEPTION 'O campo pedido_id é obrigatório.';
    END IF;

    IF v_nova_data_inicio IS NULL THEN
        RAISE EXCEPTION 'A nova data de início é obrigatória para reanudar o pedido.';
    END IF;

    -- Buscar dados do Pedido
    SELECT p.codigo, p.empresa_id, p.client_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
    INTO v_pedido_codigo, v_empresa_id, v_client_id, v_client_name
    FROM core_comercial.pedidos p
    LEFT JOIN core_common.clients c ON c.id = p.client_id
    WHERE p.id = v_pedido_id;

    IF v_pedido_codigo IS NULL THEN
        RAISE EXCEPTION 'Pedido com ID % não encontrado.', v_pedido_id;
    END IF;

    -- Calcular totais de vagas para definir o operational_status adequado
    SELECT COALESCE(SUM(quantity_requested), 0), COALESCE(SUM(quantity_fulfilled), 0)
    INTO v_total_requested, v_total_fulfilled
    FROM core_comercial.pedido_items
    WHERE pedido_id = v_pedido_id AND status != 'cancelled';

    IF v_total_requested > 0 AND v_total_fulfilled >= v_total_requested THEN
        v_novo_operational_status := 'fulfilled';
    ELSIF v_total_fulfilled > 0 THEN
        v_novo_operational_status := 'partially_fulfilled';
    ELSE
        v_novo_operational_status := 'pending_operations';
    END IF;

    -- 1. Atualizar Pedido: nova data e volta ao status operacional ativo
    UPDATE core_comercial.pedidos
    SET expected_start_date = v_nova_data_inicio,
        operational_status = v_novo_operational_status,
        notes = COALESCE(notes || E'\n\n', '') || '[RETOMADA DE PEDIDO - ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || E']\nNova Data de Início: ' || to_char(v_nova_data_inicio, 'DD/MM/YYYY') ||
                CASE WHEN v_observacoes != '' THEN E'\nObs: ' || v_observacoes ELSE '' END,
        updated_at = NOW()
    WHERE id = v_pedido_id;

    -- 2. Atualizar data prevista nas alocações ativas vinculadas a este pedido
    UPDATE core_personal.worker_assignments
    SET planned_start_date = v_nova_data_inicio,
        notes = COALESCE(notes || E'\n', '') || '[Retomado em ' || to_char(NOW(), 'DD/MM/YYYY') || ']: Nova data de início ' || to_char(v_nova_data_inicio, 'DD/MM/YYYY'),
        updated_at = NOW()
    WHERE pedido_id = v_pedido_id
      AND status NOT IN ('cancelled', 'terminated');
    GET DIAGNOSTICS v_workers_updated = ROW_COUNT;

    -- 3. Concluir eventuais solicitudes de 'order_pause' que estavam abertas para este pedido
    FOR r_sol IN
        SELECT id, empresa_id
        FROM core_operacoes.solicitudes_operativas
        WHERE pedido_id = v_pedido_id
          AND tipo = 'order_pause'
          AND status NOT IN ('completed', 'cancelled')
    LOOP
        UPDATE core_operacoes.solicitudes_operativas
        SET status = 'completed',
            description = COALESCE(description || E'\n', '') || '[Retomado em ' || to_char(NOW(), 'DD/MM/YYYY') || ' com início em ' || to_char(v_nova_data_inicio, 'DD/MM/YYYY') || ']',
            updated_at = NOW(),
            updated_by = v_user_id
        WHERE id = r_sol.id;

        UPDATE core_operacoes.solicitud_targets
        SET status = 'completed',
            updated_at = NOW(),
            updated_by = v_user_id
        WHERE solicitud_id = r_sol.id
          AND status NOT IN ('completed', 'cancelled');

        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id, solicitud_id, event_type, title, description, created_by
        )
        VALUES (
            r_sol.empresa_id,
            r_sol.id,
            'status_changed',
            'Pedido Retomado',
            'Pedido ' || v_pedido_codigo || ' retomado com nova data de início: ' || to_char(v_nova_data_inicio, 'DD/MM/YYYY') ||
            CASE WHEN v_observacoes != '' THEN '. Obs: ' || v_observacoes ELSE '' END,
            v_user_id
        );
    END LOOP;

    -- Concluir também tarefas pendentes de solicitude de pausa
    UPDATE core_operacoes.solicitud_tareas
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE solicitud_id IN (
        SELECT id FROM core_operacoes.solicitudes_operativas WHERE pedido_id = v_pedido_id AND tipo = 'order_pause'
    )
    AND status NOT IN ('completed', 'cancelled');

    RETURN jsonb_build_object(
        'success', true,
        'pedido_codigo', v_pedido_codigo,
        'nova_data_inicio', to_char(v_nova_data_inicio, 'YYYY-MM-DD'),
        'operational_status', v_novo_operational_status,
        'workers_updated', v_workers_updated
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.processar_retomada_pedido(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN core_operacoes.processar_retomada_pedido(payload);
END;
$function$;
