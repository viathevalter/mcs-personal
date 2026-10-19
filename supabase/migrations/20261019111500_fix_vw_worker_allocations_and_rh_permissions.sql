-- 1. Melhorar core_common.has_role para dar suporte direto a admin_rh global
CREATE OR REPLACE FUNCTION core_common.has_role(p_empresa_id uuid, p_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se o usuário for um super admin global, ele tem acesso irrestrito
  IF public.get_my_role() = 'super_admin' THEN
    RETURN true;
  END IF;

  -- Se for admin_rh global e a checagem for de admin_rh ou rh, tem permissão irrestrita
  IF public.get_my_role() = 'admin_rh' AND p_role IN ('admin_rh', 'rh') THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM core_common.user_memberships
    WHERE user_id = auth.uid()
      AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id)
      AND (
        role = p_role
        OR (p_role = 'admin_rh' AND role IN ('admin', 'rh'))
      )
      AND is_active = true
  );
END;
$$;

-- 2. Recriar a view vw_worker_allocations corrigindo o mapeamento de fim previsto e saida efetiva
CREATE OR REPLACE VIEW core_personal.vw_worker_allocations AS
 SELECT 
    wa.id::text AS id,
    w.cod_colab,
    COALESCE(p.codigo, 'N/A'::character varying) AS codpedido,
    COALESCE(c.trade_name, c.legal_name, 'Cliente'::text) AS cliente_nombre,
    COALESCE(emp.trade_name, emp.nome, 'Não definido'::text) AS contratante,
    'Pedido'::text AS tiposervico,
    COALESCE(wa.start_date, wa.planned_start_date) AS fechainiciopedido,
    wa.planned_end_date AS fechafinpedido,
    COALESCE(wa.end_date, 
      CASE 
        WHEN wa.status::text = 'cancelled'::text THEN wa.updated_at::date 
        ELSE NULL::date 
      END
    ) AS fechasalidatrabajador,
    wa.job_function_name_snapshot AS funcion,
    wa.created_at AS inserted_at,
    wa.updated_at,
    wa.tarifa_acordada::text AS tarifa_acordada_trab,
    w.camiseta AS camisa,
    w.pantalones AS pantalone,
    w.licencia_conducir AS licencia_de_conducir
   FROM core_personal.worker_assignments wa
     JOIN core_personal.workers w ON w.id = wa.worker_id
     LEFT JOIN core_comercial.pedidos p ON p.id = wa.pedido_id
     LEFT JOIN core_common.clients c ON c.id = wa.client_id
     LEFT JOIN core_common.empresas emp ON emp.id = wa.empresa_id
UNION ALL
 SELECT 
    cpp.id::text AS id,
    cpp.cod_colab,
    cpp.codpedido,
    cpp.cliente_nombre,
    cpp.contratante,
    cpp.tiposervico,
    cpp.fechainiciopedido,
    cpp.fechafinpedido,
    cpp.fechasalidatrabajador,
    cpp.funcion,
    cpp.inserted_at,
    cpp.updated_at,
    NULL::text AS tarifa_acordada_trab,
    NULL::text AS camisa,
    NULL::text AS pantalone,
    NULL::text AS licencia_de_conducir
   FROM colaborador_por_pedido cpp;

GRANT ALL ON core_personal.vw_worker_allocations TO anon, authenticated, service_role;
