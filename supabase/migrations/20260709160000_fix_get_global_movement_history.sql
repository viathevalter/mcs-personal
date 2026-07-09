-- =========================================================================
-- MIGRATION: FIX GET_GLOBAL_MOVEMENT_HISTORY AND FN_POPULATE_HISTORY_CONTEXT Fallback
-- =========================================================================

-- 1. Redefine trigger function to include fallback to workers.contratante
CREATE OR REPLACE FUNCTION core_personal.fn_populate_history_context()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- Get the most recent contract company ID
  SELECT cnt.empresa_id INTO v_empresa_id
  FROM core_personal.contracts cnt
  WHERE cnt.worker_id = NEW.worker_id
  ORDER BY cnt.created_at DESC
  LIMIT 1;

  -- Get empresa_nome using that company ID
  IF v_empresa_id IS NOT NULL THEN
    SELECT e.nome INTO NEW.empresa_nome
    FROM core_common.empresas e
    WHERE e.id = v_empresa_id;
  END IF;

  -- Fallback to workers.contratante if still null
  IF NEW.empresa_nome IS NULL THEN
    SELECT ec.nome INTO NEW.empresa_nome
    FROM core_personal.workers w
    JOIN core_common.empresas ec ON UPPER(TRIM(ec.nome)) = UPPER(TRIM(w.contratante))
    WHERE w.id = NEW.worker_id
    LIMIT 1;
  END IF;

  -- Get cliente_nome using the active client logic at the exact moment of insertion
  SELECT COALESCE(
    public.fn_get_active_client_for_worker(w.cod_colab),
    (
      SELECT cpp.cliente_nombre 
      FROM public.colaborador_por_pedido cpp
      WHERE cpp.cod_colab = w.cod_colab 
      ORDER BY COALESCE(cpp.fechasalidatrabajador, cpp.fechafinpedido, cpp.fechainiciopedido) DESC NULLS LAST 
      LIMIT 1
    ),
    'Não Alocado'
  ) INTO NEW.cliente_nome
  FROM core_personal.workers w
  WHERE w.id = NEW.worker_id;

  RETURN NEW;
END;
$function$;

-- 2. Redefine the get_global_movement_history function to be independent of w.empresa_id
CREATE OR REPLACE FUNCTION "core_personal"."get_global_movement_history"(
  "p_empresa_id" "uuid" DEFAULT NULL::"uuid", 
  "p_cliente_nome" "text" DEFAULT NULL::"text", 
  "p_start_date" "date" DEFAULT NULL::"date", 
  "p_end_date" "date" DEFAULT NULL::"date"
) RETURNS TABLE(
  "id" "uuid", 
  "worker_id" "uuid", 
  "change_type" character varying, 
  "old_value" character varying, 
  "new_value" character varying, 
  "effective_date" "date", 
  "comments" "text", 
  "changed_by" "uuid", 
  "created_at" timestamp with time zone, 
  "worker_nome" "text", 
  "worker_cod_colab" "text", 
  "changed_by_name" "text", 
  "empresa_nome" "text", 
  "cliente_nome" "text"
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH movement_data AS (
    SELECT 
      h.id,
      h.worker_id,
      h.change_type,
      h.old_value,
      h.new_value,
      h.effective_date,
      h.comments,
      h.changed_by,
      h.created_at,
      w.nome AS worker_nome,
      w.cod_colab AS worker_cod_colab,
      COALESCE(
         (u.raw_user_meta_data->>'full_name')::text, 
         u.email::text, 
         'Sistema'
      ) AS changed_by_name,
      -- Use the static snapshot from history if available, then fallback to contract, then to workers.contratante
      COALESCE(
        h.empresa_nome, 
        (
          SELECT ec.nome
          FROM core_personal.contracts cnt
          JOIN core_common.empresas ec ON ec.id = cnt.empresa_id
          WHERE cnt.worker_id = h.worker_id
          ORDER BY cnt.created_at DESC
          LIMIT 1
        ),
        (
          SELECT ec.nome
          FROM core_common.empresas ec
          WHERE UPPER(TRIM(ec.nome)) = UPPER(TRIM(w.contratante))
          LIMIT 1
        ),
        'Não definida'
      ) AS empresa_nome,
      COALESCE(
        h.cliente_nome,
        public.fn_get_active_client_for_worker(w.cod_colab),
        (
          SELECT cpp.cliente_nombre 
          FROM public.colaborador_por_pedido cpp
          WHERE cpp.cod_colab = w.cod_colab 
          ORDER BY COALESCE(cpp.fechasalidatrabajador, cpp.fechafinpedido, cpp.fechainiciopedido) DESC NULLS LAST 
          LIMIT 1
        ),
        'Não Alocado'
      ) AS cliente_nome,
      -- Calculate empresa_id to support filtering
      COALESCE(
        (
          SELECT cnt.empresa_id
          FROM core_personal.contracts cnt
          WHERE cnt.worker_id = h.worker_id
          ORDER BY cnt.created_at DESC
          LIMIT 1
        ),
        (
          SELECT ec.id
          FROM core_common.empresas ec
          WHERE UPPER(TRIM(ec.nome)) = UPPER(TRIM(w.contratante))
          LIMIT 1
        ),
        (
          SELECT ec.id
          FROM core_common.empresas ec
          WHERE UPPER(TRIM(ec.nome)) = UPPER(TRIM(h.empresa_nome))
          LIMIT 1
        )
      ) AS empresa_id
    FROM core_personal.worker_status_history h
    LEFT JOIN core_personal.workers w ON w.id = h.worker_id
    LEFT JOIN auth.users u ON u.id = h.changed_by
    WHERE 
      (p_start_date IS NULL OR h.created_at >= p_start_date::timestamp) AND
      (p_end_date IS NULL OR h.created_at <= (p_end_date + interval '1 day')::timestamp)
  )
  SELECT 
    md.id,
    md.worker_id,
    md.change_type,
    md.old_value,
    md.new_value,
    md.effective_date,
    md.comments,
    md.changed_by,
    md.created_at,
    md.worker_nome,
    md.worker_cod_colab,
    md.changed_by_name,
    md.empresa_nome,
    md.cliente_nome
  FROM movement_data md
  WHERE 
    (p_empresa_id IS NULL OR md.empresa_id = p_empresa_id) AND
    (p_cliente_nome IS NULL OR p_cliente_nome = 'all' OR md.cliente_nome ILIKE '%' || p_cliente_nome || '%')
  ORDER BY md.created_at DESC
  LIMIT 500;
END;
$$;

-- 3. Backfill any remaining null/unassigned empresa_nome fields
UPDATE core_personal.worker_status_history h
SET empresa_nome = COALESCE(
  (
    SELECT ec.nome
    FROM core_personal.contracts cnt
    JOIN core_common.empresas ec ON ec.id = cnt.empresa_id
    WHERE cnt.worker_id = h.worker_id
    ORDER BY cnt.created_at DESC
    LIMIT 1
  ),
  (
    SELECT ec.nome
    FROM core_personal.workers w
    JOIN core_common.empresas ec ON UPPER(TRIM(ec.nome)) = UPPER(TRIM(w.contratante))
    WHERE w.id = h.worker_id
    LIMIT 1
  )
)
WHERE h.empresa_nome IS NULL OR h.empresa_nome = 'Não definida';
