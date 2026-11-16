-- Migration: 20261116184500_add_source_end_date_to_replacements_seguridade_and_alerts.sql
-- Description:
--   1. Adds mandatory source_end_date (last working day of the replaced worker) to core_operacoes.solicitud_targets.
--   2. Updates core_operacoes.criar_solicitud_operativa_com_targets to require/store source_end_date per target,
--      propagate end_date to core_personal.worker_assignments, and annotate open cards in core_personal.seguridade_status.
--   3. Updates core_personal.fn_get_workers_operational_alerts to surface "Trabalha até DD/MM/YYYY" and use source_end_date as alerta_data.
--   4. Updates core_personal.get_real_seguridade_status to expose reemplazo_codigo and reemplazo_end_date and prioritize source_end_date on baixa.

BEGIN;

-- 1. Add source_end_date to solicitud_targets
ALTER TABLE core_operacoes.solicitud_targets
ADD COLUMN IF NOT EXISTS source_end_date DATE;

-- 2. Update criar_solicitud_operativa_com_targets
CREATE OR REPLACE FUNCTION core_operacoes.criar_solicitud_operativa_com_targets(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_empresa_id uuid;
    v_solicitud_id uuid;
    v_origin_pedido_id uuid;
    v_type varchar;
    v_title varchar;
    v_description text;
    v_reason_header text;
    v_priority varchar;
    v_due_date timestamptz;
    v_client_id uuid;
    v_client_site_id uuid;
    v_pergunta_respuesta jsonb;
    v_target jsonb;
    v_solicitud_codigo varchar;
    v_existing_sol_codigo varchar;
    v_worker_name text;
    v_max_seq int;
    v_solicitudes_count int;
    
    -- Aux variables for targets
    v_source_assignment_id uuid;
    v_source_worker_id uuid;
    v_source_pedido_id uuid;
    v_source_pedido_item_id uuid;
    v_source_client_id uuid;
    v_source_client_site_id uuid;
    v_source_end_date date;
    v_effective_client_id uuid;
    v_seg_note text;
    
    -- Target variables
    v_target_client_id uuid;
    v_target_client_site_id uuid;
    v_target_job_function_id uuid;
    v_target_job_function_name varchar;
    v_requires_housing boolean;
    v_housing_start_date date;
    v_housing_end_date date;
    v_requires_replacement boolean;
    
    v_action_type varchar;
    v_reason text;
    v_notes text;
BEGIN
    -- 1. Extrair cabeçalho
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_origin_pedido_id := (payload->>'origin_pedido_id')::uuid;
    v_type := payload->>'type';
    v_title := payload->>'title';
    v_description := payload->>'description';
    v_reason_header := payload->>'reason';
    v_priority := COALESCE(payload->>'priority', 'normal');
    v_due_date := (payload->>'due_date')::timestamptz;
    v_client_id := (payload->>'client_id')::uuid;
    v_client_site_id := (payload->>'client_site_id')::uuid;
    v_pergunta_respuesta := payload->'pergunta_respuesta';

    IF v_empresa_id IS NULL OR v_type IS NULL OR v_title IS NULL THEN
        RAISE EXCEPTION 'Payload inválido: empresa_id, type e title são obrigatórios no cabeçalho.';
    END IF;

    -- 1.5 Gerar código da Solicitud Operativa (SOL-YYYY-000001 ou R-YYYY-000NNN) de forma GLOBAL
    IF v_type = 'replacement' THEN
        SELECT COALESCE(MAX(
            NULLIF(REGEXP_REPLACE(codigo, '^R-\d{4}-', ''), '')::integer
        ), 220) INTO v_max_seq
        FROM core_operacoes.solicitudes_operativas
        WHERE tipo = 'replacement'
          AND codigo ~ '^R-\d{4}-\d+$';
          
        v_solicitud_codigo := 'R-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_max_seq + 1)::TEXT, 6, '0');
    ELSE
        SELECT COUNT(*) INTO v_solicitudes_count
        FROM core_operacoes.solicitudes_operativas
        WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
          AND (tipo IS NULL OR tipo != 'replacement');
          
        v_solicitud_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');
    END IF;

    v_solicitud_id := gen_random_uuid();

    -- 2. Criar a Solicitação Operativa (Cabeçalho)
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
        reason,
        priority,
        status,
        pedido_id,
        due_date,
        client_id,
        client_site_id,
        pergunta_respuesta,
        created_by
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
        v_reason_header,
        v_priority,
        'pending',
        v_origin_pedido_id,
        v_due_date,
        v_client_id,
        v_client_site_id,
        v_pergunta_respuesta,
        v_user_id
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
            v_source_end_date := NULLIF(TRIM(COALESCE(v_target->>'source_end_date', '')), '')::date;
            
            v_target_client_id := (v_target->>'target_client_id')::uuid;
            v_target_client_site_id := (v_target->>'target_client_site_id')::uuid;
            v_target_job_function_id := (v_target->>'target_job_function_id')::uuid;
            v_target_job_function_name := v_target->>'target_job_function_name';
            v_requires_housing := COALESCE((v_target->>'requires_housing')::boolean, false);
            v_housing_start_date := (v_target->>'housing_start_date')::date;
            v_housing_end_date := (v_target->>'housing_end_date')::date;
            v_requires_replacement := COALESCE((v_target->>'requires_replacement')::boolean, true);
            
            v_action_type := v_target->>'action_type';
            v_reason := v_target->>'reason';
            v_notes := v_target->>'notes';

            IF v_action_type IS NULL THEN
                RAISE EXCEPTION 'action_type é obrigatório em todos os targets.';
            END IF;

            IF v_type = 'replacement' AND v_action_type = 'replace' AND v_source_end_date IS NULL THEN
                RAISE EXCEPTION 'Informe a data de encerramento de trabalho (até quando vai trabalhar) para todos os trabalhadores substituídos.';
            END IF;

            v_effective_client_id := COALESCE(v_source_client_id, v_client_id);

            -- 3.1 Auto-vincular pedido/item original caso venha de alocação virtual ou baixa recente sem pedido_id explícito
            IF v_source_worker_id IS NOT NULL
               AND (v_source_pedido_id IS NULL OR v_source_pedido_item_id IS NULL)
               AND v_effective_client_id IS NOT NULL
            THEN
                SELECT
                    COALESCE(v_source_assignment_id, wa.id),
                    COALESCE(v_source_pedido_id, wa.pedido_id),
                    COALESCE(v_source_pedido_item_id, wa.pedido_item_id),
                    COALESCE(v_source_client_site_id, wa.client_site_id)
                INTO
                    v_source_assignment_id,
                    v_source_pedido_id,
                    v_source_pedido_item_id,
                    v_source_client_site_id
                FROM core_personal.worker_assignments wa
                JOIN core_comercial.pedidos p ON p.id = wa.pedido_id
                WHERE wa.worker_id = v_source_worker_id
                  AND wa.pedido_id IS NOT NULL
                  AND (wa.client_id = v_effective_client_id OR p.client_id = v_effective_client_id)
                ORDER BY
                    CASE WHEN wa.status IN ('active', 'planned', 'paused') THEN 0 ELSE 1 END,
                    wa.created_at DESC
                LIMIT 1;

                IF v_source_pedido_id IS NOT NULL AND v_origin_pedido_id IS NULL THEN
                    v_origin_pedido_id := v_source_pedido_id;
                    UPDATE core_operacoes.solicitudes_operativas
                    SET pedido_id = COALESCE(pedido_id, v_source_pedido_id),
                        client_site_id = COALESCE(client_site_id, v_source_client_site_id)
                    WHERE id = v_solicitud_id;
                END IF;
            END IF;

            -- 3.2 Bloquear duplicidade de Reemplazo pendente para o mesmo trabalhador no mesmo cliente/pedido
            IF v_type = 'replacement' AND v_action_type = 'replace' AND v_source_worker_id IS NOT NULL THEN
                SELECT s.codigo, w.nome
                INTO v_existing_sol_codigo, v_worker_name
                FROM core_operacoes.solicitud_targets st
                JOIN core_operacoes.solicitudes_operativas s ON s.id = st.solicitud_id
                LEFT JOIN core_personal.workers w ON w.id = st.source_worker_id
                WHERE st.solicitud_id != v_solicitud_id
                  AND st.source_worker_id = v_source_worker_id
                  AND st.action_type = 'replace'
                  AND st.status IN ('pending', 'in_progress')
                  AND s.status NOT IN ('cancelled', 'completed')
                  AND (
                      (v_source_pedido_id IS NOT NULL AND st.source_pedido_id = v_source_pedido_id)
                      OR (v_source_pedido_id IS NULL AND v_effective_client_id IS NOT NULL AND COALESCE(st.source_client_id, s.client_id) = v_effective_client_id)
                  )
                LIMIT 1;

                IF v_existing_sol_codigo IS NOT NULL THEN
                    RAISE EXCEPTION 'Já existe um Reemplazo em aberto (%) para o trabalhador % neste cliente/pedido.', v_existing_sol_codigo, COALESCE(v_worker_name, '');
                END IF;

                -- Se havia uma Baja anterior pendente com requires_replacement = true para o mesmo trabalhador,
                -- desativa o flag na Baja para que a vaga não seja contada em dobro em Contratação
                UPDATE core_operacoes.solicitud_targets st
                SET requires_replacement = false,
                    updated_at = NOW()
                FROM core_operacoes.solicitudes_operativas s
                WHERE s.id = st.solicitud_id
                  AND st.source_worker_id = v_source_worker_id
                  AND st.action_type = 'offboard'
                  AND st.requires_replacement = true
                  AND st.status IN ('pending', 'in_progress')
                  AND s.status != 'cancelled'
                  AND (
                      (v_source_pedido_id IS NOT NULL AND st.source_pedido_id = v_source_pedido_id)
                      OR (v_effective_client_id IS NOT NULL AND COALESCE(st.source_client_id, s.client_id) = v_effective_client_id)
                  );
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
                source_end_date,
                target_client_id,
                target_client_site_id,
                target_job_function_id,
                target_job_function_name,
                requires_housing,
                housing_start_date,
                housing_end_date,
                requires_replacement,
                action_type,
                reason,
                notes,
                status,
                created_by
            ) VALUES (
                v_empresa_id,
                v_solicitud_id,
                v_source_assignment_id,
                v_source_worker_id,
                v_source_pedido_id,
                v_source_pedido_item_id,
                v_source_client_id,
                v_source_client_site_id,
                v_source_end_date,
                v_target_client_id,
                v_target_client_site_id,
                v_target_job_function_id,
                v_target_job_function_name,
                v_requires_housing,
                v_housing_start_date,
                v_housing_end_date,
                v_requires_replacement,
                v_action_type,
                v_reason,
                v_notes,
                'pending',
                v_user_id
            );

            -- 3.3 Propagar a data fim do trabalhador substituído para worker_assignments e Seguridade Social
            IF v_type = 'replacement' AND v_action_type = 'replace' AND v_source_end_date IS NOT NULL THEN
                v_seg_note := '⚠️ REEMPLAZO (' || v_solicitud_codigo || '): Trabalha até ' || TO_CHAR(v_source_end_date, 'DD/MM/YYYY');

                IF v_source_assignment_id IS NOT NULL THEN
                    UPDATE core_personal.worker_assignments
                    SET end_date = v_source_end_date,
                        planned_end_date = v_source_end_date,
                        notes = CASE
                            WHEN COALESCE(notes, '') ILIKE '%' || v_solicitud_codigo || '%' THEN notes
                            ELSE COALESCE(NULLIF(notes, '') || E'\n', '') || v_seg_note
                        END,
                        updated_at = NOW()
                    WHERE id = v_source_assignment_id
                      AND status IN ('planned', 'active', 'paused');
                END IF;

                IF v_source_worker_id IS NOT NULL THEN
                    UPDATE core_personal.seguridade_status
                    SET lembrete_postit = CASE
                            WHEN COALESCE(lembrete_postit, '') ILIKE '%' || v_solicitud_codigo || '%' THEN lembrete_postit
                            ELSE COALESCE(NULLIF(lembrete_postit, '') || ' | ', '') || v_seg_note
                        END,
                        data_efetiva = CASE
                            WHEN tipo_evento::text = 'baixa' AND data_efetiva IS NULL THEN v_source_end_date
                            ELSE data_efetiva
                        END,
                        updated_at = NOW()
                    WHERE worker_id = v_source_worker_id
                      AND status = 'pendente';
                END IF;
            END IF;
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
$function$;

GRANT EXECUTE ON FUNCTION core_operacoes.criar_solicitud_operativa_com_targets(jsonb) TO authenticated;

-- 3. Update fn_get_workers_operational_alerts to surface source_end_date ("Trabalha até DD/MM/YYYY")
CREATE OR REPLACE FUNCTION core_personal.fn_get_workers_operational_alerts()
RETURNS TABLE(
  worker_id uuid,
  alerta_tipo text,
  alerta_logistica boolean,
  alerta_label text,
  alerta_codigo text,
  alerta_cliente text,
  alerta_data date,
  alerta_pendencia text,
  alerta_alojamento text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_operacoes', 'core_common', 'core_logistics'
AS $function$
  WITH latest_solicitud AS (
    SELECT DISTINCT ON (COALESCE(st.source_worker_id, s.target_worker_id))
      COALESCE(st.source_worker_id, s.target_worker_id) AS worker_id,
      s.codigo,
      s.tipo,
      s.status AS sol_status,
      st.status AS target_status,
      st.source_end_date,
      COALESCE(st.source_end_date, s.due_date::date, s.created_at::date) AS sol_date,
      s.created_at AS sol_created_at,
      cl.trade_name AS cliente_nome,
      COALESCE(st.reason, s.reason, s.description) AS motivo
    FROM core_operacoes.solicitudes_operativas s
    LEFT JOIN core_operacoes.solicitud_targets st ON st.solicitud_id = s.id
    LEFT JOIN core_common.clients cl ON cl.id = COALESCE(st.source_client_id, s.client_id)
    WHERE s.tipo IN ('offboarding', 'order_termination', 'order_cancellation', 'replacement', 'hiring_withdrawal')
      AND s.status NOT IN ('rejected', 'cancelled')
      AND COALESCE(st.status, '') NOT IN ('rejected', 'cancelled')
      AND COALESCE(st.source_worker_id, s.target_worker_id) IS NOT NULL
      AND COALESCE(st.source_end_date, s.due_date::date, s.created_at::date) >= DATE '2026-10-15'
    ORDER BY COALESCE(st.source_worker_id, s.target_worker_id), s.created_at DESC
  ),
  worker_newer_alloc AS (
    SELECT DISTINCT
      w.id AS worker_id
    FROM core_personal.workers w
    JOIN latest_solicitud ls ON ls.worker_id = w.id
    JOIN core_personal.worker_assignments wa ON wa.worker_id = w.id
    LEFT JOIN core_comercial.pedidos p ON p.id = wa.pedido_id
    LEFT JOIN core_common.clients c ON c.id = COALESCE(wa.client_id, p.client_id)
    WHERE wa.status IN ('active', 'planned', 'paused')
      AND (wa.end_date IS NULL OR wa.end_date > ls.sol_date)
      AND (
        COALESCE(wa.start_date, wa.planned_start_date) > ls.sol_date
        OR wa.created_at > ls.sol_created_at + INTERVAL '1 hour'
        OR (ls.cliente_nome IS NOT NULL AND c.trade_name IS NOT NULL AND UPPER(TRIM(c.trade_name)) <> UPPER(TRIM(ls.cliente_nome)))
      )
  ),
  worker_any_active_alloc AS (
    SELECT DISTINCT wa.worker_id
    FROM core_personal.worker_assignments wa
    WHERE wa.status IN ('active', 'planned', 'paused')
      AND (wa.end_date IS NULL OR wa.end_date >= CURRENT_DATE)
  ),
  latest_ended_alloc AS (
    SELECT DISTINCT ON (wa.worker_id)
      wa.worker_id,
      wa.status AS alloc_status,
      wa.start_date,
      wa.end_date,
      wa.updated_at,
      COALESCE(c.trade_name, c.legal_name, p.codigo) AS alloc_cliente,
      p.codigo AS pedido_codigo
    FROM core_personal.worker_assignments wa
    LEFT JOIN core_comercial.pedidos p ON p.id = wa.pedido_id
    LEFT JOIN core_common.clients c ON c.id = COALESCE(wa.client_id, p.client_id)
    WHERE (
      wa.status IN ('completed', 'terminated', 'replaced', 'cancelled')
      OR wa.end_date IS NOT NULL
    )
    AND COALESCE(wa.end_date, wa.updated_at::date) >= DATE '2026-10-15'
    ORDER BY wa.worker_id, COALESCE(wa.end_date, wa.updated_at::date) DESC, wa.updated_at DESC
  ),
  active_housing AS (
    SELECT DISTINCT ON (a.worker_id)
      a.worker_id,
      UPPER(COALESCE(NULLIF(TRIM(a.tipo_alojamento::text), ''), 'EMPRESA')) AS tipo_alojamento,
      COALESCE(NULLIF(TRIM(al.nome), ''), NULLIF(TRIM(a.cliente_obra_nome), ''), NULLIF(TRIM(a.project_name), ''), 'Alojamento Ativo') AS alojamento_nome,
      a.data_inicio::date AS check_in_date
    FROM core_logistics.alocacoes a
    LEFT JOIN core_logistics.alojamentos al ON al.id::text = a.alojamento_id::text
    WHERE LOWER(COALESCE(a.status::text, '')) <> 'checkout'
      AND a.worker_id IS NOT NULL
    ORDER BY a.worker_id, a.data_inicio DESC NULLS LAST, a.created_at DESC NULLS LAST
  ),
  recent_baja_checkout AS (
    SELECT DISTINCT ON (a.worker_id)
      a.worker_id,
      UPPER(COALESCE(NULLIF(TRIM(a.tipo_alojamento::text), ''), 'EMPRESA')) AS tipo_alojamento,
      COALESCE(NULLIF(TRIM(al.nome), ''), NULLIF(TRIM(a.cliente_obra_nome), ''), NULLIF(TRIM(a.project_name), ''), 'Alojamento') AS alojamento_nome,
      a.data_fim::date AS check_out_date,
      a.motivo_checkout,
      a.created_at AS checkout_created_at
    FROM core_logistics.alocacoes a
    LEFT JOIN core_logistics.alojamentos al ON al.id::text = a.alojamento_id::text
    WHERE LOWER(COALESCE(a.status::text, '')) = 'checkout'
      AND a.data_fim IS NOT NULL
      AND a.data_fim::date >= DATE '2026-10-15'
      AND (
        a.motivo_checkout ILIKE '%Baja%'
        OR a.motivo_checkout ILIKE '%Baixa%'
        OR a.motivo_checkout ILIKE '%Fin de Contrato%'
        OR a.motivo_checkout ILIKE '%Desist%'
      )
    ORDER BY a.worker_id, a.data_fim DESC
  ),
  last_manual_ack AS (
    SELECT
      h.worker_id,
      MAX(h.created_at) AS last_ack_at
    FROM core_personal.worker_status_history h
    WHERE h.change_type IN ('TRABALHADOR', 'SEGURIDADE', 'CONFIRMACAO_STATUS')
      AND COALESCE(h.comments, '') NOT LIKE 'Ativação Automática pelo Cron%'
      AND COALESCE(h.comments, '') NOT LIKE 'Confirmado automaticamente pelo cron%'
      AND COALESCE(h.comments, '') NOT LIKE 'Reflexo Automático%'
    GROUP BY h.worker_id
  ),
  evaluated AS (
    SELECT
      w.id AS worker_id,
      w.status_trabajador,
      w.status_seguridad,
      w.data_ingresso,
      w.data_baixa,
      (waa.worker_id IS NOT NULL) AS has_active_alloc,
      (wna.worker_id IS NOT NULL) AS has_newer_alloc_after_sol,
      ls.tipo AS sol_tipo,
      ls.codigo AS sol_codigo,
      ls.source_end_date,
      ls.sol_date,
      ls.sol_created_at,
      ls.cliente_nome AS sol_cliente,
      lea.alloc_status,
      lea.end_date AS alloc_end_date,
      lea.updated_at AS alloc_updated_at,
      lea.alloc_cliente,
      lea.pedido_codigo,
      ah.tipo_alojamento AS active_housing_tipo,
      ah.alojamento_nome AS active_housing_nome,
      ah.check_in_date AS active_housing_date,
      rbc.check_out_date AS checkout_baja_date,
      rbc.motivo_checkout,
      rbc.alojamento_nome AS checkout_aloj_nome,
      (
        w.status_trabajador ILIKE 'Inativ%'
        OR w.status_trabajador ILIKE 'Inactiv%'
        OR w.status_trabajador ILIKE '%Desist%'
        OR w.status_trabajador ILIKE '%Deslig%'
        OR w.status_trabajador ILIKE '%Baixa%'
        OR w.status_trabajador ILIKE '%Baja%'
      ) AND NOT (
        w.status_trabajador ILIKE '%Baja Medica%'
        OR w.status_trabajador ILIKE '%Baja Médica%'
      ) AS is_trab_closed,
      (
        (w.status_seguridad ILIKE '%Baixa%' OR w.status_seguridad ILIKE '%Baja%' OR w.status_seguridad ILIKE '%Anulad%')
        AND NOT (w.status_seguridad ILIKE '%Pendente%' OR w.status_seguridad ILIKE '%Pendiente%')
      ) AS is_seg_closed,
      (
        lma.last_ack_at IS NOT NULL
        AND lma.last_ack_at >= TIMESTAMPTZ '2026-11-04 08:00:00+00'
        AND lma.last_ack_at + INTERVAL '30 seconds' >= GREATEST(
          COALESCE(ls.sol_created_at, TIMESTAMPTZ '1970-01-01 00:00:00+00'),
          COALESCE(lea.updated_at, TIMESTAMPTZ '1970-01-01 00:00:00+00')
        )
      ) AS is_manually_acknowledged,
      (
        ah.worker_id IS NOT NULL
        AND NOT (
          w.status_trabajador ILIKE '%Afast%'
          OR w.status_trabajador ILIKE '%Licen%'
          OR w.status_trabajador ILIKE '%Invalidez%'
          OR w.status_trabajador ILIKE '%Baja Medica%'
          OR w.status_trabajador ILIKE '%Baja Médica%'
        )
        AND (
          w.status_trabajador ILIKE 'Inativ%'
          OR w.status_trabajador ILIKE 'Inactiv%'
          OR w.status_trabajador ILIKE '%Baixa%'
          OR w.status_trabajador ILIKE '%Baja%'
          OR w.status_trabajador ILIKE '%Deslig%'
          OR w.status_trabajador ILIKE '%Desist%'
          OR (
            (w.status_seguridad ILIKE '%Baixa%' OR w.status_seguridad ILIKE '%Baja%')
            AND NOT (w.status_seguridad ILIKE '%Pendente%' OR w.status_seguridad ILIKE '%Pendiente%')
          )
        )
      ) AS has_logistica_alert
    FROM core_personal.workers w
    LEFT JOIN worker_any_active_alloc waa ON waa.worker_id = w.id
    LEFT JOIN latest_solicitud ls ON ls.worker_id = w.id
    LEFT JOIN worker_newer_alloc wna ON wna.worker_id = w.id
    LEFT JOIN latest_ended_alloc lea ON lea.worker_id = w.id
    LEFT JOIN active_housing ah ON ah.worker_id::text = w.id::text
    LEFT JOIN recent_baja_checkout rbc ON rbc.worker_id::text = w.id::text
    LEFT JOIN last_manual_ack lma ON lma.worker_id = w.id
    WHERE w.deleted_at IS NULL
  ),
  classified AS (
    SELECT
      e.*,
      CASE
        WHEN NOT (e.is_trab_closed AND e.is_seg_closed)
          AND NOT e.is_manually_acknowledged
          AND (
            (e.sol_tipo = 'hiring_withdrawal' AND NOT e.has_newer_alloc_after_sol AND NOT e.has_active_alloc)
            OR (e.status_trabajador ILIKE '%Desist%' AND NOT e.has_active_alloc)
          ) THEN 'desistiu'

        WHEN NOT (e.is_trab_closed AND e.is_seg_closed)
          AND NOT e.is_manually_acknowledged
          AND (
            (e.sol_tipo = 'replacement' AND NOT e.has_newer_alloc_after_sol)
            OR (e.alloc_status = 'replaced' AND NOT e.has_active_alloc)
          ) THEN 'reemplazo'

        WHEN NOT (e.is_trab_closed AND e.is_seg_closed)
          AND NOT e.is_manually_acknowledged
          AND (
            (e.sol_tipo IN ('offboarding', 'order_termination', 'order_cancellation') AND NOT e.has_newer_alloc_after_sol)
            OR (e.alloc_status IN ('completed', 'terminated') AND NOT e.has_active_alloc)
            OR (e.checkout_baja_date IS NOT NULL AND NOT e.has_active_alloc AND (e.data_ingresso IS NULL OR e.checkout_baja_date >= e.data_ingresso))
            OR (e.status_seguridad ILIKE '%Pendente Baixa%' OR e.status_seguridad ILIKE '%Pendiente Baja%')
          ) THEN 'baixa'

        WHEN e.has_logistica_alert THEN 'logistica'

        ELSE NULL
      END AS computed_tipo
    FROM evaluated e
  )
  SELECT
    c.worker_id,
    c.computed_tipo AS alerta_tipo,
    c.has_logistica_alert AS alerta_logistica,
    CASE c.computed_tipo
      WHEN 'baixa' THEN
        CASE
          WHEN c.sol_tipo = 'order_termination' THEN 'Fim de Obra / Encerramento'
          WHEN c.sol_tipo = 'offboarding' THEN 'Baixa Solicitada'
          WHEN c.checkout_baja_date IS NOT NULL THEN 'Checkout por Baixa (Logística)'
          ELSE 'Baixa / Fim de Alocação'
        END
      WHEN 'reemplazo' THEN
        CASE
          WHEN c.source_end_date IS NOT NULL THEN 'Substituído • Trabalha até ' || TO_CHAR(c.source_end_date, 'DD/MM/YYYY')
          ELSE 'Substituído (Reemplazo)'
        END
      WHEN 'desistiu' THEN 'Desistência de Ingresso'
      WHEN 'logistica' THEN 'Alojado em Logística (Inativo RH)'
      ELSE NULL
    END AS alerta_label,
    COALESCE(c.sol_codigo, c.pedido_codigo, c.active_housing_tipo) AS alerta_codigo,
    COALESCE(c.sol_cliente, c.alloc_cliente, c.active_housing_nome, c.checkout_aloj_nome) AS alerta_cliente,
    COALESCE(c.source_end_date, c.sol_date, c.alloc_end_date, c.checkout_baja_date, c.data_baixa, c.active_housing_date) AS alerta_data,
    CASE
      WHEN c.computed_tipo = 'desistiu' THEN
        CASE
          WHEN NOT (c.status_trabajador ILIKE '%Desist%') AND NOT c.is_seg_closed THEN 'Mudar p/ Desistiu + Baixa Seguridade'
          WHEN NOT (c.status_trabajador ILIKE '%Desist%') THEN 'Mudar Status p/ Desistiu'
          ELSE 'Revisar / Dar Baixa Seguridade'
        END
      WHEN c.computed_tipo = 'reemplazo' AND c.source_end_date IS NOT NULL AND c.source_end_date >= CURRENT_DATE THEN
        'Trabalha até ' || TO_CHAR(c.source_end_date, 'DD/MM/YYYY') || ' → Inativar + Dar Baixa Seguridade'
      WHEN c.computed_tipo IN ('baixa', 'reemplazo') THEN
        CASE
          WHEN NOT c.is_trab_closed AND NOT c.is_seg_closed THEN 'Inativar + Dar Baixa Seguridade'
          WHEN NOT c.is_trab_closed THEN 'Atualizar Status p/ Inativo'
          ELSE 'Revisar / Dar Baixa Seguridade'
        END
      WHEN c.computed_tipo = 'logistica' OR c.has_logistica_alert THEN
        'Fazer Checkout no Alojamento (' || COALESCE(c.active_housing_tipo, 'Logística') || ')'
      ELSE NULL
    END AS alerta_pendencia,
    CASE
      WHEN c.active_housing_tipo IS NOT NULL THEN c.active_housing_tipo || ': ' || COALESCE(c.active_housing_nome, 'Alojamento')
      ELSE NULL
    END AS alerta_alojamento
  FROM classified c
  WHERE c.computed_tipo IS NOT NULL OR c.has_logistica_alert = true;
$function$;

-- 4. Update get_real_seguridade_status to expose reemplazo_codigo & reemplazo_end_date and use source_end_date on baixa
CREATE OR REPLACE FUNCTION core_personal.get_real_seguridade_status(p_empresa_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_operacoes', 'core_common'
AS $function$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(
      json_build_object(
        'id', ss.id,
        'empresa_id', ss.empresa_id,
        'worker_id', w.id,
        'tipo_evento', ss.tipo_evento,
        'status', ss.status,
        'origem', ss.origem,
        'origem_cliente_nome', COALESCE(
            ss.origem_cliente_nome,
            (
                SELECT vwa.cliente_nombre 
                FROM core_personal.vw_worker_allocations vwa 
                WHERE vwa.cod_colab = w.cod_colab 
                  AND vwa.fechasalidatrabajador IS NULL
                ORDER BY vwa.inserted_at DESC 
                LIMIT 1
            ),
            (
                SELECT vwa.cliente_nombre 
                FROM core_personal.vw_worker_allocations vwa 
                WHERE vwa.cod_colab = w.cod_colab 
                ORDER BY vwa.inserted_at DESC 
                LIMIT 1
            ),
            w.cliente
        ),
        'origem_contratante', COALESCE(
            ss.origem_contratante,
            (
                SELECT vwa.contratante 
                FROM core_personal.vw_worker_allocations vwa 
                WHERE vwa.cod_colab = w.cod_colab 
                  AND vwa.fechasalidatrabajador IS NULL
                ORDER BY vwa.inserted_at DESC 
                LIMIT 1
            ),
            (
                SELECT vwa.contratante 
                FROM core_personal.vw_worker_allocations vwa 
                WHERE vwa.cod_colab = w.cod_colab 
                ORDER BY vwa.inserted_at DESC 
                LIMIT 1
            ),
            w.contratante,
            (SELECT e.nome FROM core_common.empresas e WHERE e.id = ss.empresa_id LIMIT 1)
        ),
        'data_solicitacao', ss.data_solicitacao,
        'data_efetiva', ss.data_efetiva,
        'data_alvo_execucao', CASE 
            WHEN ss.tipo_evento = 'alta' THEN
              COALESCE(
                ss.data_efetiva::timestamp with time zone,
                (SELECT COALESCE(wa.planned_start_date, wa.start_date)::timestamp with time zone FROM core_personal.worker_assignments wa WHERE wa.worker_id = w.id AND wa.status != 'cancelled' ORDER BY COALESCE(wa.planned_start_date, wa.start_date) DESC LIMIT 1),
                (SELECT vwa.fechainiciopedido::timestamp with time zone FROM core_personal.vw_worker_allocations vwa WHERE vwa.cod_colab = w.cod_colab AND vwa.fechasalidatrabajador IS NULL ORDER BY vwa.inserted_at DESC LIMIT 1),
                (SELECT vwa.fechainiciopedido::timestamp with time zone FROM core_personal.vw_worker_allocations vwa WHERE vwa.cod_colab = w.cod_colab ORDER BY vwa.inserted_at DESC LIMIT 1),
                w.data_ingresso::timestamp with time zone,
                ss.data_solicitacao
              )
            ELSE
              COALESCE(
                ss.data_efetiva::timestamp with time zone,
                (SELECT st.source_end_date::timestamp with time zone FROM core_operacoes.solicitud_targets st JOIN core_operacoes.solicitudes_operativas s ON s.id = st.solicitud_id WHERE st.source_worker_id = w.id AND st.source_end_date IS NOT NULL AND s.status != 'cancelled' ORDER BY s.created_at DESC LIMIT 1),
                (SELECT vwa.fechasalidatrabajador::timestamp with time zone FROM core_personal.vw_worker_allocations vwa WHERE vwa.cod_colab = w.cod_colab AND vwa.fechasalidatrabajador IS NOT NULL ORDER BY vwa.inserted_at DESC LIMIT 1),
                (SELECT h.effective_date::timestamp with time zone FROM core_personal.worker_status_history h WHERE h.worker_id = w.id AND h.new_value ILIKE '%Baixa%' ORDER BY h.created_at DESC LIMIT 1),
                w.data_baixa::timestamp with time zone,
                ss.data_solicitacao
              )
        END,
        'reemplazo_codigo', (
            SELECT s.codigo
            FROM core_operacoes.solicitud_targets st
            JOIN core_operacoes.solicitudes_operativas s ON s.id = st.solicitud_id
            WHERE st.source_worker_id = w.id
              AND s.tipo = 'replacement'
              AND s.status != 'cancelled'
              AND st.source_end_date IS NOT NULL
              AND s.created_at > NOW() - INTERVAL '60 days'
            ORDER BY s.created_at DESC
            LIMIT 1
        ),
        'reemplazo_end_date', (
            SELECT st.source_end_date
            FROM core_operacoes.solicitud_targets st
            JOIN core_operacoes.solicitudes_operativas s ON s.id = st.solicitud_id
            WHERE st.source_worker_id = w.id
              AND s.tipo = 'replacement'
              AND s.status != 'cancelled'
              AND st.source_end_date IS NOT NULL
              AND s.created_at > NOW() - INTERVAL '60 days'
            ORDER BY s.created_at DESC
            LIMIT 1
        ),
        'lembrete_postit', ss.lembrete_postit,
        'observacoes', ss.observacoes,
        'autor_inativacao', (
            SELECT COALESCE(u.display_name, u.email)
            FROM core_personal.worker_status_history h
            LEFT JOIN public.mcs_users u ON u.id = h.changed_by
            WHERE h.worker_id = w.id 
            ORDER BY h.created_at DESC 
            LIMIT 1
        ),
        'hist_observacoes', COALESCE(
            ss.observacoes,
            (
                SELECT h.comments
                FROM core_personal.worker_status_history h
                WHERE h.worker_id = w.id 
                  AND h.comments IS NOT NULL AND h.comments <> ''
                ORDER BY h.created_at DESC 
                LIMIT 1
            )
        ),
        'hist_data_efetiva', COALESCE(
            ss.data_efetiva,
            (
                SELECT h.effective_date
                FROM core_personal.worker_status_history h
                WHERE h.worker_id = w.id 
                  AND h.effective_date IS NOT NULL
                ORDER BY h.created_at DESC 
                LIMIT 1
            )
        ),
        'worker', json_build_object(
          'id', w.id,
          'nome', w.nome,
          'cod_colab', w.cod_colab,
          'niss', w.niss,
          'nif', w.nif,
          'dni', w.dni,
          'nie', w.nie,
          'pasaporte', w.pasaporte,
          'fecha_nacimiento', w.fecha_nacimiento,
          'contratante', COALESCE(
              (
                  SELECT vwa.contratante 
                  FROM core_personal.vw_worker_allocations vwa 
                  WHERE vwa.cod_colab = w.cod_colab 
                    AND vwa.fechasalidatrabajador IS NULL
                  ORDER BY vwa.inserted_at DESC 
                  LIMIT 1
              ),
              (
                  SELECT vwa.contratante 
                  FROM core_personal.vw_worker_allocations vwa 
                  WHERE vwa.cod_colab = w.cod_colab 
                  ORDER BY vwa.inserted_at DESC 
                  LIMIT 1
              ),
              w.contratante
          ),
          'cliente', COALESCE(
              (
                  SELECT vwa.cliente_nombre 
                  FROM core_personal.vw_worker_allocations vwa 
                  WHERE vwa.cod_colab = w.cod_colab 
                    AND vwa.fechasalidatrabajador IS NULL
                  ORDER BY vwa.inserted_at DESC 
                  LIMIT 1
              ),
              (
                  SELECT vwa.cliente_nombre 
                  FROM core_personal.vw_worker_allocations vwa 
                  WHERE vwa.cod_colab = w.cod_colab 
                  ORDER BY vwa.inserted_at DESC 
                  LIMIT 1
              ),
              w.cliente
          ),
          'data_ingresso', w.data_ingresso,
          'data_baixa', w.data_baixa,
          'funcion', COALESCE(
              (
                  SELECT vwa.funcion 
                  FROM core_personal.vw_worker_allocations vwa 
                  WHERE vwa.cod_colab = w.cod_colab 
                  ORDER BY vwa.inserted_at DESC 
                  LIMIT 1
              ),
              w.funcion
          ),
          'empresa_nome', (SELECT e.nome FROM core_common.empresas e WHERE e.id = ss.empresa_id LIMIT 1)
        )
      ) ORDER BY ss.created_at DESC
    )
    FROM core_personal.seguridade_status ss
    JOIN core_personal.workers w ON ss.worker_id = w.id
    WHERE (p_empresa_id IS NULL OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid OR ss.empresa_id = p_empresa_id)
      AND (
         ss.status IN ('pendente', 'erro', 'cancelado') OR
         (ss.status = 'confirmado' AND (ss.updated_at > now() - interval '60 days' OR ss.created_at > now() - interval '60 days'))
      )
  ), '[]');
END;
$function$;

COMMIT;
