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
    WHERE (p_empresa_id IS NULL OR ss.empresa_id = p_empresa_id OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid)
      AND (
         ss.status IN ('pendente', 'erro', 'cancelado') OR
         (ss.status = 'confirmado' AND (ss.updated_at > now() - interval '60 days' OR ss.created_at > now() - interval '60 days'))
      )
  ), '[]');
END;
$$;
