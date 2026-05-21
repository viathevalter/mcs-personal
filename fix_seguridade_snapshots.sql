-- 1. Reconstruct historical origem_cliente_nome for Kanban cards in Seguridade Social
UPDATE core_personal.seguridade_status ss
SET origem_cliente_nome = COALESCE(
  (
    SELECT cpp.cliente_nombre 
    FROM public.colaborador_por_pedido cpp
    JOIN core_personal.workers w ON w.cod_colab = cpp.cod_colab
    WHERE w.id = ss.worker_id
      -- Log falls within the allocation period
      AND (cpp.fechainiciopedido IS NULL OR cpp.fechainiciopedido <= ss.data_solicitacao::date)
      AND (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= ss.data_solicitacao::date)
    ORDER BY cpp.inserted_at DESC 
    LIMIT 1
  ),
  (
    -- Fallback to the closest allocation before this log
    SELECT cpp.cliente_nombre 
    FROM public.colaborador_por_pedido cpp
    JOIN core_personal.workers w ON w.cod_colab = cpp.cod_colab
    WHERE w.id = ss.worker_id
      AND cpp.fechainiciopedido <= ss.data_solicitacao::date
    ORDER BY cpp.fechasalidatrabajador DESC NULLS LAST, cpp.inserted_at DESC 
    LIMIT 1
  ),
  (
    -- Ultimate fallback: just get whatever active client logic says
    SELECT public.fn_get_active_client_for_worker(w.cod_colab)
    FROM core_personal.workers w WHERE w.id = ss.worker_id
  ),
  'Não Alocado'
)
WHERE ss.origem_cliente_nome IS NULL;

-- 2. Create a trigger to automatically populate origem_cliente_nome on new Kanban cards
CREATE OR REPLACE FUNCTION core_personal.fn_populate_seguridade_context()
RETURNS trigger AS $$
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_seguridade_context ON core_personal.seguridade_status;
CREATE TRIGGER trg_populate_seguridade_context
BEFORE INSERT ON core_personal.seguridade_status
FOR EACH ROW
EXECUTE FUNCTION core_personal.fn_populate_seguridade_context();
