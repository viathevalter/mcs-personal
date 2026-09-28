-- ==============================================================================
-- MIGRATION: RPC para Listar Todos os Colaboradores (Oficina/Escritório e Campo)
-- Utilizada pelo módulo de Patrimônio para associar custódia a pessoas cadastradas
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.listar_colaboradores_patrimonio()
RETURNS TABLE (
    id TEXT,
    nome TEXT,
    tipo TEXT,
    email TEXT,
    documento TEXT,
    setor_projeto TEXT,
    empresa TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
      m.id::text as id, 
      m.nombrecompleto::text as nome, 
      'Oficina / Escritório'::text as tipo,
      COALESCE(m.correoempresarial, '')::text as email,
      ''::text as documento,
      COALESCE(d.name, m.ubicaciontrabajo, 'Oficina Central')::text as setor_projeto,
      COALESCE(e.nome_pbi, 'KR Industrial')::text as empresa
    FROM mcs_department_members m
    LEFT JOIN mcs_departments d ON d.id = m.department_id
    LEFT JOIN empresas e ON e.id = m.empresa_contratante_id
    WHERE m.nombrecompleto IS NOT NULL AND TRIM(m.nombrecompleto) != ''
    
    UNION ALL
    
    SELECT 
      w.id::text as id,
      w.nome::text as nome,
      'Trabalhador de Campo'::text as tipo,
      COALESCE(w.email, '')::text as email,
      COALESCE(w.nie, w.dni, w.pasaporte, '')::text as documento,
      COALESCE(w.cliente, w.funcion, 'Operacional')::text as setor_projeto,
      COALESCE(w.contratante, 'KR Industrial')::text as empresa
    FROM core_personal.workers w
    WHERE w.nome IS NOT NULL AND TRIM(w.nome) != ''
    ORDER BY nome ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.listar_colaboradores_patrimonio() TO anon, authenticated, service_role;
