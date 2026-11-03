-- ============================================================================
-- Migration: Fix Workers Gallery Active Allocation, Status Sync & Company Leak
-- Date: 2026-11-03
-- ============================================================================

-- 1. Remover trigger legado duplicado em public.colaborador_por_pedido
DROP TRIGGER IF EXISTS trg_sync_worker_active_allocation ON public.colaborador_por_pedido;

-- 2. Auto-encerrar alocações cuja data de fim (end_date) já passou
UPDATE core_personal.worker_assignments
SET status = 'completed',
    updated_at = NOW()
WHERE status IN ('active', 'planned', 'paused', 'replaced')
  AND end_date IS NOT NULL
  AND end_date::date < CURRENT_DATE;

-- 3. Atualizar funções auxiliares de busca de Cliente, Contratante e Função ativos
CREATE OR REPLACE FUNCTION core_personal.fn_get_active_client_for_worker(p_cod_colab text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_common'
AS $function$
DECLARE
  v_client text;
BEGIN
  IF p_cod_colab IS NULL OR btrim(p_cod_colab) = '' THEN
    RETURN NULL;
  END IF;

  WITH candidates AS (
    -- Fonte 1: core_personal.worker_assignments (SOMENTE alocações ativas/vigentes)
    SELECT
      COALESCE(
        NULLIF(TRIM(c.trade_name), ''),
        NULLIF(TRIM(c.legal_name), '')
      ) AS cliente_nome,
      1 AS source_prio,
      COALESCE(wa.start_date, wa.planned_start_date, wa.created_at::date, DATE '1900-01-01') AS sort_date,
      wa.updated_at AS sort_updated
    FROM core_personal.worker_assignments wa
    JOIN core_personal.workers w ON w.id = wa.worker_id
    LEFT JOIN core_comercial.pedidos p ON p.id = wa.pedido_id
    LEFT JOIN core_common.clients c ON c.id = COALESCE(wa.client_id, p.client_id)
    WHERE w.cod_colab = p_cod_colab
      AND wa.status IN ('active', 'planned', 'paused', 'replaced')
      AND (wa.end_date IS NULL OR wa.end_date::date >= CURRENT_DATE)

    UNION ALL

    -- Fonte 2: public.colaborador_por_pedido (SOMENTE registros sem saída ou saída futura)
    SELECT
      COALESCE(
        NULLIF(TRIM(c.trade_name), ''),
        NULLIF(TRIM(cpp.cliente_nombre), '')
      ) AS cliente_nome,
      2 AS source_prio,
      COALESCE(cpp.fechainiciopedido::date, cpp.inserted_at::date, DATE '1900-01-01') AS sort_date,
      COALESCE(cpp.updated_at, cpp.inserted_at, NOW()) AS sort_updated
    FROM public.colaborador_por_pedido cpp
    LEFT JOIN core_common.clients c
      ON UPPER(TRIM(c.legal_name)) = UPPER(TRIM(cpp.cliente_nombre))
      OR UPPER(TRIM(c.trade_name)) = UPPER(TRIM(cpp.cliente_nombre))
    WHERE cpp.cod_colab = p_cod_colab
      AND (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador::date >= CURRENT_DATE)
  )
  SELECT cliente_nome
  INTO v_client
  FROM candidates
  WHERE cliente_nome IS NOT NULL AND cliente_nome <> ''
  ORDER BY source_prio ASC, sort_date DESC, sort_updated DESC
  LIMIT 1;

  RETURN v_client;
END;
$function$;

CREATE OR REPLACE FUNCTION core_personal.fn_get_active_contratante_for_worker(p_cod_colab text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_common'
AS $function$
DECLARE
  v_contratante text;
BEGIN
  IF p_cod_colab IS NULL OR btrim(p_cod_colab) = '' THEN
    RETURN NULL;
  END IF;

  WITH candidates AS (
    SELECT
      COALESCE(NULLIF(TRIM(e.trade_name), ''), NULLIF(TRIM(e.nome), ''), NULLIF(TRIM(e.codigo), '')) AS contratante_nome,
      CASE
        WHEN wa.status IN ('active', 'planned', 'paused', 'replaced')
         AND (wa.end_date IS NULL OR wa.end_date::date >= CURRENT_DATE)
        THEN 1
        ELSE 0
      END AS is_active,
      1 AS source_prio,
      COALESCE(wa.start_date, wa.planned_start_date, wa.created_at::date, DATE '1900-01-01') AS sort_date,
      wa.updated_at AS sort_updated
    FROM core_personal.worker_assignments wa
    JOIN core_personal.workers w ON w.id = wa.worker_id
    LEFT JOIN core_common.empresas e ON e.id = wa.empresa_id
    WHERE w.cod_colab = p_cod_colab
      AND wa.status <> 'cancelled'

    UNION ALL

    SELECT
      NULLIF(TRIM(cpp.contratante), '') AS contratante_nome,
      CASE
        WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador::date >= CURRENT_DATE
        THEN 1
        ELSE 0
      END AS is_active,
      2 AS source_prio,
      COALESCE(cpp.fechainiciopedido::date, cpp.inserted_at::date, DATE '1900-01-01') AS sort_date,
      COALESCE(cpp.updated_at, cpp.inserted_at, NOW()) AS sort_updated
    FROM public.colaborador_por_pedido cpp
    WHERE cpp.cod_colab = p_cod_colab
  )
  SELECT contratante_nome
  INTO v_contratante
  FROM candidates
  WHERE contratante_nome IS NOT NULL AND contratante_nome <> ''
  ORDER BY is_active DESC, source_prio ASC, sort_date DESC, sort_updated DESC
  LIMIT 1;

  RETURN v_contratante;
END;
$function$;

CREATE OR REPLACE FUNCTION core_personal.fn_get_active_function_for_worker(p_cod_colab text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_common'
AS $function$
DECLARE
  v_func text;
BEGIN
  IF p_cod_colab IS NULL OR btrim(p_cod_colab) = '' THEN
    RETURN NULL;
  END IF;

  WITH candidates AS (
    SELECT
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
      COALESCE(wa.start_date, wa.planned_start_date, wa.created_at::date, DATE '1900-01-01') AS sort_date,
      wa.updated_at AS sort_updated
    FROM core_personal.worker_assignments wa
    JOIN core_personal.workers w ON w.id = wa.worker_id
    LEFT JOIN core_comercial.pedido_items pi ON pi.id = wa.pedido_item_id
    LEFT JOIN core_comercial.job_functions jf ON jf.id = COALESCE(wa.job_function_id, pi.job_function_id)
    WHERE w.cod_colab = p_cod_colab
      AND wa.status <> 'cancelled'

    UNION ALL

    SELECT
      NULLIF(TRIM(cpp.funcion), '') AS funcion_nome,
      CASE
        WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador::date >= CURRENT_DATE
        THEN 1
        ELSE 0
      END AS is_active,
      2 AS source_prio,
      COALESCE(cpp.fechainiciopedido::date, cpp.inserted_at::date, DATE '1900-01-01') AS sort_date,
      COALESCE(cpp.updated_at, cpp.inserted_at, NOW()) AS sort_updated
    FROM public.colaborador_por_pedido cpp
    WHERE cpp.cod_colab = p_cod_colab
  )
  SELECT funcion_nome
  INTO v_func
  FROM candidates
  WHERE funcion_nome IS NOT NULL AND funcion_nome <> ''
  ORDER BY is_active DESC, source_prio ASC, sort_date DESC, sort_updated DESC
  LIMIT 1;

  RETURN v_func;
END;
$function$;

-- 4. Atualizar core_personal.fn_sync_worker_active_fields_by_cod
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
      COALESCE(wa.start_date, wa.planned_start_date, wa.created_at::date, DATE '1900-01-01') AS sort_date,
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
      COALESCE(cpp.fechainiciopedido::date, cpp.inserted_at::date, DATE '1900-01-01') AS sort_date,
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
    -- Trabalhador inativo/desligado NUNCA deve manter cliente ativo na galeria
    UPDATE core_personal.workers w
    SET
      cliente = NULL,
      contratante = COALESCE(v_best.contratante_nome, w.contratante),
      funcion = COALESCE(v_best.funcion_nome, w.funcion)
    WHERE w.cod_colab = p_cod_colab;
  ELSIF v_best IS NOT NULL THEN
    UPDATE core_personal.workers w
    SET
      cliente = CASE WHEN v_best.is_active = 1 THEN v_best.cliente_nome ELSE NULL END,
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

-- 5. Atualizar core_personal.get_client_worker_kpis (corrigindo vazamento entre empresas e priorizando alocação ativa real)
CREATE OR REPLACE FUNCTION core_personal.get_client_worker_kpis(
  p_empresa_id uuid,
  p_search text DEFAULT NULL::text,
  p_cliente_nombre text[] DEFAULT NULL::text[],
  p_contratante text DEFAULT NULL::text,
  p_funcion text DEFAULT NULL::text
)
RETURNS TABLE(
  ativos bigint,
  inativos bigint,
  pendentes_ingreso bigint,
  seguridade_alta bigint,
  seguridade_pendente_alta bigint,
  seguridade_em_regularizacao bigint,
  seguridade_baixa bigint,
  seguridade_pendente_baixa bigint
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
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint;
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
        SELECT bw.*
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
            AND (p_cliente_nombre IS NULL OR cardinality(p_cliente_nombre) = 0 OR bw.active_client = ANY(p_cliente_nombre))
    )
    SELECT 
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Ativo%' OR wk.status_trabajador ILIKE 'Activo%')::bigint AS ativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Inativo%' OR wk.status_trabajador ILIKE 'Inactivo%' OR wk.status_trabajador ILIKE 'Desligado%' OR wk.status_trabajador ILIKE 'Desistiu%')::bigint AS inativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE '%Pendente%' OR wk.status_trabajador ILIKE '%Pendiente%')::bigint AS pendentes_ingreso,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Alta')::bigint AS seguridade_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendente Alta' OR wk.status_seguridad ILIKE 'Pendiente Alta')::bigint AS seguridade_pendente_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Em Regulariza%' OR wk.status_seguridad ILIKE 'En Regulariza%')::bigint AS seguridade_em_regularizacao,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Baixa' OR wk.status_seguridad ILIKE 'Baja' OR wk.status_seguridad ILIKE 'Anulado')::bigint AS seguridade_baixa,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendente Baixa' OR wk.status_seguridad ILIKE 'Pendiente Baja')::bigint AS seguridade_pendente_baixa
    FROM filtered_kpis wk;
END;
$function$;

-- 6. Atualizar core_personal.search_workers (corrigindo vazamento entre empresas e priorizando alocação ativa real)
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
  p_period_year integer DEFAULT NULL::integer
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
  created_at timestamp with time zone
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
      END as active_client_nombre
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
          EXISTS (
            SELECT 1 FROM unnest(coalesce(bw.telefones_adicionais, '{}'::text[])) AS tp
            WHERE tp ILIKE '%' || TRIM(p_search) || '%'
          )
        )
      )
      AND (p_cliente_nombre IS NULL OR cardinality(p_cliente_nombre) = 0 OR bw.active_client_nombre = ANY(p_cliente_nombre))
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
  ),
  total AS (
    SELECT COUNT(*) AS exact_count FROM filtered
  )
  SELECT 
    (SELECT exact_count FROM total) AS total_count,
    f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.active_client_nombre as cliente_nombre, f.created_at
  FROM filtered f
  ORDER BY
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

-- 7. Atualizar core_personal.fn_auto_activate_due_workers para não ativar trabalhadores com alocações canceladas via data_ingresso antiga
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
    -- 0. Encerrar alocações cuja data de fim (end_date) já passou
    UPDATE core_personal.worker_assignments
    SET status = 'completed',
        updated_at = NOW()
    WHERE status IN ('active', 'planned', 'paused', 'replaced')
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
                  w.status_trabajador IS NULL 
                  OR w.status_trabajador ILIKE '%Pendente%Ingresso%'
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
                  w.status_trabajador IS NULL 
                  OR w.status_trabajador ILIKE '%Pendente%Ingresso%'
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
            contratante = COALESCE(r.novo_contratante, contratante),
            status_seguridad = CASE 
                WHEN status_seguridad ILIKE '%Pendente%Alta%' OR status_seguridad ILIKE '%Pendiente%Alta%' THEN 'Alta'
                ELSE status_seguridad
            END
        WHERE id = r.worker_id;

        UPDATE public.colaboradores
        SET 
            status_trabajador = 'Ativo',
            contratante = COALESCE(r.novo_contratante, contratante),
            status_seguridad = CASE 
                WHEN status_seguridad ILIKE '%Pendente%Alta%' OR status_seguridad ILIKE '%Pendiente%Alta%' THEN 'Alta'
                ELSE status_seguridad
            END
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

    -- 2. Atualiza também cards de seguridade pendente de alta com data <= CURRENT_DATE para confirmado
    UPDATE core_personal.seguridade_status
    SET 
        status = 'confirmado',
        data_efetiva = COALESCE(data_efetiva, CURRENT_DATE),
        observacoes = COALESCE(observacoes || ' | ', '') || 'Confirmado automaticamente pelo cron diário',
        updated_at = NOW()
    WHERE tipo_evento = 'alta'
      AND status = 'pendente'
      AND COALESCE(data_efetiva, data_solicitacao::date) <= CURRENT_DATE;

    -- 3. Atualiza alocações com planned_start_date <= CURRENT_DATE de 'planned' para 'active'
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

-- 8. Saneamento de dados inconsistentes identificados na auditoria

-- 8.1 E2326 (CARMELO ALVAREZ GUERRA): Reabrir alocação na COMESA SL que foi marcada completed 1 min antes da ativação em 20/10/2026
UPDATE core_personal.worker_assignments
SET status = 'active',
    end_date = NULL,
    updated_at = NOW()
WHERE id = '792e334d-a367-4cd3-8cdc-dd2d62412751';

-- 8.2 E1162 (WALDIR ENRIQUE VERGARA PACHECO): Foi ativado indevidamente pelo Cron após desistir da alocação de Outubro
UPDATE core_personal.workers
SET status_trabajador = 'Inativo',
    data_baixa = COALESCE(data_baixa, DATE '2026-10-08'),
    cliente = NULL
WHERE cod_colab = 'E1162';

UPDATE public.colaboradores
SET status_trabajador = 'Inativo'
WHERE cod_colab = 'E1162';

-- 8.3 Encerrar linhas legadas de public.colaborador_por_pedido (ex: CARGA INICIAL) para trabalhadores que já estão Inativos/Desligados
UPDATE public.colaborador_por_pedido cpp
SET fechasalidatrabajador = COALESCE(w.data_baixa, cpp.fechainiciopedido, CURRENT_DATE - 1),
    updated_at = NOW()
FROM core_personal.workers w
WHERE w.cod_colab = cpp.cod_colab
  AND cpp.fechasalidatrabajador IS NULL
  AND (
    COALESCE(w.status_trabajador, '') ILIKE '%inativ%'
    OR COALESCE(w.status_trabajador, '') ILIKE '%inactiv%'
    OR COALESCE(w.status_trabajador, '') ILIKE '%desligad%'
    OR COALESCE(w.status_trabajador, '') ILIKE '%desist%'
  );

-- 8.4 Encerrar linhas legadas de public.colaborador_por_pedido quando o trabalhador já possui uma alocação mais recente em core_personal.worker_assignments
UPDATE public.colaborador_por_pedido cpp
SET fechasalidatrabajador = COALESCE(
      (
        SELECT GREATEST(
          COALESCE(cpp.fechainiciopedido::date, DATE '2025-01-01'),
          COALESCE(wa.start_date, wa.planned_start_date) - 1
        )
        FROM core_personal.worker_assignments wa
        WHERE wa.worker_id = w.id
          AND wa.status IN ('active', 'planned', 'paused', 'replaced')
          AND (wa.end_date IS NULL OR wa.end_date >= CURRENT_DATE)
        ORDER BY COALESCE(wa.start_date, wa.planned_start_date) DESC
        LIMIT 1
      ),
      CURRENT_DATE - 1
    ),
    updated_at = NOW()
FROM core_personal.workers w
WHERE w.cod_colab = cpp.cod_colab
  AND cpp.fechasalidatrabajador IS NULL
  AND EXISTS (
    SELECT 1
    FROM core_personal.worker_assignments wa
    LEFT JOIN core_comercial.pedidos p ON p.id = wa.pedido_id
    LEFT JOIN core_common.clients c ON c.id = COALESCE(wa.client_id, p.client_id)
    WHERE wa.worker_id = w.id
      AND wa.status IN ('active', 'planned', 'paused', 'replaced')
      AND (wa.end_date IS NULL OR wa.end_date >= CURRENT_DATE)
      AND COALESCE(wa.start_date, wa.planned_start_date, CURRENT_DATE) > COALESCE(cpp.fechainiciopedido::date, DATE '1900-01-01')
      AND UPPER(TRIM(COALESCE(c.trade_name, c.legal_name, ''))) <> UPPER(TRIM(COALESCE(cpp.cliente_nombre, '')))
  );

-- 8.5 Ressincronizar todos os trabalhadores a partir das alocações vigentes reais
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT cod_colab FROM core_personal.workers WHERE cod_colab IS NOT NULL LOOP
    PERFORM core_personal.fn_sync_worker_active_fields_by_cod(r.cod_colab);
  END LOOP;
END;
$$;

-- 9. Atualizar core_personal.alocar_trabalhador_em_vaga para encerrar alocações passadas e validar alocações ativas vigentes
CREATE OR REPLACE FUNCTION core_personal.alocar_trabalhador_em_vaga(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_empresa_id UUID;
    v_pedido_item_id UUID;
    v_worker_id UUID;
    v_worker_name TEXT;
    v_worker_document TEXT;
    v_planned_start_date DATE;
    v_planned_end_date DATE;
    v_solicitud_id UUID;
    v_solicitud_target_id UUID;
    v_notes TEXT;
    v_camiseta TEXT;
    v_pantalones TEXT;
    v_licencia_conducir TEXT;
    v_movil TEXT;
    v_tarifa_acordada NUMERIC;

    -- Variáveis resolvidas
    v_pedido_id UUID;
    v_job_function_id UUID;
    v_job_function_name TEXT;
    v_client_id UUID;
    v_client_site_id UUID;
    v_contratante_nome TEXT;
    v_existing_worker RECORD;
    v_existing_active_assignment UUID;
    v_new_assignment_id UUID := gen_random_uuid();
    v_assignment_status VARCHAR;
    v_start_date DATE;
    v_source_assignment_id UUID;
    v_total_items INT;
    v_fulfilled_items INT;
    v_new_operational_status VARCHAR;
    v_worker_status_trabajador VARCHAR;
    v_worker_cod_colab TEXT;
    
    v_target_jf_id UUID;
    v_target_jf_name TEXT;
BEGIN
    -- 1. Extração de Parâmetros
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_pedido_item_id := (payload->>'pedido_item_id')::uuid;
    v_worker_id := (payload->>'worker_id')::uuid;
    v_worker_name := payload->>'worker_name';
    v_worker_document := payload->>'worker_document';
    v_planned_start_date := (payload->>'planned_start_date')::date;
    v_planned_end_date := (payload->>'planned_end_date')::date;
    v_solicitud_id := (payload->>'solicitud_id')::uuid;
    v_solicitud_target_id := (payload->>'solicitud_target_id')::uuid;
    v_notes := payload->>'notes';
    v_camiseta := payload->>'camiseta';
    v_pantalones := payload->>'pantalones';
    v_licencia_conducir := payload->>'licencia_conducir';
    v_movil := payload->>'movil';
    v_tarifa_acordada := (payload->>'tarifa_acordada')::numeric;

    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'O campo empresa_id é obrigatório.';
    END IF;

    IF v_planned_start_date IS NULL THEN
        RAISE EXCEPTION 'A data de início prevista é obrigatória.';
    END IF;

    -- 2. Resolver informações do Pedido Item se fornecido
    IF v_pedido_item_id IS NOT NULL THEN
        SELECT 
            pi.pedido_id, 
            pi.job_function_id, 
            COALESCE(pi.job_function_name_snapshot, jf.name, 'Função'),
            p.client_id, 
            p.client_site_id
        INTO 
            v_pedido_id, 
            v_job_function_id, 
            v_job_function_name, 
            v_client_id, 
            v_client_site_id
        FROM core_comercial.pedido_items pi
        JOIN core_comercial.pedidos p ON p.id = pi.pedido_id
        LEFT JOIN core_comercial.job_functions jf ON jf.id = pi.job_function_id
        WHERE pi.id = v_pedido_item_id;

        IF v_pedido_id IS NULL THEN
            RAISE EXCEPTION 'Item do pedido não encontrado.';
        END IF;
    END IF;

    -- 3. Resolver informações da Solicitude (Reemplazo) se aplicável
    IF v_solicitud_target_id IS NOT NULL THEN
        SELECT 
            COALESCE(v_pedido_id, st.source_pedido_id, s.pedido_id),
            COALESCE(v_pedido_item_id, st.source_pedido_item_id),
            COALESCE(v_client_id, st.source_client_id, s.client_id),
            COALESCE(v_client_site_id, st.source_client_site_id, s.client_site_id),
            st.source_assignment_id,
            st.target_job_function_id,
            st.target_job_function_name,
            st.solicitud_id
        INTO 
            v_pedido_id, 
            v_pedido_item_id,
            v_client_id, 
            v_client_site_id, 
            v_source_assignment_id, 
            v_target_jf_id, 
            v_target_jf_name, 
            v_solicitud_id
        FROM core_operacoes.solicitud_targets st
        JOIN core_operacoes.solicitudes_operativas s ON s.id = st.solicitud_id
        WHERE st.id = v_solicitud_target_id;

        IF v_target_jf_id IS NOT NULL THEN
            v_job_function_id := v_target_jf_id;
            v_job_function_name := COALESCE(v_target_jf_name, (SELECT name FROM core_comercial.job_functions WHERE id = v_target_jf_id), v_job_function_name);
        ELSIF v_target_jf_name IS NOT NULL AND TRIM(v_target_jf_name) != '' THEN
            v_job_function_name := v_target_jf_name;
        END IF;
    ELSIF v_solicitud_id IS NOT NULL THEN
        SELECT 
            COALESCE(v_pedido_id, st.source_pedido_id, s.pedido_id),
            COALESCE(v_pedido_item_id, st.source_pedido_item_id),
            COALESCE(v_client_id, s.client_id),
            COALESCE(v_client_site_id, s.client_site_id),
            st.source_assignment_id,
            st.target_job_function_id,
            st.target_job_function_name
        INTO 
            v_pedido_id, 
            v_pedido_item_id,
            v_client_id, 
            v_client_site_id, 
            v_source_assignment_id, 
            v_target_jf_id, 
            v_target_jf_name
        FROM core_operacoes.solicitudes_operativas s
        LEFT JOIN core_operacoes.solicitud_targets st ON st.solicitud_id = s.id 
          AND (v_pedido_item_id IS NULL OR st.source_pedido_item_id = v_pedido_item_id)
          AND st.status IN ('pending', 'in_progress')
        WHERE s.id = v_solicitud_id
        ORDER BY st.created_at ASC
        LIMIT 1;

        IF v_target_jf_id IS NOT NULL THEN
            v_job_function_id := v_target_jf_id;
            v_job_function_name := COALESCE(v_target_jf_name, (SELECT name FROM core_comercial.job_functions WHERE id = v_target_jf_id), v_job_function_name);
        ELSIF v_target_jf_name IS NOT NULL AND TRIM(v_target_jf_name) != '' THEN
            v_job_function_name := v_target_jf_name;
        END IF;
    END IF;

    -- Fallback/Override explícito de client e job_function vindo do payload se informado
    IF payload->>'client_id' IS NOT NULL AND TRIM(payload->>'client_id') != '' THEN
        v_client_id := (payload->>'client_id')::uuid;
    END IF;
    IF payload->>'client_site_id' IS NOT NULL AND TRIM(payload->>'client_site_id') != '' THEN
        v_client_site_id := (payload->>'client_site_id')::uuid;
    END IF;
    IF payload->>'job_function_id' IS NOT NULL AND TRIM(payload->>'job_function_id') != '' THEN
        v_job_function_id := (payload->>'job_function_id')::uuid;
    END IF;
    IF payload->>'job_function_name' IS NOT NULL AND TRIM(payload->>'job_function_name') != '' THEN
        v_job_function_name := TRIM(payload->>'job_function_name');
    END IF;
    v_job_function_name := COALESCE(v_job_function_name, 'Função');

    -- 4. REGRA DE BLOQUEIO DE DUPLICAÇÃO OU CONTRATAÇÃO DE TRABALHADOR JÁ ATIVO
    IF v_worker_id IS NULL THEN
        IF v_worker_document IS NOT NULL AND TRIM(v_worker_document) != '' THEN
            SELECT id, nome, cod_colab INTO v_existing_worker
            FROM core_personal.workers
            WHERE (nif IS NOT NULL AND TRIM(UPPER(nif)) = TRIM(UPPER(v_worker_document)))
               OR (pasaporte IS NOT NULL AND TRIM(UPPER(pasaporte)) = TRIM(UPPER(v_worker_document)))
               OR (dni IS NOT NULL AND TRIM(UPPER(dni)) = TRIM(UPPER(v_worker_document)))
               OR (nie IS NOT NULL AND TRIM(UPPER(nie)) = TRIM(UPPER(v_worker_document)))
            ORDER BY created_at ASC
            LIMIT 1;

            IF v_existing_worker.id IS NOT NULL THEN
                RAISE EXCEPTION 'Já existe um trabalhador cadastrado com este documento (%): "%" (Cód: %). Por favor, selecione a opção "Trabalhador Existente" para alocá-lo.', 
                    v_worker_document, v_existing_worker.nome, v_existing_worker.cod_colab;
            END IF;
        END IF;

        IF v_worker_name IS NULL OR TRIM(v_worker_name) = '' THEN
            RAISE EXCEPTION 'Nome do trabalhador é obrigatório para novos cadastros.';
        END IF;

        SELECT id, nome, cod_colab INTO v_existing_worker
        FROM core_personal.workers
        WHERE UPPER(TRIM(nome)) = UPPER(TRIM(v_worker_name))
        ORDER BY created_at ASC
        LIMIT 1;

        IF v_existing_worker.id IS NOT NULL THEN
            v_worker_id := v_existing_worker.id;
        ELSE
            SELECT COALESCE(trade_name, nome) INTO v_contratante_nome
            FROM core_common.empresas
            WHERE id = v_empresa_id;

            INSERT INTO core_personal.workers (
                nome,
                pasaporte,
                camiseta,
                pantalones,
                licencia_conducir,
                movil,
                status_trabajador,
                status_seguridad,
                funcion,
                contratante
            )
            VALUES (
                TRIM(v_worker_name),
                NULLIF(TRIM(v_worker_document), ''),
                v_camiseta,
                v_pantalones,
                v_licencia_conducir,
                v_movil,
                'Pendente Ingresso',
                'Em Regularização',
                v_job_function_name,
                v_contratante_nome
            )
            RETURNING id INTO v_worker_id;
        END IF;
    END IF;

    -- Se v_worker_id foi reutilizado de um existente ou fornecido no payload:
    IF v_worker_id IS NOT NULL THEN
        -- Encerrar automaticamente alocações anteriores cuja data fim já tenha passado antes do início desta nova alocação
        UPDATE core_personal.worker_assignments
        SET status = 'completed',
            updated_at = NOW()
        WHERE worker_id = v_worker_id
          AND status IN ('active', 'planned', 'paused', 'replaced')
          AND end_date IS NOT NULL
          AND end_date::date < v_planned_start_date;

        -- Validação de Alocação Ativa concorrente (sem data fim ou com data fim >= início previsto)
        SELECT id INTO v_existing_active_assignment
        FROM core_personal.worker_assignments
        WHERE worker_id = v_worker_id
          AND status IN ('planned', 'active')
          AND (end_date IS NULL OR end_date::date >= v_planned_start_date)
        LIMIT 1;

        IF v_existing_active_assignment IS NOT NULL THEN
            RAISE EXCEPTION 'Este trabalhador já possui uma alocação ativa ou planejada sem data de saída anterior a % (ID: %). Informe a data de saída/baixa na alocação anterior primeiro.',
                to_char(v_planned_start_date, 'DD/MM/YYYY'), v_existing_active_assignment;
        END IF;

        -- 5. Atualizar perfil e status do trabalhador
        IF v_planned_start_date > CURRENT_DATE THEN
            v_assignment_status := 'planned';
            v_worker_status_trabajador := 'Pendente Ingresso';
            v_start_date := NULL;
        ELSE
            v_assignment_status := 'active';
            v_worker_status_trabajador := 'Ativo';
            v_start_date := v_planned_start_date;
        END IF;

        -- Buscar nome CORRETO da empresa contratante (NUNCA o cliente!)
        SELECT COALESCE(trade_name, nome) INTO v_contratante_nome
        FROM core_common.empresas
        WHERE id = v_empresa_id;

        UPDATE core_personal.workers
        SET 
            status_trabajador = v_worker_status_trabajador,
            status_seguridad = CASE 
                WHEN status_seguridad = 'Alta' THEN 'Alta'
                WHEN (niss IS NOT NULL AND length(regexp_replace(niss, '[^0-9]', '', 'g')) = 11)
                     AND (nif IS NOT NULL AND length(regexp_replace(nif, '[^0-9]', '', 'g')) >= 9)
                     THEN status_seguridad
                ELSE 'Em Regularização'
            END,
            cliente = COALESCE((SELECT COALESCE(trade_name, legal_name) FROM core_common.clients WHERE id = v_client_id), cliente),
            contratante = COALESCE(v_contratante_nome, contratante),
            funcion = COALESCE(v_job_function_name, funcion),
            camiseta = COALESCE(v_camiseta, camiseta),
            pantalones = COALESCE(v_pantalones, pantalones),
            licencia_conducir = COALESCE(v_licencia_conducir, licencia_conducir),
            movil = COALESCE(v_movil, movil),
            pasaporte = COALESCE(NULLIF(TRIM(v_worker_document), ''), pasaporte),
            data_baixa = NULL,
            departure_reason = NULL
        WHERE id = v_worker_id
        RETURNING cod_colab INTO v_worker_cod_colab;

        -- Sincronizar com public.colaboradores
        IF v_worker_cod_colab IS NOT NULL THEN
            UPDATE public.colaboradores
            SET
                status_trabajador = v_worker_status_trabajador,
                status_seguridad = CASE 
                    WHEN status_seguridad = 'Alta' THEN 'Alta'
                    ELSE 'Em Regularização'
                END,
                contratante = COALESCE(v_contratante_nome, contratante),
                funcion = COALESCE(v_job_function_name, funcion),
                camiseta = COALESCE(v_camiseta, camiseta),
                pantalones = COALESCE(v_pantalones, pantalones),
                licencia_conducir = COALESCE(v_licencia_conducir, licencia_conducir),
                movil = COALESCE(v_movil, movil),
                pasaporte = COALESCE(NULLIF(TRIM(v_worker_document), ''), pasaporte)
            WHERE cod_colab = v_worker_cod_colab;
        END IF;
    END IF;

    -- 6. Se for uma substituição, finalizamos a alocação de origem
    IF v_source_assignment_id IS NOT NULL THEN
        UPDATE core_personal.worker_assignments
        SET status = 'replaced',
            end_date = v_planned_start_date - 1
        WHERE id = v_source_assignment_id;
    END IF;

    -- 7. Criar registro de Alocação
    INSERT INTO core_personal.worker_assignments (
        id, empresa_id, worker_id, pedido_item_id, pedido_id, job_function_id, client_id, client_site_id,
        planned_start_date, planned_end_date, start_date, status, notes,
        job_function_name_snapshot, replacement_of_assignment_id, solicitud_id,
        tarifa_acordada
    )
    VALUES (
        v_new_assignment_id,
        v_empresa_id,
        v_worker_id,
        v_pedido_item_id,
        v_pedido_id,
        v_job_function_id,
        v_client_id,
        v_client_site_id,
        v_planned_start_date,
        v_planned_end_date,
        v_start_date,
        v_assignment_status,
        v_notes,
        v_job_function_name,
        v_source_assignment_id,
        v_solicitud_id,
        v_tarifa_acordada
    );

    -- 8. Atualizar quantidade preenchida e status no Pedido Item se aplicável
    IF v_pedido_item_id IS NOT NULL THEN
        UPDATE core_comercial.pedido_items pi
        SET quantity_fulfilled = GREATEST(
            CASE WHEN v_solicitud_id IS NULL THEN COALESCE(pi.quantity_fulfilled, 0) + 1 ELSE COALESCE(pi.quantity_fulfilled, 0) END,
            (
                SELECT COUNT(*)::int
                FROM core_personal.worker_assignments wa
                WHERE wa.pedido_item_id = pi.id
                  AND wa.status IN ('planned', 'active', 'paused')
            )
        ),
        status = CASE
            WHEN GREATEST(
                CASE WHEN v_solicitud_id IS NULL THEN COALESCE(pi.quantity_fulfilled, 0) + 1 ELSE COALESCE(pi.quantity_fulfilled, 0) END,
                (
                    SELECT COUNT(*)::int
                    FROM core_personal.worker_assignments wa
                    WHERE wa.pedido_item_id = pi.id
                      AND wa.status IN ('planned', 'active', 'paused')
                )
            ) >= pi.quantity_requested THEN 'fulfilled'
            ELSE pi.status
        END,
        updated_at = NOW()
        WHERE pi.id = v_pedido_item_id;
    END IF;

    -- Se associado a uma solicitude, marcar o target correspondente como concluído
    IF v_solicitud_target_id IS NOT NULL THEN
        UPDATE core_operacoes.solicitud_targets
        SET status = 'completed',
            target_worker_id = v_worker_id,
            target_assignment_id = v_new_assignment_id,
            updated_at = NOW()
        WHERE id = v_solicitud_target_id;
    ELSIF v_solicitud_id IS NOT NULL THEN
        UPDATE core_operacoes.solicitud_targets
        SET status = 'completed',
            target_worker_id = v_worker_id,
            target_assignment_id = v_new_assignment_id,
            updated_at = NOW()
        WHERE id = (
            SELECT id FROM core_operacoes.solicitud_targets
            WHERE solicitud_id = v_solicitud_id
              AND status IN ('pending', 'in_progress')
              AND (v_source_assignment_id IS NULL OR source_assignment_id = v_source_assignment_id)
            ORDER BY created_at ASC
            LIMIT 1
        );
    END IF;

    -- Se todos os targets da solicitude estiverem concluídos, concluir a solicitude
    IF v_solicitud_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM core_operacoes.solicitud_targets
        WHERE solicitud_id = v_solicitud_id AND status IN ('pending', 'in_progress')
    ) THEN
        UPDATE core_operacoes.solicitudes_operativas
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = v_solicitud_id;
    END IF;

    -- 9. Atualizar Operational Status do Pedido Comercial se aplicável
    IF v_pedido_id IS NOT NULL THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'fulfilled' OR quantity_fulfilled >= quantity_requested)
        INTO v_total_items, v_fulfilled_items
        FROM core_comercial.pedido_items
        WHERE pedido_id = v_pedido_id;

        IF v_fulfilled_items = v_total_items THEN
            v_new_operational_status := 'fulfilled';
        ELSE
            v_new_operational_status := 'partially_fulfilled';
        END IF;

        UPDATE core_comercial.pedidos
        SET operational_status = v_new_operational_status,
            updated_at = NOW()
        WHERE id = v_pedido_id;
    END IF;

    -- 10. Retornar dados da alocação criada
    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', v_new_assignment_id,
        'worker_id', v_worker_id,
        'status', v_assignment_status
    );
END;
$function$;
