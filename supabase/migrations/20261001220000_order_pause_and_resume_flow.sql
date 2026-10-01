-- Migration: 20261001220000_order_pause_and_resume_flow.sql
-- Description: Adiciona suporte a Pausa e Retomada de Pedido na Torre de Controle,
--              atualizando constraints de status, tipos de solicitude e targets,
--              criando o playbook ORDER_PAUSE e as RPCs processar_pausa_pedido e processar_retomada_pedido.

BEGIN;

-- 1. Atualizar constraint de operational_status em core_comercial.pedidos para permitir 'paused'
ALTER TABLE core_comercial.pedidos DROP CONSTRAINT IF EXISTS pedidos_operational_status_check;
ALTER TABLE core_comercial.pedidos ADD CONSTRAINT pedidos_operational_status_check 
CHECK (operational_status IN ('pending_operations', 'partially_fulfilled', 'fulfilled', 'cancelled', 'paused'));

-- 2. Atualizar constraint de tipo em core_operacoes.solicitudes_operativas para permitir 'order_pause' e 'order_resume'
ALTER TABLE core_operacoes.solicitudes_operativas DROP CONSTRAINT IF EXISTS solicitudes_operativas_tipo_check;
ALTER TABLE core_operacoes.solicitudes_operativas ADD CONSTRAINT solicitudes_operativas_tipo_check 
CHECK (tipo IN (
    'new_order', 'replacement', 'relocation', 'technical_test', 'field_trial', 
    'offboarding', 'scope_change', 'cancellation', 'document_request', 
    'logistics_request', 'billing_request', 'incident', 'order_extension', 
    'order_termination', 'order_postponement', 'order_cancellation',
    'order_pause', 'order_resume'
));

-- 3. Atualizar constraint de action_type em core_operacoes.solicitud_targets para permitir 'pause' e 'resume'
ALTER TABLE core_operacoes.solicitud_targets DROP CONSTRAINT IF EXISTS solicitud_targets_action_type_check;
ALTER TABLE core_operacoes.solicitud_targets ADD CONSTRAINT solicitud_targets_action_type_check 
CHECK (action_type IN ('replace', 'relocate', 'test', 'offboard', 'extend', 'postpone', 'cancel', 'pause', 'resume'));

-- 4. Atualizar constraint de event_type em core_comercial.notification_emails para permitir 'pausa' e 'retomada'
ALTER TABLE core_comercial.notification_emails DROP CONSTRAINT IF EXISTS notification_emails_event_type_check;
ALTER TABLE core_comercial.notification_emails ADD CONSTRAINT notification_emails_event_type_check 
CHECK (event_type IN ('pedido', 'reemplazo', 'reubicacion', 'prueba', 'baja', 'prorrogacao', 'finalizacao', 'adiamento', 'cancelamento', 'pausa', 'retomada'));

-- 5. Seed do Playbook ORDER_PAUSE para todas as empresas ativas
DO $$
DECLARE
    r_emp RECORD;
    v_dep_rh UUID;
    v_dep_doc UUID;
    v_dep_log UUID;
    v_dep_com UUID;
    v_pb_id UUID;
BEGIN
    FOR r_emp IN SELECT id FROM core_common.empresas WHERE is_active = true OR is_active IS NULL LOOP
        -- Localizar departamentos da empresa
        SELECT id INTO v_dep_rh FROM core_operacoes.departments WHERE empresa_id = r_emp.id AND code = 'RH';
        IF v_dep_rh IS NULL THEN
            SELECT id INTO v_dep_rh FROM core_common.departments WHERE empresa_id = r_emp.id AND code = 'RH';
        END IF;

        SELECT id INTO v_dep_doc FROM core_operacoes.departments WHERE empresa_id = r_emp.id AND code = 'DOCUMENTACION';
        IF v_dep_doc IS NULL THEN
            SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = r_emp.id AND code = 'DOCUMENTACION';
        END IF;

        SELECT id INTO v_dep_log FROM core_operacoes.departments WHERE empresa_id = r_emp.id AND code = 'LOGISTICA';
        IF v_dep_log IS NULL THEN
            SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = r_emp.id AND code = 'LOGISTICA';
        END IF;

        SELECT id INTO v_dep_com FROM core_operacoes.departments WHERE empresa_id = r_emp.id AND code = 'COMERCIAL';
        IF v_dep_com IS NULL THEN
            SELECT id INTO v_dep_com FROM core_common.departments WHERE empresa_id = r_emp.id AND code = 'COMERCIAL';
        END IF;

        -- Inserir / Atualizar Playbook
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, status)
        VALUES (r_emp.id, 'ORDER_PAUSE', 'Pausa de Pedido / Order Pause', 'order_pause', 'active')
        ON CONFLICT (empresa_id, code) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status
        RETURNING id INTO v_pb_id;

        IF v_pb_id IS NOT NULL AND v_dep_rh IS NOT NULL THEN
            -- Inserir passos do playbook quando a empresa possui departamento de RH configurado
            INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, sort_order, required, blocking, default_due_days, status)
            VALUES
                (r_emp.id, v_pb_id, v_dep_rh,  'PAU_RH_01',  'Comunicar trabalhadores alocados sobre a pausa e suspensão do início', 10, true, true, 1, 'active'),
                (r_emp.id, v_pb_id, v_dep_rh,  'PAU_DP_01',  'Suspender trâmite de envio de Alta na Seguridade Social', 20, true, true, 1, 'active'),
                (r_emp.id, v_pb_id, v_dep_rh,  'PAU_REC_01', 'Congelar seleção e contratação para as vagas restantes deste pedido', 30, true, false, 1, 'active'),
                (r_emp.id, v_pb_id, COALESCE(v_dep_log, v_dep_rh), 'PAU_LOG_01', 'Suspender reservas de alojamento, passagens e despachos de EPI', 40, true, false, 1, 'active'),
                (r_emp.id, v_pb_id, COALESCE(v_dep_com, v_dep_rh), 'PAU_COM_01', 'Acompanhar alinhamento com cliente para definição da nova data de início', 50, true, false, 3, 'active')
            ON CONFLICT (playbook_id, code) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- 6. RPC para processar a Pausa de Pedido atomicamente
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

    -- 3. Criar a Solicitude Operativa de Pausa
    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, pedido_id, client_id, client_site_id,
        source_module, tipo, title, description, priority, status, created_by
    )
    VALUES (
        v_new_solicitud_id,
        v_empresa_id,
        v_new_solicitud_codigo,
        v_pedido_id,
        v_client_id,
        v_client_site_id,
        'operacoes',
        'order_pause',
        'Pausa de Pedido - ' || v_pedido_codigo || ' (' || v_client_name || ')',
        'Pausa solicitada pelo cliente. Motivo: ' || v_motivo || 
        CASE WHEN v_previsao_retomada != '' THEN ' | Previsão: ' || v_previsao_retomada ELSE '' END ||
        CASE WHEN v_observacoes != '' THEN ' | Detalhes: ' || v_observacoes ELSE '' END,
        'high',
        'pending',
        v_user_id
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
            solicitud_id, action_type, target_assignment_id, target_worker_id,
            target_job_function_id, target_job_function_name, status
        )
        VALUES (
            v_new_solicitud_id,
            'pause',
            r_assign.assignment_id,
            r_assign.worker_id,
            r_assign.job_function_id,
            r_assign.job_function_name_snapshot,
            'pending'
        );

        -- Registrar observação na alocação do colaborador
        UPDATE core_personal.worker_assignments
        SET notes = COALESCE(notes || E'\n', '') || '[Início Pausado em ' || to_char(NOW(), 'DD/MM/YYYY') || ']: ' || v_motivo,
            updated_at = NOW()
        WHERE id = r_assign.assignment_id;

        v_workers_affected := v_workers_affected + 1;
    END LOOP;

    -- 5. Disparar Playbook de Tarefas de Pausa
    PERFORM core_operacoes.iniciar_playbook(v_new_solicitud_id);

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

-- 7. RPC para processar a Retomada do Pedido (Reanudar Pedido com Nova Data)
CREATE OR REPLACE FUNCTION core_operacoes.processar_retomada_pedido(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    r_assign RECORD;
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
    UPDATE core_operacoes.solicitudes_operativas
    SET status = 'completed',
        completed_at = NOW(),
        description = COALESCE(description || E'\n', '') || '[Retomado em ' || to_char(NOW(), 'DD/MM/YYYY') || ' com início em ' || to_char(v_nova_data_inicio, 'DD/MM/YYYY') || ']',
        updated_at = NOW()
    WHERE pedido_id = v_pedido_id
      AND tipo = 'order_pause'
      AND status NOT IN ('completed', 'cancelled');

    -- Concluir também tarefas pendentes de solicitude de pausa
    UPDATE core_operacoes.solicitud_tareas
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
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
$$;

-- Permissões de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION core_operacoes.processar_pausa_pedido(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION core_operacoes.processar_retomada_pedido(jsonb) TO authenticated;

COMMIT;
