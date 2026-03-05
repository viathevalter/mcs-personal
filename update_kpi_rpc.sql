-- Atualiza o RPC get_client_worker_kpis para retornar as novas métricas de Status Trab. e Status Seguridade
DROP FUNCTION IF EXISTS core_personal.get_client_worker_kpis(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION core_personal.get_client_worker_kpis(
    p_empresa_id UUID,
    p_search TEXT DEFAULT NULL,
    p_cliente_nombre TEXT DEFAULT NULL,
    p_contratante TEXT DEFAULT NULL,
    p_funcion TEXT DEFAULT NULL
)
RETURNS TABLE (
    ativos BIGINT,
    inativos BIGINT,
    pendentes_ingreso BIGINT,
    seguridade_alta BIGINT,
    seguridade_pendente_alta BIGINT,
    seguridade_baixa BIGINT,
    seguridade_pendente_baixa BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Status do Trabalhador
        COUNT(*) FILTER (WHERE w.status_trabajador ILIKE 'Activo' OR w.status_trabajador ILIKE 'Ativo') AS ativos,
        COUNT(*) FILTER (WHERE w.status_trabajador ILIKE 'Inactivo' OR w.status_trabajador ILIKE 'Inativo') AS inativos,
        COUNT(*) FILTER (WHERE w.status_trabajador ILIKE '%Pendente%') AS pendentes_ingreso,
        
        -- Status de Seguridade
        COUNT(*) FILTER (WHERE w.status_seguridad ILIKE 'Alta' OR w.status_seguridad ILIKE 'Alta Confirmada') AS seguridade_alta,
        COUNT(*) FILTER (WHERE w.status_seguridad ILIKE 'Pendiente de Alta' OR w.status_seguridad ILIKE 'Pendente de Alta') AS seguridade_pendente_alta,
        COUNT(*) FILTER (WHERE w.status_seguridad ILIKE 'Baja' OR w.status_seguridad ILIKE 'Baixa') AS seguridade_baixa,
        COUNT(*) FILTER (WHERE w.status_seguridad ILIKE 'Pendiente de Baja' OR w.status_seguridad ILIKE 'Pendente de Baixa') AS seguridade_pendente_baixa

    FROM core_personal.workers w
    WHERE w.empresa_id = p_empresa_id
      AND (p_search IS NULL OR w.nome ILIKE '%' || p_search || '%' OR w.cod_colab ILIKE '%' || p_search || '%' OR w.dni ILIKE '%' || p_search || '%' OR w.pasaporte ILIKE '%' || p_search || '%')
      AND (p_cliente_nombre IS NULL OR w.cliente_nombre ILIKE '%' || p_cliente_nombre || '%')
      AND (p_contratante IS NULL OR w.contratante ILIKE '%' || p_contratante || '%')
      AND (p_funcion IS NULL OR w.funcion ILIKE '%' || p_funcion || '%');
END;
$$;
