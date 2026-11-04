-- ============================================================================
-- Migration: Make Worker Operational Alerts Dismissable on Status Save/Confirm
-- Date: 2026-11-04
-- ============================================================================

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
      COALESCE(s.due_date::date, s.created_at::date) AS sol_date,
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
      AND COALESCE(s.due_date::date, s.created_at::date) >= DATE '2026-10-15'
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
    -- Última vez que um usuário salvou/confirmou manualmente o status na galeria ou perfil do trabalhador
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
      -- Se o operador entrou em "Atualizar" e salvou (a partir de 04/11/2026 08:00 UTC) após a criação da solicitação/evento,
      -- o alerta operacional é dado como revisado/concluído ("matado") imediatamente, mesmo que mantenha Em Regularização.
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
        -- 1. DESISTÊNCIA:
        WHEN NOT (e.is_trab_closed AND e.is_seg_closed)
          AND NOT e.is_manually_acknowledged
          AND (
            (e.sol_tipo = 'hiring_withdrawal' AND NOT e.has_newer_alloc_after_sol AND NOT e.has_active_alloc)
            OR (e.status_trabajador ILIKE '%Desist%' AND NOT e.has_active_alloc)
          ) THEN 'desistiu'

        -- 2. SUBSTITUIÇÃO / REEMPLAZO:
        WHEN NOT (e.is_trab_closed AND e.is_seg_closed)
          AND NOT e.is_manually_acknowledged
          AND (
            (e.sol_tipo = 'replacement' AND NOT e.has_newer_alloc_after_sol)
            OR (e.alloc_status = 'replaced' AND NOT e.has_active_alloc)
          ) THEN 'reemplazo'

        -- 3. BAIXA / FIM DE OBRA:
        WHEN NOT (e.is_trab_closed AND e.is_seg_closed)
          AND NOT e.is_manually_acknowledged
          AND (
            (e.sol_tipo IN ('offboarding', 'order_termination', 'order_cancellation') AND NOT e.has_newer_alloc_after_sol)
            OR (e.alloc_status IN ('completed', 'terminated') AND NOT e.has_active_alloc)
            OR (e.checkout_baja_date IS NOT NULL AND NOT e.has_active_alloc AND (e.data_ingresso IS NULL OR e.checkout_baja_date >= e.data_ingresso))
            OR (e.status_seguridad ILIKE '%Pendente Baixa%' OR e.status_seguridad ILIKE '%Pendiente Baja%')
          ) THEN 'baixa'

        -- 4. ALERTA LOGÍSTICA (Alojado em Logística enquanto Inativo/Baixa em RH)
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
      WHEN 'reemplazo' THEN 'Substituído (Reemplazo)'
      WHEN 'desistiu' THEN 'Desistência de Ingresso'
      WHEN 'logistica' THEN 'Alojado em Logística (Inativo RH)'
      ELSE NULL
    END AS alerta_label,
    COALESCE(c.sol_codigo, c.pedido_codigo, c.active_housing_tipo) AS alerta_codigo,
    COALESCE(c.sol_cliente, c.alloc_cliente, c.active_housing_nome, c.checkout_aloj_nome) AS alerta_cliente,
    COALESCE(c.sol_date, c.alloc_end_date, c.checkout_baja_date, c.data_baixa, c.active_housing_date) AS alerta_data,
    CASE
      WHEN c.computed_tipo = 'desistiu' THEN
        CASE
          WHEN NOT (c.status_trabajador ILIKE '%Desist%') AND NOT c.is_seg_closed THEN 'Mudar p/ Desistiu + Baixa Seguridade'
          WHEN NOT (c.status_trabajador ILIKE '%Desist%') THEN 'Mudar Status p/ Desistiu'
          ELSE 'Revisar / Dar Baixa Seguridade'
        END
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
