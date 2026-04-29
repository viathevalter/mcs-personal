-- We want to aggressively fix the history by using the most accurate historical snapshot logic.
-- The true state of the worker at the time of the log is the latest allocation inserted BEFORE the log.

-- Fix Seguridade Status
UPDATE core_personal.seguridade_status ss
SET 
  origem_cliente_nome = COALESCE(
    (
      SELECT cpp.cliente_nombre 
      FROM public.colaborador_por_pedido cpp
      JOIN core_personal.workers w ON w.cod_colab = cpp.cod_colab
      WHERE w.id = ss.worker_id
        AND cpp.inserted_at <= ss.created_at
      ORDER BY cpp.inserted_at DESC 
      LIMIT 1
    ),
    'Não Alocado'
  ),
  origem_contratante = COALESCE(
    (
      SELECT cpp.contratante 
      FROM public.colaborador_por_pedido cpp
      JOIN core_personal.workers w ON w.cod_colab = cpp.cod_colab
      WHERE w.id = ss.worker_id
        AND cpp.inserted_at <= ss.created_at
      ORDER BY cpp.inserted_at DESC 
      LIMIT 1
    ),
    (
      SELECT e.nome
      FROM core_personal.workers w
      JOIN core_common.empresas e ON e.id = w.empresa_id
      WHERE w.id = ss.worker_id
    )
  );

-- Fix Worker Status History
UPDATE core_personal.worker_status_history h
SET 
  cliente_nome = COALESCE(
    (
      SELECT cpp.cliente_nombre 
      FROM public.colaborador_por_pedido cpp
      JOIN core_personal.workers w ON w.cod_colab = cpp.cod_colab
      WHERE w.id = h.worker_id
        AND cpp.inserted_at <= h.created_at
      ORDER BY cpp.inserted_at DESC 
      LIMIT 1
    ),
    'Não Alocado'
  ),
  empresa_nome = COALESCE(
    (
      SELECT cpp.contratante 
      FROM public.colaborador_por_pedido cpp
      JOIN core_personal.workers w ON w.cod_colab = cpp.cod_colab
      WHERE w.id = h.worker_id
        AND cpp.inserted_at <= h.created_at
      ORDER BY cpp.inserted_at DESC 
      LIMIT 1
    ),
    (
      SELECT e.nome
      FROM core_personal.workers w
      JOIN core_common.empresas e ON e.id = w.empresa_id
      WHERE w.id = h.worker_id
    )
  );
