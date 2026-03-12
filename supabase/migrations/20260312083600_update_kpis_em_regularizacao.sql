BEGIN;

DROP FUNCTION IF EXISTS core_personal.get_client_worker_kpis(uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION core_personal.get_client_worker_kpis(p_empresa_id uuid, p_search text DEFAULT NULL::text, p_cliente_nombre text DEFAULT NULL::text, p_contratante text DEFAULT NULL::text, p_funcion text DEFAULT NULL::text)
 RETURNS TABLE(ativos bigint, inativos bigint, pendentes_ingreso bigint, seguridade_alta bigint, seguridade_pendente_alta bigint, seguridade_em_regularizacao bigint, seguridade_baixa bigint, seguridade_pendente_baixa bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH worker_active_clients AS (
        SELECT 
            w.id,
            w.status_trabajador,
            w.status_seguridad,
            w.nome,
            w.cod_colab,
            w.dni,
            w.pasaporte,
            w.niss,
            w.nie,
            c.contratante,
            c.funcion,
            core_personal.fn_get_active_client_for_worker(w.cod_colab) as active_client
        FROM core_personal.workers w
        LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
        WHERE w.empresa_id = p_empresa_id
          AND (p_search IS NULL OR p_search = '' OR w.nome ILIKE '%' || p_search || '%' OR w.cod_colab ILIKE '%' || p_search || '%' OR w.dni ILIKE '%' || p_search || '%' OR w.pasaporte ILIKE '%' || p_search || '%' OR w.niss ILIKE '%' || p_search || '%' OR w.nie ILIKE '%' || p_search || '%')
          AND (p_contratante IS NULL OR p_contratante = '' OR c.contratante = p_contratante)
          AND (p_funcion IS NULL OR p_funcion = '' OR c.funcion = p_funcion)
    ),
    filtered_kpis AS (
        SELECT *
        FROM worker_active_clients wk
        WHERE (p_cliente_nombre IS NULL OR p_cliente_nombre = '' OR wk.active_client ILIKE '%' || p_cliente_nombre || '%')
    )
    SELECT 
        -- Status do Trabalhador
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Activo' OR wk.status_trabajador ILIKE 'Ativo') AS ativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Inactivo' OR wk.status_trabajador ILIKE 'Inativo') AS inativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE '%Pendente%') AS pendentes_ingreso,
        
        -- Status de Seguridade
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Alta' OR wk.status_seguridad ILIKE 'Alta Confirmada') AS seguridade_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendiente Alta' OR wk.status_seguridad ILIKE 'Pendente Alta') AS seguridade_pendente_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Em Regularização' OR wk.status_seguridad ILIKE 'En Regularización') AS seguridade_em_regularizacao,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Baja' OR wk.status_seguridad ILIKE 'Baixa' OR wk.status_seguridad ILIKE 'Anulado') AS seguridade_baixa,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendiente Baja' OR wk.status_seguridad ILIKE 'Pendente Baixa') AS seguridade_pendente_baixa

    FROM filtered_kpis wk;
END;
$function$;

COMMIT;
