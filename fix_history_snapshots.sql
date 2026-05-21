-- 1. Add static columns to worker_status_history to keep snapshots of Empresa and Cliente
ALTER TABLE core_personal.worker_status_history
ADD COLUMN IF NOT EXISTS empresa_nome text,
ADD COLUMN IF NOT EXISTS cliente_nome text;

-- 2. Backfill existing records with the current active state 
-- (This resolves the UI breaking/being empty before the trigger runs)
UPDATE core_personal.worker_status_history h
SET empresa_nome = md.empresa_nome,
    cliente_nome = md.cliente_nome
FROM (
  SELECT 
    w.id as worker_id,
    e.nome AS empresa_nome,
    COALESCE(
      public.fn_get_active_client_for_worker(w.cod_colab),
      (
        SELECT cpp.cliente_nombre 
        FROM public.colaborador_por_pedido cpp
        WHERE cpp.cod_colab = w.cod_colab 
        ORDER BY COALESCE(cpp.fechasalidatrabajador, cpp.fechafinpedido, cpp.fechainiciopedido) DESC NULLS LAST 
        LIMIT 1
      ),
      'Não Alocado'
    ) AS cliente_nome
  FROM core_personal.workers w
  LEFT JOIN core_common.empresas e ON e.id = w.empresa_id
) md
WHERE h.worker_id = md.worker_id
  AND h.empresa_nome IS NULL;

-- 3. Create a trigger function to automatically save the snapshot of empresa and cliente on insert
CREATE OR REPLACE FUNCTION core_personal.fn_populate_history_context()
RETURNS trigger AS $$
BEGIN
  -- Get empresa_nome
  SELECT e.nome INTO NEW.empresa_nome
  FROM core_personal.workers w
  LEFT JOIN core_common.empresas e ON e.id = w.empresa_id
  WHERE w.id = NEW.worker_id;

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
$$ LANGUAGE plpgsql;

-- 4. Attach the trigger to the table
DROP TRIGGER IF EXISTS trg_populate_history_context ON core_personal.worker_status_history;
CREATE TRIGGER trg_populate_history_context
BEFORE INSERT ON core_personal.worker_status_history
FOR EACH ROW
EXECUTE FUNCTION core_personal.fn_populate_history_context();

-- 5. Update the RPC to use the static fields from the table, falling back to dynamic only if needed
CREATE OR REPLACE FUNCTION "core_personal"."get_global_movement_history"("p_empresa_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_nome" "text" DEFAULT NULL::"text", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("id" "uuid", "worker_id" "uuid", "change_type" character varying, "old_value" character varying, "new_value" character varying, "effective_date" "date", "comments" "text", "changed_by" "uuid", "created_at" timestamp with time zone, "worker_nome" "text", "worker_cod_colab" "text", "changed_by_name" "text", "empresa_nome" "text", "cliente_nome" "text")
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
      w.empresa_id,
      COALESCE(
         (u.raw_user_meta_data->>'full_name')::text, 
         u.email::text, 
         'Sistema'
      ) AS changed_by_name,
      -- Use the static snapshot from history if available
      COALESCE(h.empresa_nome, e.nome) AS empresa_nome,
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
      ) AS cliente_nome
    FROM core_personal.worker_status_history h
    LEFT JOIN core_personal.workers w ON w.id = h.worker_id
    LEFT JOIN core_common.empresas e ON e.id = w.empresa_id
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
