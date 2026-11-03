-- RPC para listar Alojamentos com trabalhadores ativos/pendentes para filtro de Campanhas no MCS Chat
CREATE OR REPLACE FUNCTION public.get_campaign_alojamentos_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result jsonb := '[]'::jsonb;
BEGIN
  WITH active_aloj AS (
    SELECT
      al.id::text AS alojamento_id,
      COALESCE(NULLIF(TRIM(al.nome), ''), COALESCE(al.municipio, 'Alojamento')) AS alojamento_nome,
      COALESCE(al.endereco, '') AS endereco,
      COALESCE(al.municipio, '') AS municipio,
      COALESCE(al.provincia, '') AS provincia,
      COALESCE(al.capacidade_total, 0) AS capacidade_total,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT w.id::text), NULL) AS worker_ids,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT w.cod_colab), NULL) AS worker_codes,
      ARRAY_REMOVE(
        ARRAY_AGG(
          DISTINCT COALESCE(
            NULLIF(TRIM(w.cliente), ''),
            NULLIF(TRIM(a.cliente_obra_nome), '')
          )
        ),
        NULL
      ) AS clientes
    FROM core_logistics.alojamentos al
    JOIN core_logistics.alocacoes a
      ON a.alojamento_id = al.id
     AND LOWER(TRIM(COALESCE(a.status, ''))) NOT IN ('checkout', 'checkout_feito', 'cancelado', 'finalizado')
    JOIN core_personal.workers w
      ON w.id = a.worker_id
     AND (
       UPPER(TRIM(COALESCE(w.status_trabajador, ''))) IN ('ATIVO', 'ACTIVO', 'ACTIVE')
       OR UPPER(TRIM(COALESCE(w.status_trabajador, ''))) LIKE '%PENDENTE%'
       OR UPPER(TRIM(COALESCE(w.status_trabajador, ''))) LIKE '%PENDIENTE%'
     )
    GROUP BY al.id, al.nome, al.endereco, al.municipio, al.provincia, al.capacidade_total
    HAVING COUNT(DISTINCT w.id) > 0
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'alojamento_id', aa.alojamento_id,
        'alojamento_nome', aa.alojamento_nome,
        'endereco', aa.endereco,
        'municipio', aa.municipio,
        'provincia', aa.provincia,
        'capacidade_total', aa.capacidade_total,
        'worker_ids', aa.worker_ids,
        'worker_codes', aa.worker_codes,
        'clientes', aa.clientes
      )
      ORDER BY COALESCE(array_length(aa.worker_ids, 1), 0) DESC, aa.alojamento_nome ASC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM active_aloj aa;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN '[]'::jsonb;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_campaign_alojamentos_overview() TO anon, authenticated, service_role;

-- Atualizar get_campaign_pedidos_overview para também retornar os alojamentos onde os trabalhadores do pedido estão alocados
CREATE OR REPLACE FUNCTION public.get_campaign_pedidos_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result jsonb := '[]'::jsonb;
BEGIN
  WITH op_pedidos AS (
    SELECT
      p.id::text AS pedido_uid,
      p.codigo AS cod_pedido,
      COALESCE(p.client_name, p.client_legal_name, 'Cliente') AS cliente_nome,
      COALESCE(p.site_name, '') AS obra_nome,
      p.expected_start_date::text AS data_inicio,
      COALESCE(p.operational_status, p.commercial_status, 'active') AS status_pedido,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT w.id::text), NULL) AS worker_ids,
      ARRAY[]::text[] AS worker_codes,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT al.nome), NULL) AS alojamentos
    FROM core_operacoes.pedidos p
    LEFT JOIN core_personal.worker_assignments wa
      ON wa.pedido_id = p.id
     AND wa.status IN ('active', 'planned')
     AND (wa.end_date IS NULL OR wa.end_date::date >= CURRENT_DATE)
    LEFT JOIN core_personal.workers w
      ON w.id = wa.worker_id
     AND (
       UPPER(TRIM(COALESCE(w.status_trabajador, ''))) IN ('ATIVO', 'ACTIVO', 'ACTIVE')
       OR UPPER(TRIM(COALESCE(w.status_trabajador, ''))) LIKE '%PENDENTE%'
       OR UPPER(TRIM(COALESCE(w.status_trabajador, ''))) LIKE '%PENDIENTE%'
     )
    LEFT JOIN core_logistics.alocacoes a
      ON a.worker_id = w.id
     AND LOWER(TRIM(COALESCE(a.status, ''))) NOT IN ('checkout', 'checkout_feito', 'cancelado', 'finalizado')
    LEFT JOIN core_logistics.alojamentos al
      ON al.id = a.alojamento_id
    WHERE p.codigo IS NOT NULL
    GROUP BY p.id, p.codigo, p.client_name, p.client_legal_name, p.site_name, p.expected_start_date, p.operational_status, p.commercial_status
  ),
  leg_pedidos AS (
    SELECT
      'legacy_' || cp.codpedido AS pedido_uid,
      cp.codpedido AS cod_pedido,
      MAX(COALESCE(cp.cliente_nombre, 'Cliente')) AS cliente_nome,
      MAX(COALESCE(cp.direccion_cliente, '')) AS obra_nome,
      MAX(cp.fechainiciopedido)::date::text AS data_inicio,
      'active' AS status_pedido,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT w.id::text), NULL) AS worker_ids,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT w.cod_colab), NULL) AS worker_codes,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT al.nome), NULL) AS alojamentos
    FROM public.colaborador_por_pedido cp
    JOIN core_personal.workers w
      ON UPPER(TRIM(w.cod_colab)) = UPPER(TRIM(cp.cod_colab))
     AND (
       UPPER(TRIM(COALESCE(w.status_trabajador, ''))) IN ('ATIVO', 'ACTIVO', 'ACTIVE')
       OR UPPER(TRIM(COALESCE(w.status_trabajador, ''))) LIKE '%PENDENTE%'
       OR UPPER(TRIM(COALESCE(w.status_trabajador, ''))) LIKE '%PENDIENTE%'
     )
    LEFT JOIN core_logistics.alocacoes a
      ON a.worker_id = w.id
     AND LOWER(TRIM(COALESCE(a.status, ''))) NOT IN ('checkout', 'checkout_feito', 'cancelado', 'finalizado')
    LEFT JOIN core_logistics.alojamentos al
      ON al.id = a.alojamento_id
    WHERE cp.codpedido IS NOT NULL
      AND TRIM(cp.codpedido) <> ''
      AND (cp.fechasalidatrabajador IS NULL OR cp.fechasalidatrabajador::date >= CURRENT_DATE)
    GROUP BY cp.codpedido
  ),
  merged AS (
    SELECT
      COALESCE(o.cod_pedido, l.cod_pedido) AS cod_pedido,
      COALESCE(o.cliente_nome, l.cliente_nome) AS cliente_nome,
      COALESCE(NULLIF(o.obra_nome, ''), l.obra_nome, '') AS obra_nome,
      COALESCE(o.data_inicio, l.data_inicio) AS data_inicio,
      COALESCE(o.status_pedido, l.status_pedido) AS status_pedido,
      ARRAY(
        SELECT DISTINCT x
        FROM unnest(COALESCE(o.worker_ids, ARRAY[]::text[]) || COALESCE(l.worker_ids, ARRAY[]::text[])) AS x
        WHERE x IS NOT NULL
      ) AS worker_ids,
      COALESCE(l.worker_codes, ARRAY[]::text[]) AS worker_codes,
      ARRAY(
        SELECT DISTINCT x
        FROM unnest(COALESCE(o.alojamentos, ARRAY[]::text[]) || COALESCE(l.alojamentos, ARRAY[]::text[])) AS x
        WHERE x IS NOT NULL
      ) AS alojamentos
    FROM op_pedidos o
    FULL OUTER JOIN leg_pedidos l ON UPPER(TRIM(o.cod_pedido)) = UPPER(TRIM(l.cod_pedido))
    WHERE COALESCE(array_length(o.worker_ids, 1), 0) > 0
       OR COALESCE(array_length(l.worker_codes, 1), 0) > 0
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'cod_pedido', m.cod_pedido,
        'cliente_nome', m.cliente_nome,
        'obra_nome', m.obra_nome,
        'data_inicio', m.data_inicio,
        'status_pedido', m.status_pedido,
        'worker_ids', m.worker_ids,
        'worker_codes', m.worker_codes,
        'alojamentos', m.alojamentos
      )
      ORDER BY m.data_inicio DESC NULLS LAST, m.cod_pedido DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM merged m;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN '[]'::jsonb;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_campaign_pedidos_overview() TO anon, authenticated, service_role;
