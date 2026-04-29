-- Reconstruct the past states for cliente_nome and empresa_nome precisely based on timestamps!

UPDATE core_personal.worker_status_history h
SET 
  cliente_nome = COALESCE(
    (
      SELECT cpp.cliente_nombre 
      FROM public.colaborador_por_pedido cpp
      WHERE cpp.cod_colab = w.cod_colab
        -- Log falls within the allocation period, or allocation is open and started before the log
        AND (cpp.fechainiciopedido IS NULL OR cpp.fechainiciopedido <= h.created_at::date)
        AND (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= h.created_at::date)
      ORDER BY cpp.inserted_at DESC 
      LIMIT 1
    ),
    (
      -- Fallback to the closest allocation before this log
      SELECT cpp.cliente_nombre 
      FROM public.colaborador_por_pedido cpp
      WHERE cpp.cod_colab = w.cod_colab
        AND cpp.fechainiciopedido <= h.created_at::date
      ORDER BY cpp.fechasalidatrabajador DESC NULLS LAST, cpp.inserted_at DESC 
      LIMIT 1
    ),
    'Não Alocado'
  ),
  empresa_nome = COALESCE(
    (
      SELECT cpp.contratante
      FROM public.colaborador_por_pedido cpp
      WHERE cpp.cod_colab = w.cod_colab
        AND (cpp.fechainiciopedido IS NULL OR cpp.fechainiciopedido <= h.created_at::date)
        AND (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= h.created_at::date)
      ORDER BY cpp.inserted_at DESC 
      LIMIT 1
    ),
    (
      SELECT cpp.contratante
      FROM public.colaborador_por_pedido cpp
      WHERE cpp.cod_colab = w.cod_colab
        AND cpp.fechainiciopedido <= h.created_at::date
      ORDER BY cpp.fechasalidatrabajador DESC NULLS LAST, cpp.inserted_at DESC 
      LIMIT 1
    ),
    e.nome
  )
FROM core_personal.workers w
LEFT JOIN core_common.empresas e ON e.id = w.empresa_id
WHERE h.worker_id = w.id;
