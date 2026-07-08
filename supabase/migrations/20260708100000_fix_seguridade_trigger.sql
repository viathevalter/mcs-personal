-- =========================================================================
-- MIGRATION: FIX FN_POPULATE_SEGURIDADE_CONTEXT TRIGGER FUNCTION
-- =========================================================================

CREATE OR REPLACE FUNCTION core_personal.fn_populate_seguridade_context()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.origem_cliente_nome IS NULL THEN
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
    ) INTO NEW.origem_cliente_nome
    FROM core_personal.workers w
    WHERE w.id = NEW.worker_id;
  END IF;

  IF NEW.origem_contratante IS NULL THEN
    SELECT COALESCE(
      (
        SELECT cpp.contratante 
        FROM public.colaborador_por_pedido cpp
        WHERE cpp.cod_colab = w.cod_colab 
        ORDER BY COALESCE(cpp.fechasalidatrabajador, cpp.fechafinpedido, cpp.fechainiciopedido) DESC NULLS LAST 
        LIMIT 1
      ),
      e.nome
    ) INTO NEW.origem_contratante
    FROM core_personal.workers w
    LEFT JOIN core_common.empresas e ON e.id = NEW.empresa_id
    WHERE w.id = NEW.worker_id;
  END IF;
  
  RETURN NEW;
END;
$function$;
