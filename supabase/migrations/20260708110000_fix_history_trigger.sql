-- =========================================================================
-- MIGRATION: FIX FN_POPULATE_HISTORY_CONTEXT TRIGGER FUNCTION
-- =========================================================================

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
