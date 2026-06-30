-- Migration: 20260618100000_fix_solicitud_targets_and_add_pedido_language.sql
-- Description: Fixes typo in criar_solicitud_operativa_com_targets RPC, adds document_language to core_comercial.pedidos and updates core_comercial.notification_emails event_type check constraint.

BEGIN;

-- 1. Adicionar coluna document_language à tabela core_comercial.pedidos
ALTER TABLE core_comercial.pedidos 
ADD COLUMN IF NOT EXISTS document_language VARCHAR(10) DEFAULT 'pt' 
CHECK (document_language IN ('pt', 'es', 'en', 'it', 'fr'));

-- 2. Atualizar a função core_comercial.aprovar_estimacion para copiar o document_language
CREATE OR REPLACE FUNCTION core_comercial.aprovar_estimacion(p_estimacion_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- Prática de segurança
AS $$
DECLARE
    v_user_id UUID;
    v_est RECORD;
    v_items_count INT;
    v_pedido_count INT;
    v_pedido_id UUID;
    v_pedido_codigo VARCHAR;
    v_solicitudes_count INT;
    v_solicitud_id UUID;
    v_solicitud_codigo VARCHAR;
    v_tarefas_count INT;
BEGIN
    -- Identifica o usuário via JWT
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;

    -- 1. Buscar a estimación base
    SELECT * INTO v_est
    FROM core_comercial.estimaciones
    WHERE id = p_estimacion_id;

    IF v_est.id IS NULL THEN
        RAISE EXCEPTION 'Estimación % não encontrada', p_estimacion_id;
    END IF;

    -- 2. Validar Permissões (super_admin ou operador)
    IF NOT (
        core_common.has_role(v_est.empresa_id, 'super_admin')
        OR core_common.has_role(v_est.empresa_id, 'operador')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para aprovar estimación na empresa %', v_est.empresa_id;
    END IF;

    -- 3. Validar estado da estimación
    IF v_est.status NOT IN ('sent', 'review', 'approved') THEN
        RAISE EXCEPTION 'A estimación está no status %, não pode ser convertida para pedido.', v_est.status;
    END IF;

    -- 4. Validar versão atual e local (client_site_id)
    IF v_est.current_version_id IS NULL THEN
        RAISE EXCEPTION 'A estimación não possui uma versão atual (current_version_id é nulo).';
    END IF;

    IF v_est.client_site_id IS NULL THEN
        RAISE EXCEPTION 'A estimación precisa ter uma obra/local antes de ser convertida em pedido.';
    END IF;

    -- 5. Validar itens
    SELECT COUNT(*) INTO v_items_count
    FROM core_comercial.estimacion_items
    WHERE estimacion_version_id = v_est.current_version_id;

    IF v_items_count = 0 THEN
        RAISE EXCEPTION 'A versão atual da estimación não possui nenhum item.';
    END IF;

    -- 6. Evitar duplicidade de Pedido
    SELECT id INTO v_pedido_id
    FROM core_comercial.pedidos
    WHERE source_estimacion_id = p_estimacion_id;

    IF v_pedido_id IS NOT NULL THEN
        RAISE EXCEPTION 'Esta estimación já foi convertida no pedido (ID: %).', v_pedido_id;
    END IF;

    -- 7. Gerar código do Pedido (PED-YYYY-000001)
    SELECT COUNT(*) INTO v_pedido_count
    FROM core_comercial.pedidos
    WHERE empresa_id = v_est.empresa_id 
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
      
    v_pedido_codigo := 'PED-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_pedido_count + 1)::TEXT, 6, '0');

    -- 8. Criar o Pedido (incluindo document_language)
    INSERT INTO core_comercial.pedidos (
        empresa_id, codigo, source_estimacion_id, source_estimacion_version_id,
        client_id, client_site_id, order_type, commercial_status, operational_status,
        commercial_owner_id, responsible_id, approved_at, expected_start_date, expected_end_date,
        payment_terms, notes, total_cost_snapshot, total_revenue_snapshot, margin_percent_snapshot,
        document_language, created_by
    ) VALUES (
        v_est.empresa_id, 
        v_pedido_codigo, 
        p_estimacion_id, 
        v_est.current_version_id,
        v_est.client_id, 
        v_est.client_site_id, 
        CASE WHEN v_est.estimation_type IN ('new_allocation', 'expansion') THEN v_est.estimation_type ELSE 'new_allocation' END, 
        'active', 
        'pending_operations',
        v_est.commercial_owner_id, 
        v_est.commercial_owner_id, 
        NOW(), 
        v_est.expected_start_date, 
        v_est.expected_end_date,
        v_est.payment_terms, 
        v_est.general_notes, 
        v_est.total_estimated_cost, 
        v_est.total_estimated_revenue, 
        v_est.estimated_margin_percent,
        COALESCE(v_est.document_language, 'pt'),
        v_user_id
    ) RETURNING id INTO v_pedido_id;

    -- 9. Clonar os Itens para o Pedido
    INSERT INTO core_comercial.pedido_items (
        empresa_id, pedido_id, source_estimacion_item_id, job_function_id, job_function_name_snapshot,
        description_snapshot, risk_level_snapshot, quantity_requested, quantity_fulfilled,
        planned_hours_per_day, planned_days_per_week, planned_total_hours,
        sell_rate_hour_snapshot, base_cost_hour_snapshot, margin_percent_snapshot,
        includes_housing, includes_transport, includes_epi, status, created_by
    )
    SELECT
        v_est.empresa_id, 
        v_pedido_id, 
        id, 
        job_function_id, 
        job_function_name_snapshot,
        description, 
        risk_level_snapshot, 
        quantity, 
        0,
        planned_hours_per_day, 
        planned_days_per_week, 
        planned_total_hours,
        sell_rate_hour, 
        base_cost_hour, 
        margin_percent,
        includes_housing, 
        includes_transport, 
        includes_epi, 
        'pending', 
        v_user_id
    FROM core_comercial.estimacion_items
    WHERE estimacion_version_id = v_est.current_version_id;

    -- 10. Atualizar a Estimación para Approved
    UPDATE core_comercial.estimaciones
    SET status = 'approved', updated_at = NOW(), updated_by = v_user_id
    WHERE id = p_estimacion_id;

    -- 11. Registrar Evento do Pedido
    INSERT INTO core_comercial.pedido_events (
        empresa_id, pedido_id, event_type, title, description, new_values, created_by
    ) VALUES (
        v_est.empresa_id, 
        v_pedido_id, 
        'other', 
        'Pedido criado a partir de estimación', 
        'Convertido a partir da Estimación ' || COALESCE(v_est.codigo, p_estimacion_id::text), 
        jsonb_build_object('estimacion_id', p_estimacion_id, 'version_id', v_est.current_version_id), 
        v_user_id
    );

    -- 12. Registrar Histórico de Status
    INSERT INTO core_comercial.pedido_status_history (
        empresa_id, pedido_id, new_commercial_status, new_operational_status, reason, created_by
    ) VALUES (
        v_est.empresa_id, v_pedido_id, 'active', 'pending_operations', 'Pedido criado a partir de estimación aprovada', v_user_id
    );

    -- 13. Gerar código da Solicitud Operativa (SOL-YYYY-000001)
    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE empresa_id = v_est.empresa_id 
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
      
    v_solicitud_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');

    -- 14. Criar Solicitud Operativa apontando para o Pedido
    INSERT INTO core_operacoes.solicitudes_operativas (
        empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        pedido_id, tipo, title, description, priority, status,
        client_id, client_site_id, requested_by, requested_at, created_by
    ) VALUES (
        v_est.empresa_id, 
        v_solicitud_codigo, 
        'comercial', 
        'pedido', 
        v_pedido_id,
        v_pedido_id, 
        'new_order', 
        'Nuevo pedido / Mobilización inicial', 
        'Solicitud generada automáticamente a partir del pedido ' || v_pedido_codigo, 
        'normal', 
        'pending',
        v_est.client_id, 
        v_est.client_site_id, 
        v_user_id, 
        NOW(), 
        v_user_id
    ) RETURNING id INTO v_solicitud_id;

    -- 15. Iniciar a Malha Operacional (Playbook)
    PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);

    -- Conta as tarefas geradas
    SELECT COUNT(*) INTO v_tarefas_count
    FROM core_operacoes.solicitud_tareas
    WHERE solicitud_id = v_solicitud_id;

    -- 16. Retornar Resultado Estruturado
    RETURN json_build_object(
        'status', 'success',
        'pedido_id', v_pedido_id,
        'pedido_codigo', v_pedido_codigo,
        'solicitud_id', v_solicitud_id,
        'solicitud_codigo', v_solicitud_codigo,
        'tarefas_geradas', v_tarefas_count
    );
END;
$$;

REVOKE ALL ON FUNCTION core_comercial.aprovar_estimacion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core_comercial.aprovar_estimacion(UUID) TO authenticated;


-- 3. Atualizar restrição check da tabela core_comercial.notification_emails
ALTER TABLE core_comercial.notification_emails DROP CONSTRAINT IF EXISTS notification_emails_event_type_check;
ALTER TABLE core_comercial.notification_emails ADD CONSTRAINT notification_emails_event_type_check CHECK (event_type IN ('pedido', 'reemplazo', 'reubicacion', 'prueba', 'baja'));


-- 4. Recriar RPC criar_solicitud_operativa_com_targets corrigindo typo de type -> tipo
CREATE OR REPLACE FUNCTION core_operacoes.criar_solicitud_operativa_com_targets(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_empresa_id uuid;
    v_solicitud_id uuid;
    v_type varchar;
    v_title varchar;
    v_description text;
    v_priority varchar;
    v_target jsonb;
    v_solicitud_codigo varchar;
    v_solicitudes_count int;
    
    -- Variáveis auxiliares para os targets
    v_source_assignment_id uuid;
    v_source_worker_id uuid;
    v_source_pedido_id uuid;
    v_source_pedido_item_id uuid;
    v_source_client_id uuid;
    v_source_client_site_id uuid;
    v_action_type varchar;
    v_reason text;
    v_notes text;
BEGIN
    -- 1. Extrair cabeçalho
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_type := payload->>'type';
    v_title := payload->>'title';
    v_description := payload->>'description';
    v_priority := COALESCE(payload->>'priority', 'normal');

    IF v_empresa_id IS NULL OR v_type IS NULL OR v_title IS NULL THEN
        RAISE EXCEPTION 'Payload inválido: empresa_id, type e title são obrigatórios no cabeçalho.';
    END IF;

    -- 1.5 Gerar código da Solicitud Operativa (SOL-YYYY-000001)
    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE empresa_id = v_empresa_id 
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
      
    v_solicitud_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');
    v_solicitud_id := gen_random_uuid();

    -- 2. Criar a Solicitação Operativa (Cabeçalho) livre (sem pedido amarrado obrigatoriamente)
    INSERT INTO core_operacoes.solicitudes_operativas (
        id,
        empresa_id,
        codigo,
        source_module,
        source_entity_type,
        source_entity_id,
        tipo, -- CORRIGIDO: de type para tipo
        title,
        description,
        priority,
        status,
        pedido_id 
    ) VALUES (
        v_solicitud_id,
        v_empresa_id,
        v_solicitud_codigo,
        'operacoes',
        'solicitud',
        v_solicitud_id,
        v_type,
        v_title,
        v_description,
        v_priority,
        'pending',
        (payload->>'origin_pedido_id')::uuid
    );

    -- 3. Inserir os Targets (Alvos)
    IF payload->'targets' IS NOT NULL AND jsonb_array_length(payload->'targets') > 0 THEN
        FOR v_target IN SELECT * FROM jsonb_array_elements(payload->'targets')
        LOOP
            v_source_assignment_id := (v_target->>'source_assignment_id')::uuid;
            v_source_worker_id := (v_target->>'source_worker_id')::uuid;
            v_source_pedido_id := (v_target->>'source_pedido_id')::uuid;
            v_source_pedido_item_id := (v_target->>'source_pedido_item_id')::uuid;
            v_source_client_id := (v_target->>'source_client_id')::uuid;
            v_source_client_site_id := (v_target->>'source_client_site_id')::uuid;
            
            v_action_type := v_target->>'action_type';
            v_reason := v_target->>'reason';
            v_notes := v_target->>'notes';

            IF v_action_type IS NULL THEN
                RAISE EXCEPTION 'action_type é obrigatório em todos os targets.';
            END IF;

            INSERT INTO core_operacoes.solicitud_targets (
                empresa_id,
                solicitud_id,
                source_assignment_id,
                source_worker_id,
                source_pedido_id,
                source_pedido_item_id,
                source_client_id,
                source_client_site_id,
                action_type,
                reason,
                notes,
                status
            ) VALUES (
                v_empresa_id,
                v_solicitud_id,
                v_source_assignment_id,
                v_source_worker_id,
                v_source_pedido_id,
                v_source_pedido_item_id,
                v_source_client_id,
                v_source_client_site_id,
                v_action_type,
                v_reason,
                v_notes,
                'pending'
            );
        END LOOP;
    END IF;

    -- 4. Iniciar o Playbook para esta nova Solicitação
    PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);

    -- Atualiza o status do cabeçalho para 'pending'
    UPDATE core_operacoes.solicitudes_operativas
    SET status = 'pending'
    WHERE id = v_solicitud_id;

    RETURN v_solicitud_id;
END;
$$;

COMMIT;
