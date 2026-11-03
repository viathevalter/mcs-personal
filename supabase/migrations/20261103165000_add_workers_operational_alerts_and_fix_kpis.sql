-- ============================================================================
-- Migration: Add Operational Activity Alerts to Workers Gallery & Fix KPIs
-- Date: 2026-11-03
-- ============================================================================

-- 1. Ajustar core_personal.fn_auto_activate_due_workers para fazer SOMENTE a mudança
--    de Pendente Ingresso -> Ativo (sem alterar status_seguridad automaticamente
--    e sem sobrescrever worker_assignments com status 'replaced')
CREATE OR REPLACE FUNCTION core_personal.fn_auto_activate_due_workers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_operacoes', 'core_common'
AS $function$
DECLARE
    r RECORD;
    v_count integer := 0;
BEGIN
    -- 0. Encerrar alocações ativas/planejadas/pausadas cuja data de fim (end_date) já passou
    --    (Preserva 'replaced' para manter rastreabilidade de substituições/reemplazos)
    UPDATE core_personal.worker_assignments
    SET status = 'completed',
        updated_at = NOW()
    WHERE status IN ('active', 'planned', 'paused')
      AND end_date IS NOT NULL
      AND end_date::date < CURRENT_DATE;

    -- 1. Identifica qualquer trabalhador que está como Pendente Ingresso e possui alocação ativa/planejada iniciando hoje ou no passado
    FOR r IN 
        WITH active_sources AS (
            -- Fonte A: core_personal.worker_assignments (Módulo de Contratação Novo)
            SELECT 
                w.id AS worker_id,
                w.cod_colab,
                w.status_trabajador AS old_status,
                COALESCE(c.trade_name, c.legal_name, w.cliente) AS novo_cliente,
                COALESCE(e.trade_name, e.nome, e.codigo, w.contratante) AS novo_contratante,
                COALESCE(wa.start_date, wa.planned_start_date) AS effective_start
            FROM core_personal.workers w
            JOIN core_personal.worker_assignments wa ON wa.worker_id = w.id
            LEFT JOIN core_comercial.pedidos p ON p.id = wa.pedido_id
            LEFT JOIN core_common.clients c ON c.id = COALESCE(wa.client_id, p.client_id)
            LEFT JOIN core_common.empresas e ON e.id = wa.empresa_id
            WHERE wa.status IN ('active', 'planned')
              AND COALESCE(wa.start_date, wa.planned_start_date) <= CURRENT_DATE
              AND (wa.end_date IS NULL OR wa.end_date >= CURRENT_DATE)
              AND (
                  w.status_trabajador ILIKE '%Pendente%Ingresso%'
                  OR w.status_trabajador ILIKE '%Pendiente%Ingres%'
              )

            UNION

            -- Fonte B: public.colaborador_por_pedido (Alocações manuais sem worker_assignment futura/cancelada)
            SELECT 
                w.id AS worker_id,
                w.cod_colab,
                w.status_trabajador AS old_status,
                COALESCE(cpp.cliente_nombre, w.cliente) AS novo_cliente,
                COALESCE(cpp.contratante, w.contratante) AS novo_contratante,
                cpp.fechainiciopedido AS effective_start
            FROM core_personal.workers w
            JOIN public.colaborador_por_pedido cpp ON cpp.cod_colab = w.cod_colab
            WHERE cpp.fechainiciopedido IS NOT NULL
              AND cpp.fechainiciopedido <= CURRENT_DATE
              AND (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= CURRENT_DATE)
              AND NOT EXISTS (
                  SELECT 1 FROM core_personal.worker_assignments wa2
                  WHERE wa2.worker_id = w.id
                    AND wa2.status = 'planned'
                    AND wa2.planned_start_date > CURRENT_DATE
              )
              AND (
                  w.status_trabajador ILIKE '%Pendente%Ingresso%'
                  OR w.status_trabajador ILIKE '%Pendiente%Ingres%'
              )
        )
        SELECT DISTINCT ON (worker_id) *
        FROM active_sources
        ORDER BY worker_id, effective_start DESC
    LOOP
        UPDATE core_personal.workers
        SET 
            status_trabajador = 'Ativo',
            cliente = COALESCE(r.novo_cliente, cliente),
            contratante = COALESCE(r.novo_contratante, contratante)
        WHERE id = r.worker_id;

        UPDATE public.colaboradores
        SET 
            status_trabajador = 'Ativo',
            contratante = COALESCE(r.novo_contratante, contratante)
        WHERE cod_colab = r.cod_colab;

        INSERT INTO core_personal.worker_status_history (
            worker_id,
            change_type,
            old_value,
            new_value,
            effective_date,
            comments,
            empresa_nome,
            cliente_nome
        ) VALUES (
            r.worker_id,
            'TRABALHADOR',
            COALESCE(r.old_status, 'Pendente Ingresso'),
            'ATIVO',
            COALESCE(r.effective_start, CURRENT_DATE),
            'Ativação Automática pelo Cron (Início de Alocação / Ingresso em Obra)',
            r.novo_contratante,
            r.novo_cliente
        );

        v_count := v_count + 1;
    END LOOP;

    -- 2. Atualiza alocações com planned_start_date <= CURRENT_DATE de 'planned' para 'active'
    UPDATE core_personal.worker_assignments
    SET 
        status = 'active',
        start_date = COALESCE(start_date, planned_start_date, CURRENT_DATE),
        updated_at = NOW()
    WHERE status = 'planned'
      AND planned_start_date <= CURRENT_DATE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE);

    RETURN v_count;
END;
$function$;

-- 2. Criar função tabular de Alertas Operacionais por Trabalhador
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
      a.motivo_checkout
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
      ls.cliente_nome AS sol_cliente,
      lea.alloc_status,
      lea.end_date AS alloc_end_date,
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
    WHERE w.deleted_at IS NULL
  ),
  classified AS (
    SELECT
      e.*,
      CASE
        -- 1. DESISTÊNCIA:
        WHEN NOT (e.is_trab_closed AND e.is_seg_closed) AND (
          (e.sol_tipo = 'hiring_withdrawal' AND NOT e.has_newer_alloc_after_sol AND NOT e.has_active_alloc)
          OR (e.status_trabajador ILIKE '%Desist%' AND NOT e.has_active_alloc)
        ) THEN 'desistiu'

        -- 2. SUBSTITUIÇÃO / REEMPLAZO:
        WHEN NOT (e.is_trab_closed AND e.is_seg_closed) AND (
          (e.sol_tipo = 'replacement' AND NOT e.has_newer_alloc_after_sol)
          OR (e.alloc_status = 'replaced' AND NOT e.has_active_alloc)
        ) THEN 'reemplazo'

        -- 3. BAIXA / FIM DE OBRA:
        WHEN NOT (e.is_trab_closed AND e.is_seg_closed) AND (
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
          ELSE 'Dar Baixa na Seguridade Social'
        END
      WHEN c.computed_tipo IN ('baixa', 'reemplazo') THEN
        CASE
          WHEN NOT c.is_trab_closed AND NOT c.is_seg_closed THEN 'Inativar + Dar Baixa Seguridade'
          WHEN NOT c.is_trab_closed THEN 'Atualizar Status p/ Inativo'
          ELSE 'Dar Baixa na Seguridade Social'
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

-- 3. Atualizar core_personal.get_client_worker_kpis para:
--    (a) Filtrar os KPIs de Seguridade Social pelo status_trabajador selecionado (evitando misturar inativos quando Activos está selecionado)
--    (b) Retornar os contadores dinâmicos de alertas operacionais (total, baixa, reemplazo, desistiu, logistica)
DROP FUNCTION IF EXISTS core_personal.get_client_worker_kpis(uuid, text, text[], text, text);
DROP FUNCTION IF EXISTS core_personal.get_client_worker_kpis(uuid, text, text[], text, text, text[]);

CREATE OR REPLACE FUNCTION core_personal.get_client_worker_kpis(
  p_empresa_id uuid,
  p_search text DEFAULT NULL::text,
  p_cliente_nombre text[] DEFAULT NULL::text[],
  p_contratante text DEFAULT NULL::text,
  p_funcion text DEFAULT NULL::text,
  p_status_trabajador_filter text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
  ativos bigint,
  inativos bigint,
  pendentes_ingreso bigint,
  seguridade_alta bigint,
  seguridade_pendente_alta bigint,
  seguridade_em_regularizacao bigint,
  seguridade_baixa bigint,
  seguridade_pendente_baixa bigint,
  alertas_total bigint,
  alertas_baixa bigint,
  alertas_reemplazo bigint,
  alertas_desistiu bigint,
  alertas_logistica bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_holding_id uuid := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid;
BEGIN
    IF NOT (
        public.get_my_role() = 'super_admin'
        OR (p_empresa_id IS NULL AND core_common.is_member(v_holding_id))
        OR (p_empresa_id IS NOT NULL AND (core_common.is_member(p_empresa_id) OR core_common.is_member(v_holding_id)))
    ) THEN
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint;
        RETURN;
    END IF;

    RETURN QUERY
    WITH dedup_workers AS (
      SELECT DISTINCT ON (COALESCE(NULLIF(UPPER(TRIM(w.cod_colab)), ''), w.id::text))
        w.*
      FROM core_personal.workers w
      WHERE w.deleted_at IS NULL
      ORDER BY
        COALESCE(NULLIF(UPPER(TRIM(w.cod_colab)), ''), w.id::text),
        CASE WHEN w.pasaporte IS NOT NULL AND TRIM(w.pasaporte) <> '' THEN 0 ELSE 1 END,
        w.created_at DESC NULLS LAST
    ),
    base_workers AS (
        SELECT 
            w.id,
            COALESCE(
              e.id,
              (
                SELECT wa.empresa_id
                FROM core_personal.worker_assignments wa
                WHERE wa.worker_id = w.id
                  AND wa.status <> 'cancelled'
                ORDER BY
                  CASE WHEN wa.status IN ('active', 'planned', 'paused', 'replaced') AND (wa.end_date IS NULL OR wa.end_date::date >= CURRENT_DATE) THEN 1 ELSE 0 END DESC,
                  COALESCE(wa.start_date, wa.planned_start_date) DESC NULLS LAST
                LIMIT 1
              ),
              (
                SELECT cnt.empresa_id
                FROM core_personal.contracts cnt
                WHERE cnt.worker_id = w.id
                ORDER BY cnt.created_at DESC
                LIMIT 1
              )
            ) as empresa_id,
            w.status_trabajador,
            w.status_seguridad,
            w.nome,
            w.cod_colab,
            w.dni,
            w.pasaporte,
            w.niss,
            w.nie,
            COALESCE(NULLIF(w.contratante, ''), c.contratante) as contratante,
            COALESCE(NULLIF(w.funcion, ''), jf.name, c.funcion) as funcion,
            CASE
              WHEN (
                COALESCE(w.status_trabajador, '') ILIKE '%inativ%'
                OR COALESCE(w.status_trabajador, '') ILIKE '%inactiv%'
                OR COALESCE(w.status_trabajador, '') ILIKE '%desligad%'
                OR COALESCE(w.status_trabajador, '') ILIKE '%desist%'
              ) THEN NULL
              ELSE COALESCE(core_personal.fn_get_active_client_for_worker(w.cod_colab), NULLIF(w.cliente, ''))
            END as active_client
        FROM dedup_workers w
        LEFT JOIN LATERAL (
          SELECT j.name
          FROM core_comercial.job_functions j
          WHERE j.code = w.cod_funcion
          LIMIT 1
        ) jf ON TRUE
        LEFT JOIN LATERAL (
          SELECT col.contratante, col.funcion
          FROM public.colaboradores col
          WHERE col.cod_colab = w.cod_colab
          ORDER BY col.id DESC
          LIMIT 1
        ) c ON TRUE
        LEFT JOIN LATERAL (
          SELECT emp.id
          FROM core_common.empresas emp
          WHERE (
            UPPER(TRIM(emp.codigo)) = UPPER(TRIM(w.contratante)) OR 
            UPPER(TRIM(emp.nome)) = UPPER(TRIM(w.contratante)) OR
            UPPER(TRIM(emp.trade_name)) = UPPER(TRIM(w.contratante)) OR
            UPPER(TRIM(emp.legal_name)) = UPPER(TRIM(w.contratante)) OR
            (UPPER(w.contratante) LIKE 'HEXAGON%' AND emp.codigo = 'HEX') OR
            (UPPER(w.contratante) LIKE 'LUMINOUS%' AND emp.codigo = 'LUM') OR
            (UPPER(w.contratante) LIKE 'WISEOWE%' AND emp.codigo = 'WIS') OR
            (UPPER(w.contratante) LIKE 'STOCCO%' AND emp.codigo = 'STO') OR
            (UPPER(w.contratante) LIKE 'TRIANGULO%' AND emp.codigo = 'TRI') OR
            (UPPER(w.contratante) LIKE '%ROSAS%' AND emp.codigo IN ('KOT', 'KOR'))
          )
          LIMIT 1
        ) e ON TRUE
    ),
    filtered_kpis AS (
        SELECT
            bw.*,
            oa.alerta_tipo,
            COALESCE(oa.alerta_logistica, false) AS alerta_logistica,
            (
              p_status_trabajador_filter IS NULL 
              OR cardinality(p_status_trabajador_filter) = 0 
              OR bw.status_trabajador = ANY(p_status_trabajador_filter)
              OR EXISTS (
                SELECT 1 FROM unnest(p_status_trabajador_filter) AS st
                WHERE 
                  (st = 'ativos' AND (bw.status_trabajador ILIKE 'Ativo%' OR bw.status_trabajador ILIKE 'Activo%'))
                  OR (st = 'inativos' AND (
                    bw.status_trabajador ILIKE 'Inativo%' 
                    OR bw.status_trabajador ILIKE 'Inactivo%' 
                    OR bw.status_trabajador ILIKE 'Desligado%' 
                    OR bw.status_trabajador ILIKE 'Desistiu%'
                  ))
                  OR (st IN ('pendientes_ingreso', 'pendentes_ingreso', 'pendentes_ingresso') AND (
                    bw.status_trabajador ILIKE '%Pendente%' 
                    OR bw.status_trabajador ILIKE '%Pendiente%'
                  ))
                  OR (st IN ('disponiveis', 'disponivel', 'disponíveis') AND bw.status_trabajador ILIKE 'Dispon%')
                  OR (st = 'desistiu' AND bw.status_trabajador ILIKE 'Desist%')
                  OR (bw.status_trabajador ILIKE st)
              )
            ) AS matches_status_filter
        FROM base_workers bw
        LEFT JOIN core_personal.fn_get_workers_operational_alerts() oa ON oa.worker_id = bw.id
        WHERE 
            (
              p_empresa_id IS NULL 
              OR p_empresa_id = v_holding_id 
              OR bw.empresa_id = p_empresa_id
              OR (bw.empresa_id IS NULL AND (p_empresa_id IS NULL OR p_empresa_id = v_holding_id))
            )
            AND NOT (bw.cod_colab LIKE '%-0' OR bw.cod_colab LIKE '%-0-0')
            AND NOT (bw.nome ILIKE 'Colaborador E%' AND (bw.contratante IS NULL OR TRIM(bw.contratante) = ''))
            AND (
                p_search IS NULL OR TRIM(p_search) = '' 
                OR bw.nome ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.cod_colab ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.dni ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.pasaporte ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.niss ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.nie ILIKE '%' || TRIM(p_search) || '%'
            )
            AND (p_contratante IS NULL OR TRIM(p_contratante) = '' OR bw.contratante ILIKE '%' || TRIM(p_contratante) || '%')
            AND (p_funcion IS NULL OR TRIM(p_funcion) = '' OR bw.funcion ILIKE '%' || TRIM(p_funcion) || '%')
            AND (p_cliente_nombre IS NULL OR cardinality(p_cliente_nombre) = 0 OR bw.active_client = ANY(p_cliente_nombre))
    )
    SELECT 
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Ativo%' OR wk.status_trabajador ILIKE 'Activo%')::bigint AS ativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Inativo%' OR wk.status_trabajador ILIKE 'Inactivo%' OR wk.status_trabajador ILIKE 'Desligado%' OR wk.status_trabajador ILIKE 'Desistiu%')::bigint AS inativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE '%Pendente%' OR wk.status_trabajador ILIKE '%Pendiente%')::bigint AS pendentes_ingreso,
        COUNT(*) FILTER (WHERE wk.matches_status_filter AND wk.status_seguridad ILIKE 'Alta')::bigint AS seguridade_alta,
        COUNT(*) FILTER (WHERE wk.matches_status_filter AND (wk.status_seguridad ILIKE 'Pendente Alta' OR wk.status_seguridad ILIKE 'Pendiente Alta'))::bigint AS seguridade_pendente_alta,
        COUNT(*) FILTER (WHERE wk.matches_status_filter AND (wk.status_seguridad ILIKE 'Em Regulariza%' OR wk.status_seguridad ILIKE 'En Regulariza%'))::bigint AS seguridade_em_regularizacao,
        COUNT(*) FILTER (WHERE wk.matches_status_filter AND (wk.status_seguridad ILIKE 'Baixa' OR wk.status_seguridad ILIKE 'Baja' OR wk.status_seguridad ILIKE 'Anulado'))::bigint AS seguridade_baixa,
        COUNT(*) FILTER (WHERE wk.matches_status_filter AND (wk.status_seguridad ILIKE 'Pendente Baixa' OR wk.status_seguridad ILIKE 'Pendiente Baja'))::bigint AS seguridade_pendente_baixa,
        COUNT(*) FILTER (WHERE wk.alerta_tipo IS NOT NULL OR wk.alerta_logistica = true)::bigint AS alertas_total,
        COUNT(*) FILTER (WHERE wk.alerta_tipo = 'baixa')::bigint AS alertas_baixa,
        COUNT(*) FILTER (WHERE wk.alerta_tipo = 'reemplazo')::bigint AS alertas_reemplazo,
        COUNT(*) FILTER (WHERE wk.alerta_tipo = 'desistiu')::bigint AS alertas_desistiu,
        COUNT(*) FILTER (WHERE wk.alerta_logistica = true OR wk.alerta_tipo = 'logistica')::bigint AS alertas_logistica
    FROM filtered_kpis wk;
END;
$function$;

-- 4. Atualizar core_personal.search_workers para retornar alertas operacionais e permitir filtro por alerta
DROP FUNCTION IF EXISTS core_personal.search_workers(text, text, text[], text[], text[], text, text, text, text, integer, integer, integer, integer);
DROP FUNCTION IF EXISTS core_personal.search_workers(text, text, text[], text[], text[], text, text, text, text, integer, integer, integer, integer, text);

CREATE OR REPLACE FUNCTION core_personal.search_workers(
  p_empresa_id text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_cliente_nombre text[] DEFAULT NULL::text[],
  p_status_trabajador_filter text[] DEFAULT NULL::text[],
  p_status_seguridad_filter text[] DEFAULT NULL::text[],
  p_contratante text DEFAULT NULL::text,
  p_funcion text DEFAULT NULL::text,
  p_sort_column text DEFAULT 'nome'::text,
  p_sort_direction text DEFAULT 'asc'::text,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50,
  p_period_month integer DEFAULT NULL::integer,
  p_period_year integer DEFAULT NULL::integer,
  p_alerta_filter text DEFAULT NULL::text
)
RETURNS TABLE(
  total_count bigint,
  id uuid,
  empresa_id uuid,
  cod_colab text,
  nome text,
  email text,
  movil text,
  niss text,
  nif text,
  nie text,
  dni text,
  pasaporte text,
  status_seguridad text,
  status_trabajador text,
  contratante text,
  funcion text,
  cliente_nombre text,
  created_at timestamp with time zone,
  data_ingresso date,
  data_baixa date,
  alerta_tipo text,
  alerta_logistica boolean,
  alerta_label text,
  alerta_codigo text,
  alerta_cliente text,
  alerta_data date,
  alerta_pendencia text,
  alerta_alojamento text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $function$
DECLARE
  v_offset integer;
  v_holding_id text := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'; -- GRP - Login Pro
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH dedup_workers AS (
    SELECT DISTINCT ON (COALESCE(NULLIF(UPPER(TRIM(w.cod_colab)), ''), w.id::text))
      w.*
    FROM core_personal.workers w
    WHERE w.deleted_at IS NULL
    ORDER BY
      COALESCE(NULLIF(UPPER(TRIM(w.cod_colab)), ''), w.id::text),
      CASE WHEN w.pasaporte IS NOT NULL AND TRIM(w.pasaporte) <> '' THEN 0 ELSE 1 END,
      w.created_at DESC NULLS LAST
  ),
  base_workers AS (
    SELECT 
      w.id,
      COALESCE(
        e.id,
        (
          SELECT wa.empresa_id
          FROM core_personal.worker_assignments wa
          WHERE wa.worker_id = w.id
            AND wa.status <> 'cancelled'
          ORDER BY
            CASE WHEN wa.status IN ('active', 'planned', 'paused', 'replaced') AND (wa.end_date IS NULL OR wa.end_date::date >= CURRENT_DATE) THEN 1 ELSE 0 END DESC,
            COALESCE(wa.start_date, wa.planned_start_date) DESC NULLS LAST
          LIMIT 1
        ),
        (
          SELECT cnt.empresa_id
          FROM core_personal.contracts cnt
          WHERE cnt.worker_id = w.id
          ORDER BY cnt.created_at DESC
          LIMIT 1
        )
      ) as empresa_id,
      w.cod_colab,
      w.nome,
      w.email,
      w.movil,
      w.telefones_adicionais,
      w.niss,
      w.nif,
      w.nie,
      w.dni,
      w.pasaporte,
      w.status_seguridad,
      w.status_trabajador,
      w.data_ingresso,
      w.data_baixa,
      w.data_alta_seguridad,
      w.created_at,
      COALESCE(NULLIF(w.contratante, ''), core_personal.fn_get_active_contratante_for_worker(w.cod_colab), c.contratante) as contratante,
      COALESCE(core_personal.fn_get_active_function_for_worker(w.cod_colab), NULLIF(w.funcion, ''), jf.name, c.funcion) as funcion,
      CASE
        WHEN (
          COALESCE(w.status_trabajador, '') ILIKE '%inativ%'
          OR COALESCE(w.status_trabajador, '') ILIKE '%inactiv%'
          OR COALESCE(w.status_trabajador, '') ILIKE '%desligad%'
          OR COALESCE(w.status_trabajador, '') ILIKE '%desist%'
        ) THEN NULL
        ELSE COALESCE(core_personal.fn_get_active_client_for_worker(w.cod_colab), NULLIF(w.cliente, ''))
      END as active_client_nombre,
      oa.alerta_tipo,
      COALESCE(oa.alerta_logistica, false) AS alerta_logistica,
      oa.alerta_label,
      oa.alerta_codigo,
      oa.alerta_cliente,
      oa.alerta_data,
      oa.alerta_pendencia,
      oa.alerta_alojamento
    FROM dedup_workers w
    LEFT JOIN core_personal.fn_get_workers_operational_alerts() oa ON oa.worker_id = w.id
    LEFT JOIN LATERAL (
      SELECT j.name
      FROM core_comercial.job_functions j
      WHERE j.code = w.cod_funcion
      LIMIT 1
    ) jf ON TRUE
    LEFT JOIN LATERAL (
      SELECT col.contratante, col.funcion
      FROM public.colaboradores col
      WHERE col.cod_colab = w.cod_colab
      ORDER BY col.id DESC
      LIMIT 1
    ) c ON TRUE
    LEFT JOIN LATERAL (
      SELECT emp.id
      FROM core_common.empresas emp
      WHERE (
        UPPER(TRIM(emp.codigo)) = UPPER(TRIM(w.contratante)) OR 
        UPPER(TRIM(emp.nome)) = UPPER(TRIM(w.contratante)) OR
        UPPER(TRIM(emp.trade_name)) = UPPER(TRIM(w.contratante)) OR
        UPPER(TRIM(emp.legal_name)) = UPPER(TRIM(w.contratante)) OR
        (UPPER(w.contratante) LIKE 'HEXAGON%' AND emp.codigo = 'HEX') OR
        (UPPER(w.contratante) LIKE 'LUMINOUS%' AND emp.codigo = 'LUM') OR
        (UPPER(w.contratante) LIKE 'WISEOWE%' AND emp.codigo = 'WIS') OR
        (UPPER(w.contratante) LIKE 'STOCCO%' AND emp.codigo = 'STO') OR
        (UPPER(w.contratante) LIKE 'TRIANGULO%' AND emp.codigo = 'TRI') OR
        (UPPER(w.contratante) LIKE '%ROSAS%' AND emp.codigo IN ('KOT', 'KOR'))
      )
      LIMIT 1
    ) e ON TRUE
  ),
  filtered AS (
    SELECT bw.*
    FROM base_workers bw
    WHERE (
        p_empresa_id IS NULL 
        OR p_empresa_id = '' 
        OR p_empresa_id = v_holding_id 
        OR (bw.empresa_id IS NOT NULL AND bw.empresa_id::text = p_empresa_id)
        OR (bw.empresa_id IS NULL AND (p_empresa_id IS NULL OR p_empresa_id = '' OR p_empresa_id = v_holding_id))
      )
      AND NOT (bw.cod_colab LIKE '%-0' OR bw.cod_colab LIKE '%-0-0')
      AND NOT (bw.nome ILIKE 'Colaborador E%' AND (bw.contratante IS NULL OR TRIM(bw.contratante) = ''))
      AND (
        p_search IS NULL OR TRIM(p_search) = '' OR (
          bw.nome ILIKE '%' || TRIM(p_search) || '%' OR
          bw.cod_colab ILIKE '%' || TRIM(p_search) || '%' OR
          bw.nif ILIKE '%' || TRIM(p_search) || '%' OR
          bw.niss ILIKE '%' || TRIM(p_search) || '%' OR
          bw.nie ILIKE '%' || TRIM(p_search) || '%' OR
          bw.dni ILIKE '%' || TRIM(p_search) || '%' OR
          bw.pasaporte ILIKE '%' || TRIM(p_search) || '%' OR
          bw.movil ILIKE '%' || TRIM(p_search) || '%' OR
          bw.alerta_codigo ILIKE '%' || TRIM(p_search) || '%' OR
          bw.alerta_cliente ILIKE '%' || TRIM(p_search) || '%' OR
          EXISTS (
            SELECT 1 FROM unnest(coalesce(bw.telefones_adicionais, '{}'::text[])) AS tp
            WHERE tp ILIKE '%' || TRIM(p_search) || '%'
          )
        )
      )
      AND (
        p_cliente_nombre IS NULL 
        OR cardinality(p_cliente_nombre) = 0 
        OR bw.active_client_nombre = ANY(p_cliente_nombre)
        OR (p_alerta_filter IS NOT NULL AND TRIM(p_alerta_filter) <> '' AND bw.alerta_cliente = ANY(p_cliente_nombre))
      )
      AND (
        -- Se um filtro de alerta operacional estiver ativo e o usuário não restringiu manualmente, ou se bate com o status_trabajador_filter
        p_status_trabajador_filter IS NULL 
        OR cardinality(p_status_trabajador_filter) = 0 
        OR bw.status_trabajador = ANY(p_status_trabajador_filter)
        OR (
          EXISTS (
            SELECT 1 FROM unnest(p_status_trabajador_filter) AS st
            WHERE 
              (st = 'ativos' AND (bw.status_trabajador ILIKE 'Ativo%' OR bw.status_trabajador ILIKE 'Activo%'))
              OR
              (st = 'inativos' AND (
                bw.status_trabajador ILIKE 'Inativo%' 
                OR bw.status_trabajador ILIKE 'Inactivo%' 
                OR bw.status_trabajador ILIKE 'Desligado%' 
                OR bw.status_trabajador ILIKE 'Desistiu%'
              ))
              OR
              (st IN ('pendientes_ingreso', 'pendentes_ingreso', 'pendentes_ingresso') AND (
                bw.status_trabajador ILIKE '%Pendente%' 
                OR bw.status_trabajador ILIKE '%Pendiente%'
              ))
              OR
              (st IN ('disponiveis', 'disponivel', 'disponíveis') AND bw.status_trabajador ILIKE 'Dispon%')
              OR
              (st = 'desistiu' AND bw.status_trabajador ILIKE 'Desist%')
              OR
              (bw.status_trabajador ILIKE st)
          )
        )
      )
      AND (
        p_status_seguridad_filter IS NULL 
        OR cardinality(p_status_seguridad_filter) = 0 
        OR bw.status_seguridad = ANY(p_status_seguridad_filter)
        OR (
          EXISTS (
            SELECT 1 FROM unnest(p_status_seguridad_filter) AS sf
            WHERE 
              (sf = 'alta' AND bw.status_seguridad ILIKE 'Alta')
              OR
              (sf = 'pendentes_alta' AND (bw.status_seguridad ILIKE 'Pendente Alta' OR bw.status_seguridad ILIKE 'Pendiente Alta'))
              OR
              (sf = 'baixa' AND (bw.status_seguridad ILIKE 'Baixa' OR bw.status_seguridad ILIKE 'Baja' OR bw.status_seguridad ILIKE 'Anulado'))
              OR
              (sf = 'pendentes_baixa' AND (bw.status_seguridad ILIKE 'Pendente Baixa' OR bw.status_seguridad ILIKE 'Pendiente Baja'))
              OR
              (sf = 'em_regularizacao' AND (
                bw.status_seguridad ILIKE 'Em Regulariza%' 
                OR bw.status_seguridad ILIKE 'En Regulariza%'
              ))
              OR
              (bw.status_seguridad ILIKE sf)
          )
        )
      )
      AND (p_contratante IS NULL OR bw.contratante ILIKE '%' || p_contratante || '%')
      AND (p_funcion IS NULL OR bw.funcion ILIKE '%' || p_funcion || '%')
      AND (
        p_period_month IS NULL OR p_period_year IS NULL OR
        (EXTRACT(MONTH FROM bw.data_ingresso) = p_period_month AND EXTRACT(YEAR FROM bw.data_ingresso) = p_period_year) OR
        (EXTRACT(MONTH FROM bw.data_alta_seguridad) = p_period_month AND EXTRACT(YEAR FROM bw.data_alta_seguridad) = p_period_year) OR
        (EXTRACT(MONTH FROM bw.created_at) = p_period_month AND EXTRACT(YEAR FROM bw.created_at) = p_period_year)
      )
      AND (
        p_alerta_filter IS NULL OR TRIM(p_alerta_filter) = ''
        OR (p_alerta_filter = 'todos_alertas' AND (bw.alerta_tipo IS NOT NULL OR bw.alerta_logistica = true))
        OR (p_alerta_filter = 'baixa' AND bw.alerta_tipo = 'baixa')
        OR (p_alerta_filter = 'reemplazo' AND bw.alerta_tipo = 'reemplazo')
        OR (p_alerta_filter = 'desistiu' AND bw.alerta_tipo = 'desistiu')
        OR (p_alerta_filter = 'logistica' AND (bw.alerta_logistica = true OR bw.alerta_tipo = 'logistica'))
      )
  ),
  total AS (
    SELECT COUNT(*) AS exact_count FROM filtered
  )
  SELECT 
    (SELECT exact_count FROM total) AS total_count,
    f.id,
    f.empresa_id,
    f.cod_colab,
    f.nome,
    f.email,
    f.movil,
    f.niss,
    f.nif,
    f.nie,
    f.dni,
    f.pasaporte,
    f.status_seguridad,
    f.status_trabajador,
    f.contratante,
    f.funcion,
    f.active_client_nombre as cliente_nombre,
    f.created_at,
    f.data_ingresso,
    f.data_baixa,
    f.alerta_tipo,
    f.alerta_logistica,
    f.alerta_label,
    f.alerta_codigo,
    f.alerta_cliente,
    f.alerta_data,
    f.alerta_pendencia,
    f.alerta_alojamento
  FROM filtered f
  ORDER BY
    CASE WHEN p_alerta_filter IS NOT NULL AND TRIM(p_alerta_filter) <> '' THEN f.alerta_data END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'asc' THEN f.nome END ASC,
    CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'desc' THEN f.nome END DESC,
    CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'asc' THEN f.cod_colab END ASC,
    CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'desc' THEN f.cod_colab END DESC,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'asc' THEN f.active_client_nombre END ASC,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'desc' THEN f.active_client_nombre END DESC,
    CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'asc' THEN f.contratante END ASC,
    CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'desc' THEN f.contratante END DESC,
    CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'asc' THEN f.funcion END ASC,
    CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'desc' THEN f.funcion END DESC,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'asc' THEN f.status_trabajador END ASC,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'desc' THEN f.status_trabajador END DESC,
    f.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;
