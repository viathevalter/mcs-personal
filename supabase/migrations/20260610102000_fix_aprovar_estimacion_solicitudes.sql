-- Migration: 20260610102000_fix_aprovar_estimacion_solicitudes.sql
-- Description: Fix column/table mismatches in solicitudes_operativas insertion during estimacion approval.

BEGIN;

CREATE OR REPLACE FUNCTION core_comercial.aprovar_estimacion(p_estimacion_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' 
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
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;

    -- 1. Buscar a estimación base
    SELECT * INTO v_est
    FROM core_comercial.estimaciones
    WHERE id = p_estimacion_id;

    IF v_est.id IS NULL THEN
        RAISE EXCEPTION 'Estimación % não encontrada', p_estimacion_id;
    END IF;

    -- 1.5. Validar se é lead
    IF v_est.client_id IS NULL THEN
        RAISE EXCEPTION 'Não é possível aprovar uma estimación criada para um Lead. Por favor, converta o Lead num Cliente antes de aprovar.';
    END IF;

    -- 2. Validar Permissões (super_admin ou operador)
    IF NOT (
        core_common.has_role(v_est.empresa_id, 'super_admin')
        OR core_common.has_role(v_est.empresa_id, 'operador')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para aprovar estimación na empresa %', v_est.empresa_id;
    END IF;

    -- 3. Validar estado da estimación
    IF v_est.status NOT IN ('sent', 'review', 'approved', 'signed') THEN
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

    -- 8. Criar o Pedido
    INSERT INTO core_comercial.pedidos (
        empresa_id, codigo, source_estimacion_id, source_estimacion_version_id,
        client_id, client_site_id, country_id, order_type, commercial_status, operational_status,
        commercial_owner_id, responsible_id, approved_at, expected_start_date, expected_end_date,
        payment_terms, notes, total_cost_snapshot, total_revenue_snapshot, margin_percent_snapshot,
        work_lunes, work_martes, work_miercoles, work_jueves, work_viernes, work_sabado, work_domingo,
        hours_weekday, hours_sabado, hours_domingo, additional_revenues,
        hours_lunes, hours_martes, hours_miercoles, hours_jueves, hours_viernes,
        created_by
    ) VALUES (
        v_est.empresa_id, 
        v_pedido_codigo, 
        p_estimacion_id, 
        v_est.current_version_id,
        v_est.client_id, 
        v_est.client_site_id, 
        v_est.country_id,
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
        v_est.work_lunes,
        v_est.work_martes,
        v_est.work_miercoles,
        v_est.work_jueves,
        v_est.work_viernes,
        v_est.work_sabado,
        v_est.work_domingo,
        v_est.hours_weekday,
        v_est.hours_sabado,
        v_est.hours_domingo,
        v_est.additional_revenues,
        v_est.hours_lunes,
        v_est.hours_martes,
        v_est.hours_miercoles,
        v_est.hours_jueves,
        v_est.hours_viernes,
        v_user_id
    ) RETURNING id INTO v_pedido_id;

    -- 9. Clonar os Itens para o Pedido
    INSERT INTO core_comercial.pedido_items (
        empresa_id, pedido_id, source_estimacion_item_id, job_function_id, job_function_name_snapshot,
        description_snapshot, risk_level_snapshot, quantity_requested, quantity_fulfilled,
        planned_hours_per_day, planned_days_per_week, planned_total_hours,
        sell_rate_hour_snapshot, base_cost_hour_snapshot, margin_percent_snapshot,
        includes_housing, includes_transport, includes_epi, status,
        ss_regime, custom_lodging_rate, custom_epi_rate, custom_transport_rate,
        created_by
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
        ss_regime,
        custom_lodging_rate,
        custom_epi_rate,
        custom_transport_rate,
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

    -- 16. Obter total de tarefas operacionais geradas automaticamente
    SELECT COUNT(*) INTO v_tarefas_count
    FROM core_operacoes.solicitud_tareas
    WHERE solicitud_id = v_solicitud_id;

    -- 17. Retorno final com as informações geradas
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

GRANT EXECUTE ON FUNCTION core_comercial.aprovar_estimacion(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
