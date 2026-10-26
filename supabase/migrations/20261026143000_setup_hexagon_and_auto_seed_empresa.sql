-- ============================================================================
-- MIGRATION: Setup completo da empresa HEXAGON (HEX) + Auto-Seed Trigger para Novas Empresas
-- Date: 2026-10-26
-- ============================================================================

-- 1. Padronizar trade_name em maiúsculas para HEXAGON (consistente com STOCCO, LUMINOUS, WISEOWE, TRIANGULO)
UPDATE core_common.empresas
SET trade_name = 'HEXAGON',
    nome = 'HEXAGON'
WHERE codigo = 'HEX' OR UPPER(TRIM(nome)) = 'HEXAGON';

-- 2. Garantir registro correspondente em public.empresas (usado na Gestão de Usuários / Vínculo de Contratante)
INSERT INTO public.empresas (id, sp_id, nome_pbi, razon_social, nombre_comercial, cif_dni, pais)
SELECT
  (SELECT COALESCE(MAX(id), 0) + 1 FROM public.empresas),
  '99',
  'HEXAGON',
  COALESCE(legal_name, 'HEXAGON MONTAJES INDUSTRIALES, S.L.'),
  'Hexagon',
  COALESCE(tax_id, 'B05688197'),
  'Espanha'
FROM core_common.empresas
WHERE codigo = 'HEX'
  AND NOT EXISTS (
    SELECT 1 FROM public.empresas WHERE UPPER(TRIM(nombre_comercial)) = 'HEXAGON' OR UPPER(TRIM(nome_pbi)) = 'HEXAGON'
  );

-- 3. Criar função reutilizável para semear automaticamente todas as dependências de uma empresa do grupo
CREATE OR REPLACE FUNCTION core_common.fn_seed_empresa_defaults(p_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ref_empresa_id uuid := '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid; -- Stocco (Referência)
  r_pb RECORD;
  v_new_pb_id uuid;
  v_cat text;
  v_categories text[] := ARRAY[
    'AUXILIO MORADIA',
    'HORAS EXTRAS',
    'TRABALHO NOTURNO',
    'SUBSÍDIO ALIMENTAÇÃO',
    'REEMBOLSO DE DESPESAS',
    'HORAS PENDENTES',
    'SUBSÍDIO TRANSPORTE',
    'AJUDA DE CUSTO',
    'FÉRIAS',
    'OUTROS'
  ];
BEGIN
  -- 3.1. Departamentos Operacionais Padrão (8 departamentos)
  INSERT INTO core_common.departments (empresa_id, code, name, status)
  VALUES
    (p_empresa_id, 'COMERCIAL',        'Comercial',                'active'),
    (p_empresa_id, 'CONTRATOS',        'Gestão de Contratos',      'active'),
    (p_empresa_id, 'DOCUMENTACION',    'Documentação',             'active'),
    (p_empresa_id, 'FINANCEIRO',       'Financeiro / Faturamento', 'active'),
    (p_empresa_id, 'LOGISTICA',        'Logística e Frota',        'active'),
    (p_empresa_id, 'OPERACOES',        'Operações',                'active'),
    (p_empresa_id, 'RH',               'Recursos Humanos',         'active'),
    (p_empresa_id, 'SEGURIDAD_SOCIAL', 'Seguridad Social',         'active')
  ON CONFLICT (empresa_id, code) DO UPDATE SET status = 'active';

  -- 3.2. Configurações Comerciais (core_comercial.comercial_settings)
  INSERT INTO core_comercial.comercial_settings (empresa_id, min_margin_percent, block_debtor_estimations, ivp_min_threshold)
  VALUES (p_empresa_id, 15.00, TRUE, 5.00)
  ON CONFLICT (empresa_id) DO NOTHING;

  -- 3.3. Prazos de Pagamento Padrão (core_common.payment_terms)
  IF NOT EXISTS (SELECT 1 FROM core_common.payment_terms WHERE empresa_id = p_empresa_id) THEN
    INSERT INTO core_common.payment_terms (empresa_id, name, days, active)
    VALUES
      (p_empresa_id, 'Pronto Pagamento', 0, true),
      (p_empresa_id, '10 dias após faturamento', 10, true),
      (p_empresa_id, '15 dias após faturamento', 15, true),
      (p_empresa_id, '30 dias após faturamento', 30, true),
      (p_empresa_id, '45 dias após faturamento', 45, true),
      (p_empresa_id, '60 dias após faturamento', 60, true),
      (p_empresa_id, '90 dias após faturamento', 90, true)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3.4. Categorias de Benefícios / Auxílios (core_personal.benefit_categories)
  FOREACH v_cat IN ARRAY v_categories LOOP
    IF NOT EXISTS (
      SELECT 1 FROM core_personal.benefit_categories
      WHERE empresa_id = p_empresa_id AND UPPER(TRIM(name)) = v_cat
    ) THEN
      INSERT INTO core_personal.benefit_categories (empresa_id, name)
      VALUES (p_empresa_id, v_cat);
    END IF;
  END LOOP;

  -- 3.5. Estágios do Kanban Comercial (core_comercial.kanban_stages)
  IF NOT EXISTS (SELECT 1 FROM core_comercial.kanban_stages WHERE empresa_id = p_empresa_id) THEN
    INSERT INTO core_comercial.kanban_stages (empresa_id, name, color, order_index, is_system)
    VALUES
      (p_empresa_id, 'Novo', '#3b82f6', 1, true),
      (p_empresa_id, 'E-mail Enviado', '#f59e0b', 2, true),
      (p_empresa_id, 'Interessado', '#10b981', 3, true),
      (p_empresa_id, 'Proposta', '#8b5cf6', 4, true),
      (p_empresa_id, 'Convertido', '#22c55e', 5, true);
  END IF;

  -- 3.6. Tabelas de Tarifas de Referência por Função (core_comercial.job_function_rate_refs)
  IF p_empresa_id <> v_ref_empresa_id AND NOT EXISTS (
    SELECT 1 FROM core_comercial.job_function_rate_refs WHERE empresa_id = p_empresa_id
  ) THEN
    INSERT INTO core_comercial.job_function_rate_refs (
      empresa_id, job_function_id, country_id, region_id, currency_code,
      base_cost_hour, minimum_sell_rate_hour, recommended_sell_rate_hour,
      minimum_margin_percent, notes, status,
      fixed_price_sell_rate_hour, fixed_price_min_sell_rate_hour
    )
    SELECT
      p_empresa_id, r.job_function_id, r.country_id, r.region_id, r.currency_code,
      r.base_cost_hour, r.minimum_sell_rate_hour, r.recommended_sell_rate_hour,
      r.minimum_margin_percent, r.notes, r.status,
      r.fixed_price_sell_rate_hour, r.fixed_price_min_sell_rate_hour
    FROM core_comercial.job_function_rate_refs r
    WHERE r.empresa_id = v_ref_empresa_id
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3.7. EPIs por Função (core_logistica.job_function_epis)
  IF p_empresa_id <> v_ref_empresa_id AND NOT EXISTS (
    SELECT 1 FROM core_logistica.job_function_epis WHERE empresa_id = p_empresa_id
  ) THEN
    INSERT INTO core_logistica.job_function_epis (
      empresa_id, job_function_id, epi_id, quantity, is_required, renewal_period_days, notes, status
    )
    SELECT
      p_empresa_id, e.job_function_id, e.epi_id, e.quantity, e.is_required, e.renewal_period_days, e.notes, e.status
    FROM core_logistica.job_function_epis e
    WHERE e.empresa_id = v_ref_empresa_id
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3.8. Scripts Comerciais Padrão (core_comercial.sales_scripts)
  IF p_empresa_id <> v_ref_empresa_id AND NOT EXISTS (
    SELECT 1 FROM core_comercial.sales_scripts WHERE empresa_id = p_empresa_id
  ) THEN
    INSERT INTO core_comercial.sales_scripts (
      empresa_id, title, sector, pitch_opening, qualifying_questions, objections_guide, closing_pitch, is_default
    )
    SELECT
      p_empresa_id, s.title, s.sector, s.pitch_opening, s.qualifying_questions, s.objections_guide, s.closing_pitch, s.is_default
    FROM core_comercial.sales_scripts s
    WHERE s.empresa_id = v_ref_empresa_id;
  END IF;

  -- 3.9. Playbooks e Etapas Operacionais (core_operacoes.playbooks & playbook_steps)
  IF p_empresa_id <> v_ref_empresa_id THEN
    FOR r_pb IN
      SELECT * FROM core_operacoes.playbooks WHERE empresa_id = v_ref_empresa_id
    LOOP
      INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
      VALUES (p_empresa_id, r_pb.code, r_pb.name, r_pb.solicitud_type, r_pb.description, r_pb.status)
      ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name,
            solicitud_type = EXCLUDED.solicitud_type,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            updated_at = NOW()
      RETURNING id INTO v_new_pb_id;

      -- Inserir etapas mapeando o department_id pelo code do departamento na nova empresa
      INSERT INTO core_operacoes.playbook_steps (
        empresa_id, playbook_id, department_id, code, title, description,
        priority, default_due_days, required, sort_order, blocking, status
      )
      SELECT
        p_empresa_id,
        v_new_pb_id,
        COALESCE(
          target_dep.id,
          (SELECT id FROM core_common.departments WHERE empresa_id = p_empresa_id ORDER BY code ASC LIMIT 1)
        ),
        ps.code,
        ps.title,
        ps.description,
        ps.priority,
        ps.default_due_days,
        ps.required,
        ps.sort_order,
        ps.blocking,
        ps.status
      FROM core_operacoes.playbook_steps ps
      LEFT JOIN core_common.departments src_dep ON src_dep.id = ps.department_id
      LEFT JOIN core_common.departments target_dep ON target_dep.empresa_id = p_empresa_id AND target_dep.code = src_dep.code
      WHERE ps.playbook_id = r_pb.id
        AND ps.code IS NOT NULL
      ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            priority = EXCLUDED.priority,
            default_due_days = EXCLUDED.default_due_days,
            sort_order = EXCLUDED.sort_order,
            blocking = EXCLUDED.blocking,
            status = EXCLUDED.status,
            updated_at = NOW();
    END LOOP;
  END IF;
END;
$$;

-- 4. Criar Trigger para semear automaticamente qualquer empresa futura criada em core_common.empresas
CREATE OR REPLACE FUNCTION core_common.trg_after_insert_empresa_seed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM core_common.fn_seed_empresa_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_seed_empresa_defaults ON core_common.empresas;
CREATE TRIGGER tr_seed_empresa_defaults
AFTER INSERT ON core_common.empresas
FOR EACH ROW
EXECUTE FUNCTION core_common.trg_after_insert_empresa_seed();

-- 5. Executar o seed imediatamente para a HEXAGON e para todas as empresas existentes
DO $$
DECLARE
  r_emp RECORD;
BEGIN
  FOR r_emp IN SELECT id FROM core_common.empresas LOOP
    PERFORM core_common.fn_seed_empresa_defaults(r_emp.id);
  END LOOP;
END $$;

-- 6. Atualizar core_personal.get_hours_control_workers para suportar HEXAGON e qualquer empresa dinamicamente
CREATE OR REPLACE FUNCTION core_personal.get_hours_control_workers(
  p_empresa_id uuid,
  p_period_year integer,
  p_period_month integer,
  p_contratante text DEFAULT NULL::text,
  p_cliente_nombre text DEFAULT NULL::text
)
RETURNS TABLE(
  total_count bigint,
  id uuid,
  empresa_id uuid,
  cod_colab text,
  nome text,
  email text,
  movil text,
  niss text,
  nif text,
  nie text,
  dni text,
  pasaporte text,
  status_seguridad text,
  status_trabajador text,
  contratante text,
  funcion text,
  cliente_nombre text,
  data_baixa date,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_start_date date := make_date(p_period_year, p_period_month, 1);
  v_end_date date := (v_start_date + interval '1 month' - interval '1 day')::date;
BEGIN
  RETURN QUERY
  WITH valid_allocations_all AS (
    SELECT 
      cpp.cod_colab,
      cpp.contratante,
      cpp.cliente_nombre,
      COALESCE(
        CASE 
          WHEN lower(cpp.contratante) LIKE '%hexagon%' OR lower(cpp.contratante) = 'hex' THEN '2c944db5-f1d0-4789-a562-8cfa1c0155b7'::uuid
          WHEN lower(cpp.contratante) LIKE '%stocco%' THEN '441f1f5d-aed3-40e3-8c77-7b1217757251'::uuid
          WHEN lower(cpp.contratante) LIKE '%triangulo%' OR lower(cpp.contratante) LIKE '%triângulo%' THEN 'a798620a-358a-4c6c-9db2-3a507c583cac'::uuid
          WHEN lower(cpp.contratante) LIKE '%luminous%' OR lower(cpp.contratante) LIKE '%luminus%' THEN '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid
          WHEN lower(cpp.contratante) LIKE '%wiseowe%' THEN 'dae64d51-2181-4510-b14f-e63d2f111a8e'::uuid
          WHEN lower(cpp.contratante) IN ('rosas', 'kotrik & rosas') OR lower(cpp.contratante) LIKE '%kotrik%' THEN 'f5d32323-4d68-4a54-8fb8-0ba670dcaecf'::uuid
          ELSE NULL
        END,
        (
          SELECT emp.id
          FROM core_common.empresas emp
          WHERE UPPER(TRIM(emp.nome)) = UPPER(TRIM(cpp.contratante))
             OR UPPER(TRIM(emp.trade_name)) = UPPER(TRIM(cpp.contratante))
             OR UPPER(TRIM(emp.codigo)) = UPPER(TRIM(cpp.contratante))
          LIMIT 1
        )
      ) AS allocation_empresa_id,
      cpp.fechasalidatrabajador,
      cpp.fechafinpedido,
      cpp.inserted_at,
      w.data_baixa,
      w.status_trabajador
    FROM core_personal.vw_worker_allocations cpp
    JOIN core_personal.workers w ON w.cod_colab = cpp.cod_colab
    WHERE 
      (cpp.fechainiciopedido IS NULL OR cpp.fechainiciopedido <= v_end_date)
      AND (
        CASE 
          WHEN w.status_trabajador NOT ILIKE 'Inativo' AND w.status_trabajador NOT ILIKE 'Desligado' AND w.status_trabajador NOT ILIKE 'Baja' AND w.status_trabajador NOT ILIKE 'Pendente Baixa' AND w.status_trabajador NOT ILIKE 'Desistiu'
          THEN (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= v_start_date)
          ELSE (COALESCE(cpp.fechasalidatrabajador, w.data_baixa) IS NULL OR COALESCE(cpp.fechasalidatrabajador, w.data_baixa) >= v_start_date)
        END
      )
      AND (cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= v_start_date)
  ),
  valid_allocations AS (
    SELECT DISTINCT ON (cpp.cod_colab, cpp.cliente_nombre)
      cpp.cod_colab,
      cpp.contratante,
      cpp.cliente_nombre,
      cpp.allocation_empresa_id,
      cpp.fechasalidatrabajador,
      cpp.fechafinpedido
    FROM valid_allocations_all cpp
    WHERE p_empresa_id IS NULL OR cpp.allocation_empresa_id = p_empresa_id
    ORDER BY cpp.cod_colab, cpp.cliente_nombre,
             COALESCE(cpp.fechasalidatrabajador, cpp.fechafinpedido, v_end_date) DESC,
             cpp.inserted_at DESC
  ),
  base_workers AS (
    SELECT 
      w.id,
      p_empresa_id as empresa_id,
      w.cod_colab,
      w.nome,
      w.email,
      w.movil,
      w.niss,
      w.nif,
      w.nie,
      w.dni,
      w.pasaporte,
      w.status_seguridad,
      w.status_trabajador,
      COALESCE(va.contratante, w.contratante, c.contratante) AS contratante,
      COALESCE(w.funcion, c.funcion) AS funcion,
      COALESCE(va.cliente_nombre, public.fn_get_active_client_for_worker(w.cod_colab), 'NÃO DEFINIDO') AS cliente_nombre,
      w.data_baixa,
      w.created_at
    FROM core_personal.workers w
    LEFT JOIN LATERAL (
      SELECT col.contratante, col.funcion
      FROM public.colaboradores col
      WHERE col.cod_colab = w.cod_colab
      ORDER BY col.id DESC
      LIMIT 1
    ) c ON TRUE
    LEFT JOIN valid_allocations va ON va.cod_colab = w.cod_colab
    WHERE (
      p_empresa_id IS NULL OR
      -- Caso 1: O trabalhador tem alocação ativa nesta empresa neste período
      (va.cod_colab IS NOT NULL)
      OR
      -- Caso 2: O trabalhador não tem nenhuma alocação ativa no período e seu contrato ativo pertence a esta empresa
      (
        NOT EXISTS (
          SELECT 1 FROM valid_allocations_all vaa 
          WHERE vaa.cod_colab = w.cod_colab
        )
        AND EXISTS (
          SELECT 1 FROM core_personal.contracts cnt 
          WHERE cnt.worker_id = w.id 
            AND cnt.empresa_id = p_empresa_id
            AND cnt.created_at::date <= v_end_date
            AND (cnt.terminated_at IS NULL OR cnt.terminated_at::date >= v_start_date)
            AND cnt.status = 'signed'
        )
      )
    )
    AND (
      (w.status_trabajador NOT ILIKE 'Inativo' AND w.status_trabajador NOT ILIKE 'Desligado' AND w.status_trabajador NOT ILIKE 'Pendente Baixa' AND w.status_trabajador NOT ILIKE 'Baja' AND w.status_trabajador NOT ILIKE 'Desistiu')
      OR
      (w.data_baixa IS NOT NULL AND w.data_baixa >= v_start_date)
      OR
      (va.fechasalidatrabajador IS NOT NULL AND va.fechasalidatrabajador >= v_start_date)
      OR
      EXISTS (
          SELECT 1 FROM core_personal.worker_hours wh
          WHERE wh.worker_id = w.id
            AND wh.period_year = p_period_year
            AND wh.period_month = p_period_month
            AND wh.status != 'pendente'
      )
      OR
      EXISTS (
          SELECT 1 FROM core_finance.horas_trabalhadas ht
          WHERE ht.worker_id = w.id
            AND ht.data_trabalho >= v_start_date
            AND ht.data_trabalho <= v_end_date
      )
    )
  ),
  filtered AS (
    SELECT bw.*
    FROM base_workers bw
    WHERE (p_contratante IS NULL OR p_contratante = '' OR bw.contratante ILIKE '%' || p_contratante || '%')
      AND (p_cliente_nombre IS NULL OR p_cliente_nombre = '' OR bw.cliente_nombre ILIKE '%' || p_cliente_nombre || '%')
  ),
  total AS (
    SELECT COUNT(*) AS exact_count FROM filtered
  )
  SELECT 
    (SELECT COUNT(*) FROM filtered) AS total_count,
    f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.cliente_nombre, f.data_baixa, f.created_at
  FROM filtered f
  ORDER BY f.nome ASC;
END;
$function$;

-- 7. Atualizar core_personal.search_workers para reconhecer HEXAGON e trade_name dinâmico
CREATE OR REPLACE FUNCTION core_personal.search_workers(
  p_empresa_id text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_cliente_nombre text[] DEFAULT NULL::text[],
  p_status_trabajador_filter text[] DEFAULT NULL::text[],
  p_status_seguridad_filter text[] DEFAULT NULL::text[],
  p_contratante text DEFAULT NULL::text,
  p_funcion text DEFAULT NULL::text,
  p_sort_column text DEFAULT 'nome'::text,
  p_sort_direction text DEFAULT 'asc'::text,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50,
  p_period_month integer DEFAULT NULL::integer,
  p_period_year integer DEFAULT NULL::integer
)
RETURNS TABLE(
  total_count bigint,
  id uuid,
  empresa_id uuid,
  cod_colab text,
  nome text,
  email text,
  movil text,
  niss text,
  nif text,
  nie text,
  dni text,
  pasaporte text,
  status_seguridad text,
  status_trabajador text,
  contratante text,
  funcion text,
  cliente_nombre text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset integer;
  v_holding_id text := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'; -- GRP - Login Pro
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH dedup_workers AS (
    SELECT DISTINCT ON (COALESCE(NULLIF(UPPER(TRIM(w.cod_colab)), ''), w.id::text))
      w.*
    FROM core_personal.workers w
    WHERE w.deleted_at IS NULL
    ORDER BY
      COALESCE(NULLIF(UPPER(TRIM(w.cod_colab)), ''), w.id::text),
      CASE WHEN w.pasaporte IS NOT NULL AND TRIM(w.pasaporte) <> '' THEN 0 ELSE 1 END,
      w.created_at DESC NULLS LAST
  ),
  base_workers AS (
    SELECT 
      w.id,
      COALESCE(
        e.id,
        (
          SELECT cnt.empresa_id
          FROM core_personal.contracts cnt
          WHERE cnt.worker_id = w.id
          ORDER BY cnt.created_at DESC
          LIMIT 1
        ),
        (
          SELECT wa.empresa_id
          FROM core_personal.worker_assignments wa
          WHERE wa.worker_id = w.id
          ORDER BY wa.planned_start_date DESC
          LIMIT 1
        )
      ) as empresa_id,
      w.cod_colab,
      w.nome,
      w.email,
      w.movil,
      w.niss,
      w.nif,
      w.nie,
      w.dni,
      w.pasaporte,
      w.status_seguridad,
      w.status_trabajador,
      w.data_ingresso,
      w.data_alta_seguridad,
      w.created_at,
      COALESCE(NULLIF(w.contratante, ''), c.contratante) as contratante,
      COALESCE(NULLIF(w.funcion, ''), jf.name, c.funcion) as funcion,
      COALESCE(NULLIF(w.cliente, ''), core_personal.fn_get_active_client_for_worker(w.cod_colab)) as active_client_nombre
    FROM dedup_workers w
    LEFT JOIN LATERAL (
      SELECT j.name
      FROM core_comercial.job_functions j
      WHERE j.code = w.cod_funcion
      LIMIT 1
    ) jf ON TRUE
    LEFT JOIN LATERAL (
      SELECT col.contratante, col.funcion
      FROM public.colaboradores col
      WHERE col.cod_colab = w.cod_colab
      ORDER BY col.id DESC
      LIMIT 1
    ) c ON TRUE
    LEFT JOIN LATERAL (
      SELECT emp.id
      FROM core_common.empresas emp
      WHERE (
        UPPER(TRIM(emp.codigo)) = UPPER(TRIM(w.contratante)) OR 
        UPPER(TRIM(emp.nome)) = UPPER(TRIM(w.contratante)) OR
        UPPER(TRIM(emp.trade_name)) = UPPER(TRIM(w.contratante)) OR
        UPPER(TRIM(emp.legal_name)) = UPPER(TRIM(w.contratante)) OR
        (UPPER(w.contratante) LIKE 'HEXAGON%' AND emp.codigo = 'HEX') OR
        (UPPER(w.contratante) LIKE 'LUMINOUS%' AND emp.codigo = 'LUM') OR
        (UPPER(w.contratante) LIKE 'WISEOWE%' AND emp.codigo = 'WIS') OR
        (UPPER(w.contratante) LIKE 'STOCCO%' AND emp.codigo = 'STO') OR
        (UPPER(w.contratante) LIKE 'TRIANGULO%' AND emp.codigo = 'TRI') OR
        (UPPER(w.contratante) LIKE '%ROSAS%' AND emp.codigo IN ('KOT', 'KOR'))
      )
      LIMIT 1
    ) e ON TRUE
  ),
  filtered AS (
    SELECT bw.*
    FROM base_workers bw
    WHERE (
        p_empresa_id IS NULL 
        OR p_empresa_id = '' 
        OR p_empresa_id = v_holding_id 
        OR (bw.empresa_id IS NOT NULL AND bw.empresa_id::text = p_empresa_id)
        OR EXISTS (
          SELECT 1 FROM core_personal.contracts cnt 
          WHERE cnt.worker_id = bw.id AND cnt.empresa_id::text = p_empresa_id
        )
        OR EXISTS (
          SELECT 1 FROM core_personal.worker_assignments wa 
          WHERE wa.worker_id = bw.id AND wa.empresa_id::text = p_empresa_id
        )
        OR (bw.empresa_id IS NULL AND (p_empresa_id IS NULL OR p_empresa_id = '' OR p_empresa_id = v_holding_id))
      )
      AND NOT (bw.cod_colab LIKE '%-0' OR bw.cod_colab LIKE '%-0-0')
      AND NOT (bw.nome ILIKE 'Colaborador E%' AND (bw.contratante IS NULL OR TRIM(bw.contratante) = ''))
      AND (
        p_search IS NULL OR TRIM(p_search) = '' OR (
          bw.nome ILIKE '%' || TRIM(p_search) || '%' OR
          bw.cod_colab ILIKE '%' || TRIM(p_search) || '%' OR
          bw.nif ILIKE '%' || TRIM(p_search) || '%' OR
          bw.niss ILIKE '%' || TRIM(p_search) || '%' OR
          bw.nie ILIKE '%' || TRIM(p_search) || '%' OR
          bw.dni ILIKE '%' || TRIM(p_search) || '%' OR
          bw.pasaporte ILIKE '%' || TRIM(p_search) || '%'
        )
      )
      AND (p_cliente_nombre IS NULL OR cardinality(p_cliente_nombre) = 0 OR bw.active_client_nombre = ANY(p_cliente_nombre))
      AND (
        p_status_trabajador_filter IS NULL 
        OR cardinality(p_status_trabajador_filter) = 0 
        OR bw.status_trabajador = ANY(p_status_trabajador_filter)
        OR (
          EXISTS (
            SELECT 1 FROM unnest(p_status_trabajador_filter) AS st
            WHERE 
              (st = 'ativos' AND (bw.status_trabajador ILIKE 'Ativo%' OR bw.status_trabajador ILIKE 'Activo%'))
              OR
              (st = 'inativos' AND (
                bw.status_trabajador ILIKE 'Inativo%' 
                OR bw.status_trabajador ILIKE 'Inactivo%' 
                OR bw.status_trabajador ILIKE 'Desligado%' 
                OR bw.status_trabajador ILIKE 'Desistiu%'
              ))
              OR
              (st IN ('pendientes_ingreso', 'pendentes_ingreso', 'pendentes_ingresso') AND (
                bw.status_trabajador ILIKE '%Pendente%' 
                OR bw.status_trabajador ILIKE '%Pendiente%'
              ))
              OR
              (st IN ('disponiveis', 'disponivel', 'disponíveis') AND bw.status_trabajador ILIKE 'Dispon%')
              OR
              (st = 'desistiu' AND bw.status_trabajador ILIKE 'Desist%')
              OR
              (bw.status_trabajador ILIKE st)
          )
        )
      )
      AND (
        p_status_seguridad_filter IS NULL 
        OR cardinality(p_status_seguridad_filter) = 0 
        OR bw.status_seguridad = ANY(p_status_seguridad_filter)
        OR (
          EXISTS (
            SELECT 1 FROM unnest(p_status_seguridad_filter) AS sf
            WHERE 
              (sf = 'alta' AND bw.status_seguridad ILIKE 'Alta')
              OR
              (sf = 'pendentes_alta' AND (bw.status_seguridad ILIKE 'Pendente Alta' OR bw.status_seguridad ILIKE 'Pendiente Alta'))
              OR
              (sf = 'baixa' AND (bw.status_seguridad ILIKE 'Baixa' OR bw.status_seguridad ILIKE 'Baja' OR bw.status_seguridad ILIKE 'Anulado'))
              OR
              (sf = 'pendentes_baixa' AND (bw.status_seguridad ILIKE 'Pendente Baixa' OR bw.status_seguridad ILIKE 'Pendiente Baja'))
              OR
              (sf = 'em_regularizacao' AND (
                bw.status_seguridad ILIKE 'Em Regulariza%' 
                OR bw.status_seguridad ILIKE 'En Regulariza%'
              ))
              OR
              (bw.status_seguridad ILIKE sf)
          )
        )
      )
      AND (p_contratante IS NULL OR bw.contratante ILIKE '%' || p_contratante || '%')
      AND (p_funcion IS NULL OR bw.funcion ILIKE '%' || p_funcion || '%')
      AND (
        p_period_month IS NULL OR p_period_year IS NULL OR
        (EXTRACT(MONTH FROM bw.data_ingresso) = p_period_month AND EXTRACT(YEAR FROM bw.data_ingresso) = p_period_year) OR
        (EXTRACT(MONTH FROM bw.data_alta_seguridad) = p_period_month AND EXTRACT(YEAR FROM bw.data_alta_seguridad) = p_period_year) OR
        (EXTRACT(MONTH FROM bw.created_at) = p_period_month AND EXTRACT(YEAR FROM bw.created_at) = p_period_year)
      )
  ),
  total AS (
    SELECT COUNT(*) AS exact_count FROM filtered
  )
  SELECT 
    (SELECT exact_count FROM total) AS total_count,
    f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.active_client_nombre as cliente_nombre, f.created_at
  FROM filtered f
  ORDER BY
    CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'asc' THEN f.nome END ASC,
    CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'desc' THEN f.nome END DESC,
    CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'asc' THEN f.cod_colab END ASC,
    CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'desc' THEN f.cod_colab END DESC,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'asc' THEN f.active_client_nombre END ASC,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'desc' THEN f.active_client_nombre END DESC,
    CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'asc' THEN f.contratante END ASC,
    CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'desc' THEN f.contratante END DESC,
    CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'asc' THEN f.funcion END ASC,
    CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'desc' THEN f.funcion END DESC,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'asc' THEN f.status_trabajador END ASC,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'desc' THEN f.status_trabajador END DESC,
    f.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;

-- 8. Atualizar core_personal.get_client_worker_kpis com LATERAL joins e suporte a HEXAGON
CREATE OR REPLACE FUNCTION core_personal.get_client_worker_kpis(
  p_empresa_id uuid,
  p_search text DEFAULT NULL::text,
  p_cliente_nombre text[] DEFAULT NULL::text[],
  p_contratante text DEFAULT NULL::text,
  p_funcion text DEFAULT NULL::text
)
RETURNS TABLE(
  ativos bigint,
  inativos bigint,
  pendentes_ingreso bigint,
  seguridade_alta bigint,
  seguridade_pendente_alta bigint,
  seguridade_em_regularizacao bigint,
  seguridade_baixa bigint,
  seguridade_pendente_baixa bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_holding_id uuid := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid;
BEGIN
    IF NOT (
        public.get_my_role() = 'super_admin'
        OR (p_empresa_id IS NULL AND core_common.is_member(v_holding_id))
        OR (p_empresa_id IS NOT NULL AND (core_common.is_member(p_empresa_id) OR core_common.is_member(v_holding_id)))
    ) THEN
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint;
        RETURN;
    END IF;

    RETURN QUERY
    WITH dedup_workers AS (
      SELECT DISTINCT ON (COALESCE(NULLIF(UPPER(TRIM(w.cod_colab)), ''), w.id::text))
        w.*
      FROM core_personal.workers w
      WHERE w.deleted_at IS NULL
      ORDER BY
        COALESCE(NULLIF(UPPER(TRIM(w.cod_colab)), ''), w.id::text),
        CASE WHEN w.pasaporte IS NOT NULL AND TRIM(w.pasaporte) <> '' THEN 0 ELSE 1 END,
        w.created_at DESC NULLS LAST
    ),
    base_workers AS (
        SELECT 
            w.id,
            COALESCE(
              e.id,
              (
                SELECT cnt.empresa_id
                FROM core_personal.contracts cnt
                WHERE cnt.worker_id = w.id
                ORDER BY cnt.created_at DESC
                LIMIT 1
              ),
              (
                SELECT wa.empresa_id
                FROM core_personal.worker_assignments wa
                WHERE wa.worker_id = w.id
                ORDER BY wa.planned_start_date DESC
                LIMIT 1
              )
            ) as empresa_id,
            w.status_trabajador,
            w.status_seguridad,
            w.nome,
            w.cod_colab,
            w.dni,
            w.pasaporte,
            w.niss,
            w.nie,
            COALESCE(NULLIF(w.contratante, ''), c.contratante) as contratante,
            COALESCE(NULLIF(w.funcion, ''), jf.name, c.funcion) as funcion,
            COALESCE(NULLIF(w.cliente, ''), core_personal.fn_get_active_client_for_worker(w.cod_colab)) as active_client
        FROM dedup_workers w
        LEFT JOIN LATERAL (
          SELECT j.name
          FROM core_comercial.job_functions j
          WHERE j.code = w.cod_funcion
          LIMIT 1
        ) jf ON TRUE
        LEFT JOIN LATERAL (
          SELECT col.contratante, col.funcion
          FROM public.colaboradores col
          WHERE col.cod_colab = w.cod_colab
          ORDER BY col.id DESC
          LIMIT 1
        ) c ON TRUE
        LEFT JOIN LATERAL (
          SELECT emp.id
          FROM core_common.empresas emp
          WHERE (
            UPPER(TRIM(emp.codigo)) = UPPER(TRIM(w.contratante)) OR 
            UPPER(TRIM(emp.nome)) = UPPER(TRIM(w.contratante)) OR
            UPPER(TRIM(emp.trade_name)) = UPPER(TRIM(w.contratante)) OR
            UPPER(TRIM(emp.legal_name)) = UPPER(TRIM(w.contratante)) OR
            (UPPER(w.contratante) LIKE 'HEXAGON%' AND emp.codigo = 'HEX') OR
            (UPPER(w.contratante) LIKE 'LUMINOUS%' AND emp.codigo = 'LUM') OR
            (UPPER(w.contratante) LIKE 'WISEOWE%' AND emp.codigo = 'WIS') OR
            (UPPER(w.contratante) LIKE 'STOCCO%' AND emp.codigo = 'STO') OR
            (UPPER(w.contratante) LIKE 'TRIANGULO%' AND emp.codigo = 'TRI') OR
            (UPPER(w.contratante) LIKE '%ROSAS%' AND emp.codigo IN ('KOT', 'KOR'))
          )
          LIMIT 1
        ) e ON TRUE
    ),
    filtered_kpis AS (
        SELECT bw.*
        FROM base_workers bw
        WHERE 
            (
              p_empresa_id IS NULL 
              OR p_empresa_id = v_holding_id 
              OR bw.empresa_id = p_empresa_id
              OR EXISTS (
                SELECT 1 FROM core_personal.contracts cnt 
                WHERE cnt.worker_id = bw.id AND cnt.empresa_id = p_empresa_id
              )
              OR EXISTS (
                SELECT 1 FROM core_personal.worker_assignments wa 
                WHERE wa.worker_id = bw.id AND wa.empresa_id = p_empresa_id
              )
              OR (bw.empresa_id IS NULL AND (p_empresa_id IS NULL OR p_empresa_id = v_holding_id))
            )
            AND NOT (bw.cod_colab LIKE '%-0' OR bw.cod_colab LIKE '%-0-0')
            AND NOT (bw.nome ILIKE 'Colaborador E%' AND (bw.contratante IS NULL OR TRIM(bw.contratante) = ''))
            AND (
                p_search IS NULL OR TRIM(p_search) = '' 
                OR bw.nome ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.cod_colab ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.dni ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.pasaporte ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.niss ILIKE '%' || TRIM(p_search) || '%' 
                OR bw.nie ILIKE '%' || TRIM(p_search) || '%'
            )
            AND (p_contratante IS NULL OR TRIM(p_contratante) = '' OR bw.contratante ILIKE '%' || TRIM(p_contratante) || '%')
            AND (p_funcion IS NULL OR TRIM(p_funcion) = '' OR bw.funcion ILIKE '%' || TRIM(p_funcion) || '%')
            AND (p_cliente_nombre IS NULL OR cardinality(p_cliente_nombre) = 0 OR bw.active_client = ANY(p_cliente_nombre))
    )
    SELECT 
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Ativo%' OR wk.status_trabajador ILIKE 'Activo%')::bigint AS ativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Inativo%' OR wk.status_trabajador ILIKE 'Inactivo%' OR wk.status_trabajador ILIKE 'Desligado%' OR wk.status_trabajador ILIKE 'Desistiu%')::bigint AS inativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE '%Pendente%' OR wk.status_trabajador ILIKE '%Pendiente%')::bigint AS pendentes_ingreso,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Alta')::bigint AS seguridade_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendente Alta' OR wk.status_seguridad ILIKE 'Pendiente Alta')::bigint AS seguridade_pendente_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Em Regulariza%' OR wk.status_seguridad ILIKE 'En Regulariza%')::bigint AS seguridade_em_regularizacao,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Baixa' OR wk.status_seguridad ILIKE 'Baja' OR wk.status_seguridad ILIKE 'Anulado')::bigint AS seguridade_baixa,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendente Baixa' OR wk.status_seguridad ILIKE 'Pendiente Baja')::bigint AS seguridade_pendente_baixa
    FROM filtered_kpis wk;
END;
$function$;
