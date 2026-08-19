-- Migration: Standardize company names to canonical uppercase across all tables, views, and RPCs
-- Date: 2026-08-19

-- 1. Update core_common.empresas trade_names to canonical UPPERCASE
UPDATE core_common.empresas SET trade_name = 'WISEOWE' WHERE codigo = 'WIS' OR UPPER(trade_name) LIKE '%WISEOWE%';
UPDATE core_common.empresas SET trade_name = 'LUMINOUS' WHERE codigo = 'LUM' OR UPPER(trade_name) LIKE '%LUMINOUS%';
UPDATE core_common.empresas SET trade_name = 'STOCCO' WHERE codigo = 'STO' OR UPPER(trade_name) LIKE '%STOCCO%';
UPDATE core_common.empresas SET trade_name = 'TRIANGULO' WHERE codigo = 'TRI' OR UPPER(trade_name) LIKE '%TRIANGULO%';
UPDATE core_common.empresas SET trade_name = 'KOTRIK & ROSAS' WHERE codigo = 'KOR' OR UPPER(trade_name) LIKE '%KOTRIK%';
UPDATE core_common.empresas SET trade_name = 'GENIO' WHERE codigo = 'GEN' OR UPPER(trade_name) LIKE '%GENIO%';
UPDATE core_common.empresas SET trade_name = 'SANTIFER' WHERE codigo = 'SAT' OR UPPER(trade_name) LIKE '%SANTIFER%';
UPDATE core_common.empresas SET trade_name = 'LOGIN PRO' WHERE codigo = 'GRP' OR is_holding = true;

-- 2. Standardize core_personal.workers
UPDATE core_personal.workers SET contratante = 'WISEOWE' WHERE UPPER(contratante) LIKE '%WISEOWE%';
UPDATE core_personal.workers SET contratante = 'LUMINOUS' WHERE UPPER(contratante) LIKE '%LUMINOUS%';
UPDATE core_personal.workers SET contratante = 'STOCCO' WHERE UPPER(contratante) LIKE '%STOCCO%';
UPDATE core_personal.workers SET contratante = 'TRIANGULO' WHERE UPPER(contratante) LIKE '%TRIANGULO%';
UPDATE core_personal.workers SET contratante = 'KOTRIK & ROSAS' WHERE UPPER(contratante) LIKE '%KOTRIK%';
UPDATE core_personal.workers SET contratante = 'GENIO' WHERE UPPER(contratante) LIKE '%GENIO%';
UPDATE core_personal.workers SET contratante = 'SANTIFER' WHERE UPPER(contratante) LIKE '%SANTIFER%';

-- 3. Standardize public.colaborador_por_pedido
UPDATE public.colaborador_por_pedido SET contratante = 'WISEOWE' WHERE UPPER(contratante) LIKE '%WISEOWE%';
UPDATE public.colaborador_por_pedido SET contratante = 'LUMINOUS' WHERE UPPER(contratante) LIKE '%LUMINOUS%';
UPDATE public.colaborador_por_pedido SET contratante = 'STOCCO' WHERE UPPER(contratante) LIKE '%STOCCO%';
UPDATE public.colaborador_por_pedido SET contratante = 'TRIANGULO' WHERE UPPER(contratante) LIKE '%TRIANGULO%';
UPDATE public.colaborador_por_pedido SET contratante = 'KOTRIK & ROSAS' WHERE UPPER(contratante) LIKE '%KOTRIK%';
UPDATE public.colaborador_por_pedido SET contratante = 'GENIO' WHERE UPPER(contratante) LIKE '%GENIO%';
UPDATE public.colaborador_por_pedido SET contratante = 'SANTIFER' WHERE UPPER(contratante) LIKE '%SANTIFER%';

-- 4. Update core_personal.vw_worker_allocations view
CREATE OR REPLACE VIEW core_personal.vw_worker_allocations AS
 SELECT (wa.id)::text AS id,
    w.cod_colab,
    COALESCE(p.codigo, 'N/A'::character varying) AS codpedido,
    COALESCE(c.trade_name, c.legal_name, 'Cliente'::text) AS cliente_nombre,
    COALESCE(emp.trade_name, emp.nome, 'Não definido'::text) AS contratante,
    'Pedido'::text AS tiposervico,
    COALESCE(wa.start_date, wa.planned_start_date) AS fechainiciopedido,
    wa.end_date AS fechafinpedido,
        CASE
            WHEN ((wa.status)::text = 'cancelled'::text) THEN (wa.updated_at)::date
            ELSE NULL::date
        END AS fechasalidatrabajador,
    wa.job_function_name_snapshot AS funcion,
    wa.created_at AS inserted_at,
    wa.updated_at,
    (wa.tarifa_acordada)::text AS tarifa_acordada_trab,
    w.camiseta AS camisa,
    w.pantalones AS pantalone,
    w.licencia_conducir AS licencia_de_conducir
   FROM ((((core_personal.worker_assignments wa
     JOIN core_personal.workers w ON ((w.id = wa.worker_id)))
     LEFT JOIN core_comercial.pedidos p ON ((p.id = wa.pedido_id)))
     LEFT JOIN core_common.clients c ON ((c.id = wa.client_id)))
     LEFT JOIN core_common.empresas emp ON ((emp.id = wa.empresa_id)))
UNION ALL
 SELECT (cpp.id)::text AS id,
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

-- 5. Update RPC get_unique_contratantes
CREATE OR REPLACE FUNCTION public.get_unique_contratantes()
RETURNS TABLE(contratante text)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT e.trade_name::text AS contratante
    FROM core_common.empresas e
    WHERE e.is_active = true AND e.is_holding = false AND e.trade_name IS NOT NULL
    ORDER BY 1 ASC;
END;
$$;
