-- Create view core_personal.vw_worker_allocations
CREATE OR REPLACE VIEW core_personal.vw_worker_allocations AS
 SELECT (wa.id)::text AS id,
    w.cod_colab,
    COALESCE(p.codigo, 'N/A'::character varying) AS codpedido,
    COALESCE(c.trade_name, c.legal_name, 'Cliente'::text) AS cliente_nombre,
    COALESCE(emp.nome, 'Não definido'::text) AS contratante,
    'Pedido'::text AS tiposervico,
    COALESCE(wa.start_date, wa.planned_start_date) AS fechainiciopedido,
    wa.end_date AS fechafinpedido,
        CASE
            WHEN ((wa.status)::text = 'cancelled'::text) THEN (wa.updated_at)::date
            ELSE NULL::date
        END AS fechasalidatrabajador,
    wa.job_function_name_snapshot AS funcion,
    wa.created_at AS inserted_at,
    wa.updated_at
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
    cpp.updated_at
   FROM colaborador_por_pedido cpp;

-- Grant permissions to anon, authenticated, and service_role
GRANT ALL ON core_personal.vw_worker_allocations TO anon, authenticated, service_role;
