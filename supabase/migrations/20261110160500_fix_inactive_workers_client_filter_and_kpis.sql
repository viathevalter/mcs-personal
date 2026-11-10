-- ============================================================================
-- Migration: Fix Inactive Workers Client Filter, Display & KPI Counters
-- Date: 2026-11-10
-- Description:
--   - Trabalhadores ATIVOS / PENDENTES INGRESSO continuam exibindo e filtrando
--     estritamente pelo seu cliente ATIVO atual (evitando vazamento de clientes
--     anteriores quando o trabalhador muda de obra).
--   - Trabalhadores INATIVOS / DESLIGADOS / DESISTIU passam a manter e filtrar
--     pelo seu ÚLTIMO cliente alocado (fn_get_last_client_for_worker), permitindo
--     filtrar por Cliente + Inativos e contabilizando corretamente o card INATIVOS
--     e os contadores de Alertas Operacionais daquele cliente.
-- ============================================================================

-- 1. Função auxiliar para obter o ÚLTIMO cliente (histórico mais recente) de um trabalhador
CREATE OR REPLACE FUNCTION core_personal.fn_get_last_client_for_worker(p_cod_colab text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_operacoes', 'core_common'
AS $function$
DECLARE
  v_client text;
BEGIN
  IF p_cod_colab IS NULL OR btrim(p_cod_colab) = '' THEN
    RETURN NULL;
  END IF;

  WITH candidates AS (
    -- Fonte 1: core_personal.worker_assignments (alocação mais recente, priorizando não-canceladas)
    SELECT
      COALESCE(
        NULLIF(TRIM(c.trade_name), ''),
        NULLIF(TRIM(c.legal_name), '')
      ) AS cliente_nome,
      CASE WHEN wa.status <> 'cancelled' THEN 1 ELSE 2 END AS status_prio,
      1 AS source_prio,
      COALESCE(wa.end_date, wa.start_date, wa.planned_start_date, wa.created_at::date, DATE '1900-01-01') AS sort_date,
      wa.updated_at AS sort_updated
    FROM core_personal.worker_assignments wa
    JOIN core_personal.workers w ON w.id = wa.worker_id
    LEFT JOIN core_comercial.pedidos p ON p.id = wa.pedido_id
    LEFT JOIN core_common.clients c ON c.id = COALESCE(wa.client_id, p.client_id)
    WHERE w.cod_colab = p_cod_colab

    UNION ALL

    -- Fonte 2: public.colaborador_por_pedido (registro mais recente)
    SELECT
      COALESCE(
        NULLIF(TRIM(c.trade_name), ''),
        NULLIF(TRIM(cpp.cliente_nombre), '')
      ) AS cliente_nome,
      1 AS status_prio,
      2 AS source_prio,
      COALESCE(cpp.fechasalidatrabajador::date, cpp.fechainiciopedido::date, cpp.inserted_at::date, DATE '1900-01-01') AS sort_date,
      COALESCE(cpp.updated_at, cpp.inserted_at, NOW()) AS sort_updated
    FROM public.colaborador_por_pedido cpp
    LEFT JOIN core_common.clients c
      ON UPPER(TRIM(c.legal_name)) = UPPER(TRIM(cpp.cliente_nombre))
      OR UPPER(TRIM(c.trade_name)) = UPPER(TRIM(cpp.cliente_nombre))
    WHERE cpp.cod_colab = p_cod_colab

    UNION ALL

    -- Fonte 3: core_operacoes.solicitudes_operativas (solicitação operacional mais recente)
    SELECT
      COALESCE(
        NULLIF(TRIM(cl.trade_name), ''),
        NULLIF(TRIM(cl.legal_name), '')
      ) AS cliente_nome,
      1 AS status_prio,
      3 AS source_prio,
      COALESCE(s.due_date::date, s.created_at::date, DATE '1900-01-01') AS sort_date,
      s.created_at AS sort_updated
    FROM core_operacoes.solicitudes_operativas s
    LEFT JOIN core_operacoes.solicitud_targets st ON st.solicitud_id = s.id
    JOIN core_personal.workers w ON w.id = COALESCE(st.source_worker_id, s.target_worker_id)
    LEFT JOIN core_common.clients cl ON cl.id = COALESCE(st.source_client_id, s.client_id)
    WHERE w.cod_colab = p_cod_colab
      AND s.status NOT IN ('rejected', 'cancelled')
      AND COALESCE(st.status, '') NOT IN ('rejected', 'cancelled')
  )
  SELECT cliente_nome
  INTO v_client
  FROM candidates
  WHERE cliente_nome IS NOT NULL AND cliente_nome <> ''
  ORDER BY status_prio ASC, sort_date DESC, source_prio ASC, sort_updated DESC
  LIMIT 1;

  RETURN v_client;
END;
$function$;

-- 2. Atualizar fn_sync_worker_active_fields_by_cod para não apagar o último cliente quando inativo
CREATE OR REPLACE FUNCTION core_personal.fn_sync_worker_active_fields_by_cod(p_cod_colab text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_common'
AS $function$
DECLARE
  v_worker record;
  v_best record;
  v_is_inactive boolean := false;
BEGIN
  IF p_cod_colab IS NULL OR btrim(p_cod_colab) = '' THEN
    RETURN;
  END IF;

  SELECT id, cod_colab, status_trabajador, cliente, contratante, funcion
  INTO v_worker
  FROM core_personal.workers
  WHERE cod_colab = p_cod_colab
  LIMIT 1;

  IF v_worker.id IS NULL THEN
    RETURN;
  END IF;

  v_is_inactive := (
    COALESCE(v_worker.status_trabajador, '') ILIKE '%inativ%'
    OR COALESCE(v_worker.status_trabajador, '') ILIKE '%inactiv%'
    OR COALESCE(v_worker.status_trabajador, '') ILIKE '%desligad%'
    OR COALESCE(v_worker.status_trabajador, '') ILIKE '%desist%'
    OR COALESCE(v_worker.status_trabajador, '') ILIKE '%baixa%'
    OR COALESCE(v_worker.status_trabajador, '') ILIKE '%baja%'
  ) AND NOT (
    COALESCE(v_worker.status_trabajador, '') ILIKE '%baja medica%'
    OR COALESCE(v_worker.status_trabajador, '') ILIKE '%baja médica%'
  );

  WITH candidates AS (
    SELECT
      COALESCE(
        NULLIF(TRIM(c.trade_name), ''),
        NULLIF(TRIM(c.legal_name), '')
      ) AS cliente_nome,
      COALESCE(NULLIF(TRIM(e.trade_name), ''), NULLIF(TRIM(e.nome), ''), NULLIF(TRIM(e.codigo), '')) AS contratante_nome,
      COALESCE(
        NULLIF(TRIM(wa.job_function_name_snapshot), ''),
        NULLIF(TRIM(pi.job_function_name_snapshot), ''),
        NULLIF(TRIM(jf.name), '')
      ) AS funcion_nome,
      CASE
        WHEN wa.status IN ('active', 'planned', 'paused', 'replaced')
         AND (wa.end_date IS NULL OR wa.end_date::date >= CURRENT_DATE)
        THEN 1
        ELSE 0
      END AS is_active,
      1 AS source_prio,
      COALESCE(wa.end_date, wa.start_date, wa.planned_start_date, wa.created_at::date, DATE '1900-01-01') AS sort_date,
      wa.updated_at AS sort_updated
    FROM core_personal.worker_assignments wa
    JOIN core_personal.workers w ON w.id = wa.worker_id
    LEFT JOIN core_comercial.pedidos p ON p.id = wa.pedido_id
    LEFT JOIN core_common.clients c ON c.id = COALESCE(wa.client_id, p.client_id)
    LEFT JOIN core_common.empresas e ON e.id = wa.empresa_id
    LEFT JOIN core_comercial.pedido_items pi ON pi.id = wa.pedido_item_id
    LEFT JOIN core_comercial.job_functions jf ON jf.id = COALESCE(wa.job_function_id, pi.job_function_id)
    WHERE w.cod_colab = p_cod_colab
      AND wa.status <> 'cancelled'

    UNION ALL

    SELECT
      COALESCE(
        NULLIF(TRIM(c.trade_name), ''),
        NULLIF(TRIM(cpp.cliente_nombre), '')
      ) AS cliente_nome,
      NULLIF(TRIM(cpp.contratante), '') AS contratante_nome,
      NULLIF(TRIM(cpp.funcion), '') AS funcion_nome,
      CASE
        WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador::date >= CURRENT_DATE
        THEN 1
        ELSE 0
      END AS is_active,
      2 AS source_prio,
      COALESCE(cpp.fechasalidatrabajador::date, cpp.fechainiciopedido::date, cpp.inserted_at::date, DATE '1900-01-01') AS sort_date,
      COALESCE(cpp.updated_at, cpp.inserted_at, NOW()) AS sort_updated
    FROM public.colaborador_por_pedido cpp
    LEFT JOIN core_common.clients c
      ON UPPER(TRIM(c.legal_name)) = UPPER(TRIM(cpp.cliente_nombre))
      OR UPPER(TRIM(c.trade_name)) = UPPER(TRIM(cpp.cliente_nombre))
    WHERE cpp.cod_colab = p_cod_colab
  )
  SELECT *
  INTO v_best
  FROM candidates
  WHERE (cliente_nome IS NOT NULL OR contratante_nome IS NOT NULL OR funcion_nome IS NOT NULL)
  ORDER BY is_active DESC, source_prio ASC, sort_date DESC, sort_updated DESC
  LIMIT 1;

  IF v_is_inactive THEN
    -- Trabalhador inativo preserva o último cliente para histórico e filtro de inativos
    UPDATE core_personal.workers w
    SET
      cliente = COALESCE(v_best.cliente_nome, core_personal.fn_get_last_client_for_worker(p_cod_colab), w.cliente),
      contratante = COALESCE(v_best.contratante_nome, w.contratante),
      funcion = COALESCE(v_best.funcion_nome, w.funcion)
    WHERE w.cod_colab = p_cod_colab;
  ELSIF v_best IS NOT NULL THEN
    UPDATE core_personal.workers w
    SET
      cliente = CASE WHEN v_best.is_active = 1 THEN v_best.cliente_nome ELSE COALESCE(v_best.cliente_nome, w.cliente) END,
      contratante = COALESCE(v_best.contratante_nome, w.contratante),
      funcion = COALESCE(v_best.funcion_nome, w.funcion)
    WHERE w.cod_colab = p_cod_colab;

    UPDATE public.colaboradores col
    SET
      contratante = COALESCE(v_best.contratante_nome, col.contratante),
      funcion = COALESCE(v_best.funcion_nome, col.funcion)
    WHERE col.cod_colab = p_cod_colab;
  END IF;
END;
$function$;

-- 3. Restaurar o último cliente em core_personal.workers para trabalhadores que ficaram com cliente NULL ao serem inativados
UPDATE core_personal.workers w
SET cliente = core_personal.fn_get_last_client_for_worker(w.cod_colab)
WHERE (w.cliente IS NULL OR TRIM(w.cliente) = '')
  AND w.cod_colab IS NOT NULL
  AND core_personal.fn_get_last_client_for_worker(w.cod_colab) IS NOT NULL;

-- 4. Atualizar core_personal.get_client_worker_kpis para contabilizar inativos e alertas pelo último cliente quando inativo
--    e estritamente pelo cliente ativo quando ativo
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
                  COALESCE(wa.end_date, wa.start_date, wa.planned_start_date) DESC NULLS LAST
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
            COALESCE(NULLIF(w.contratante, ''), core_personal.fn_get_active_contratante_for_worker(w.cod_colab), c.contratante) as contratante,
            COALESCE(core_personal.fn_get_active_function_for_worker(w.cod_colab), NULLIF(w.funcion, ''), jf.name, c.funcion) as funcion,
            CASE
              WHEN (
                COALESCE(w.status_trabajador, '') ILIKE '%inativ%'
                OR COALESCE(w.status_trabajador, '') ILIKE '%inactiv%'
                OR COALESCE(w.status_trabajador, '') ILIKE '%desligad%'
                OR COALESCE(w.status_trabajador, '') ILIKE '%desist%'
                OR COALESCE(w.status_trabajador, '') ILIKE '%baixa%'
                OR COALESCE(w.status_trabajador, '') ILIKE '%baja%'
              ) AND NOT (
                COALESCE(w.status_trabajador, '') ILIKE '%baja medica%'
                OR COALESCE(w.status_trabajador, '') ILIKE '%baja médica%'
              ) THEN COALESCE(
                core_personal.fn_get_last_client_for_worker(w.cod_colab),
                oa.alerta_cliente,
                NULLIF(TRIM(w.cliente), '')
              )
              ELSE COALESCE(
                core_personal.fn_get_active_client_for_worker(w.cod_colab),
                NULLIF(TRIM(w.cliente), '')
              )
            END as effective_client,
            oa.alerta_tipo,
            COALESCE(oa.alerta_logistica, false) AS alerta_logistica
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
    filtered_kpis AS (
        SELECT
            bw.*,
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
            AND (p_cliente_nombre IS NULL OR cardinality(p_cliente_nombre) = 0 OR bw.effective_client = ANY(p_cliente_nombre))
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

-- 5. Atualizar core_personal.search_workers para usar effective_client (ativo p/ ativos, último p/ inativos)
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
            COALESCE(wa.end_date, wa.start_date, wa.planned_start_date) DESC NULLS LAST
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
          OR COALESCE(w.status_trabajador, '') ILIKE '%baixa%'
          OR COALESCE(w.status_trabajador, '') ILIKE '%baja%'
        ) AND NOT (
          COALESCE(w.status_trabajador, '') ILIKE '%baja medica%'
          OR COALESCE(w.status_trabajador, '') ILIKE '%baja médica%'
        ) THEN COALESCE(
          core_personal.fn_get_last_client_for_worker(w.cod_colab),
          oa.alerta_cliente,
          NULLIF(TRIM(w.cliente), '')
        )
        ELSE COALESCE(
          core_personal.fn_get_active_client_for_worker(w.cod_colab),
          NULLIF(TRIM(w.cliente), '')
        )
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
