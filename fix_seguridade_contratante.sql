-- 1. Add origem_contratante to seguridade_status
ALTER TABLE core_personal.seguridade_status
ADD COLUMN IF NOT EXISTS origem_contratante text;

-- 2. Backfill origem_contratante
UPDATE core_personal.seguridade_status ss
SET origem_contratante = COALESCE(
  (
    SELECT cpp.contratante
    FROM public.colaborador_por_pedido cpp
    JOIN core_personal.workers w ON w.cod_colab = cpp.cod_colab
    WHERE w.id = ss.worker_id
      AND (cpp.fechainiciopedido IS NULL OR cpp.fechainiciopedido <= ss.data_solicitacao::date)
      AND (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= ss.data_solicitacao::date)
    ORDER BY cpp.inserted_at DESC 
    LIMIT 1
  ),
  (
    SELECT cpp.contratante
    FROM public.colaborador_por_pedido cpp
    JOIN core_personal.workers w ON w.cod_colab = cpp.cod_colab
    WHERE w.id = ss.worker_id
      AND cpp.fechainiciopedido <= ss.data_solicitacao::date
    ORDER BY cpp.fechasalidatrabajador DESC NULLS LAST, cpp.inserted_at DESC 
    LIMIT 1
  ),
  (
    SELECT e.nome
    FROM core_personal.workers w
    JOIN core_common.empresas e ON e.id = w.empresa_id
    WHERE w.id = ss.worker_id
  )
)
WHERE ss.origem_contratante IS NULL;

-- 3. Update the trigger
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
    LEFT JOIN core_common.empresas e ON e.id = w.empresa_id
    WHERE w.id = NEW.worker_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update the RPC get_real_seguridade_status to include origem_contratante
CREATE OR REPLACE FUNCTION "core_personal"."get_real_seguridade_status"("p_empresa_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(
      json_build_object(
        'id', ss.id,
        'empresa_id', ss.empresa_id,
        'worker_id', w.id,
        'tipo_evento', ss.tipo_evento,
        'status', ss.status,
        'origem', ss.origem,
        'origem_cliente_nome', COALESCE(ss.origem_cliente_nome, (
            SELECT cliente_nombre 
            FROM public.colaborador_por_pedido cpp 
            WHERE cpp.cod_colab = w.cod_colab 
            ORDER BY id DESC 
            LIMIT 1
        )),
        'origem_contratante', COALESCE(ss.origem_contratante, (
            SELECT contratante 
            FROM public.colaborador_por_pedido cpp 
            WHERE cpp.cod_colab = w.cod_colab 
            ORDER BY id DESC 
            LIMIT 1
        ), (SELECT e.nome FROM core_common.empresas e WHERE e.id = w.empresa_id LIMIT 1)),
        'data_solicitacao', ss.data_solicitacao,
        'data_efetiva', ss.data_efetiva,
        'observacoes', ss.observacoes,
        'autor_inativacao', (
            SELECT COALESCE(u.display_name, u.email)
            FROM core_personal.worker_status_history h
            LEFT JOIN public.mcs_users u ON u.id = h.changed_by
            WHERE h.worker_id = w.id 
              AND h.change_type = 'TRABALHADOR'
            ORDER BY h.created_at DESC 
            LIMIT 1
        ),
        'hist_observacoes', (
            SELECT h.comments
            FROM core_personal.worker_status_history h
            WHERE h.worker_id = w.id 
              AND h.change_type = 'TRABALHADOR'
            ORDER BY h.created_at DESC 
            LIMIT 1
        ),
        'hist_data_efetiva', (
            SELECT h.effective_date
            FROM core_personal.worker_status_history h
            WHERE h.worker_id = w.id 
              AND h.change_type = 'TRABALHADOR'
            ORDER BY h.created_at DESC 
            LIMIT 1
        ),
        'worker', json_build_object(
          'id', w.id,
          'nome', w.nome,
          'cod_colab', w.cod_colab,
          'niss', w.niss,
          'nif', w.nif,
          'dni', w.dni,
          'nie', w.nie,
          'pasaporte', w.pasaporte,
          'fecha_nacimiento', w.fecha_nacimiento,
          'funcion', (SELECT c.funcion FROM public.colaboradores c WHERE c.cod_colab = w.cod_colab LIMIT 1),
          'empresa_nome', (SELECT e.nome FROM core_common.empresas e WHERE e.id = w.empresa_id LIMIT 1),
          'contratante', (SELECT c.contratante FROM public.colaboradores c WHERE c.cod_colab = w.cod_colab LIMIT 1)
        )
      ) ORDER BY ss.created_at DESC
    )
    FROM core_personal.seguridade_status ss
    JOIN core_personal.workers w ON ss.worker_id = w.id
    WHERE ss.empresa_id = p_empresa_id
      AND (
         ss.status IN ('pendente', 'erro', 'cancelado') OR
         (ss.status = 'confirmado' AND (ss.updated_at > now() - interval '60 days' OR ss.created_at > now() - interval '60 days'))
      )
  ), '[]');
END;
$$;
