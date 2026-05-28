-- ========================================================================================
-- MIGRATION: FIX RPC CRIAR ESTIMACION COMPLETA STATUS
-- Objetivo: Corrigir o status hardcoded da versão para 'active' (draft violava a constraint).
-- ========================================================================================

BEGIN;

-- 0. Ajustar a tabela estimacion_costs para suportar custos globais (vindos da UI)
ALTER TABLE core_comercial.estimacion_costs ADD COLUMN IF NOT EXISTS estimacion_version_id UUID REFERENCES core_comercial.estimacion_versions(id) ON DELETE CASCADE;
ALTER TABLE core_comercial.estimacion_costs ALTER COLUMN estimacion_item_id DROP NOT NULL;
ALTER TABLE core_comercial.estimacion_costs ADD COLUMN IF NOT EXISTS cost_category VARCHAR;
ALTER TABLE core_comercial.estimacion_costs ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2);
ALTER TABLE core_comercial.estimacion_costs ADD COLUMN IF NOT EXISTS is_rechargeable BOOLEAN DEFAULT false;
ALTER TABLE core_comercial.estimacion_costs ADD COLUMN IF NOT EXISTS markup_percent DECIMAL(5,2);

CREATE OR REPLACE FUNCTION core_comercial.criar_estimacion_completa(p_payload jsonb)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' 
AS $$
DECLARE
    v_user_id UUID;
    v_empresa_id UUID;
    v_client_id UUID;
    v_client_site_id UUID;
    v_estimation_type TEXT;
    v_contact_name TEXT;
    v_contact_email TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_validity_date DATE;
    v_payment_terms TEXT;
    v_general_notes TEXT;
    v_status TEXT;
    v_items JSONB;
    v_item JSONB;
    
    v_estimacion_id UUID;
    v_codigo TEXT;
    v_version_id UUID;
    
    -- Totais e cálculos
    v_total_estimated_cost NUMERIC(15,2) := 0;
    v_total_estimated_revenue NUMERIC(15,2) := 0;
    v_margin_percent NUMERIC(5,2) := 0;
    
    -- Validação de array
    v_items_length INT;
BEGIN
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;
    
    -- 1. Extrair payload principal
    v_empresa_id := (NULLIF(p_payload->>'empresa_id', ''))::uuid;
    v_client_id := (NULLIF(p_payload->>'client_id', ''))::uuid;
    v_client_site_id := (NULLIF(p_payload->>'client_site_id', ''))::uuid;
    v_estimation_type := COALESCE(NULLIF(p_payload->>'estimation_type', ''), 'new_allocation');
    v_contact_name := NULLIF(p_payload->>'contact_name', '');
    v_contact_email := NULLIF(p_payload->>'contact_email', '');
    v_start_date := (NULLIF(p_payload->>'expected_start_date', ''))::date;
    v_end_date := (NULLIF(p_payload->>'expected_end_date', ''))::date;
    v_validity_date := (NULLIF(p_payload->>'validity_date', ''))::date;
    v_payment_terms := p_payload->>'payment_terms';
    v_general_notes := p_payload->>'general_notes';
    v_status := COALESCE(p_payload->>'status', 'draft');
    v_items := p_payload->'items';

    IF v_empresa_id IS NULL OR v_client_id IS NULL THEN
        RAISE EXCEPTION 'empresa_id e client_id são obrigatórios.';
    END IF;

    -- 2. Validar permissões
    IF NOT (
        core_common.has_role(v_empresa_id, 'super_admin') OR 
        core_common.has_role(v_empresa_id, 'operador')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para criar estimación na empresa %', v_empresa_id;
    END IF;

    -- 3. Validar array de itens
    v_items_length := jsonb_array_length(v_items);
    IF v_items_length IS NULL OR v_items_length = 0 THEN
        RAISE EXCEPTION 'A estimación deve conter pelo menos 1 item.';
    END IF;

    -- 3.5. Gerar código sequencial/randômico (Formato: EST-YYYYMMDD-XXXX)
    v_codigo := 'EST-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));

    -- 4. Inserir Estimación
    INSERT INTO core_comercial.estimaciones (
        empresa_id, codigo, client_id, client_site_id, 
        estimation_type, contact_name, contact_email,
        expected_start_date, expected_end_date, validity_date, payment_terms, status,
        general_notes,
        created_by, updated_by
    ) VALUES (
        v_empresa_id, v_codigo, v_client_id, v_client_site_id, 
        v_estimation_type, v_contact_name, v_contact_email,
        v_start_date, v_end_date, v_validity_date, v_payment_terms, v_status,
        v_general_notes,
        v_user_id, v_user_id
    )
    RETURNING id, codigo INTO v_estimacion_id, v_codigo;

    -- 5. Inserir Version (Version Number = 1)
    INSERT INTO core_comercial.estimacion_versions (
        empresa_id, estimacion_id, version_number, status,
        notes, created_by
    ) VALUES (
        v_empresa_id, v_estimacion_id, 1, 'active',
        'Versão inicial criada automaticamente', v_user_id
    )
    RETURNING id INTO v_version_id;

    -- 6. Atualizar a Estimación com a current_version_id
    UPDATE core_comercial.estimaciones
    SET current_version_id = v_version_id
    WHERE id = v_estimacion_id;

    -- 7. Loop de Inserção de Itens e Somatório
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        -- Validações de item
        IF v_item->>'job_function_id' IS NULL OR v_item->>'job_function_id' = '' THEN RAISE EXCEPTION 'Perfil/Função é obrigatório em todos os itens.'; END IF;
        IF (v_item->>'quantity')::int <= 0 THEN RAISE EXCEPTION 'Quantidade deve ser maior que 0.'; END IF;
        IF (v_item->>'planned_hours_per_day')::numeric < 0 THEN RAISE EXCEPTION 'Horas por dia não pode ser negativo.'; END IF;
        IF (v_item->>'planned_days_per_week')::numeric < 0 THEN RAISE EXCEPTION 'Dias por semana não pode ser negativo.'; END IF;
        IF (v_item->>'sell_rate_hour')::numeric < 0 THEN RAISE EXCEPTION 'Tarifa de venda não pode ser negativa.'; END IF;
        IF (v_item->>'base_cost_hour')::numeric < 0 THEN RAISE EXCEPTION 'Custo base não pode ser negativo.'; END IF;

        INSERT INTO core_comercial.estimacion_items (
            empresa_id, estimacion_id, estimacion_version_id, job_function_id,
            quantity, planned_hours_per_day, planned_days_per_week, planned_total_hours,
            includes_housing, includes_transport, includes_epi,
            base_cost_hour, recommended_sell_rate_hour, minimum_sell_rate_hour, sell_rate_hour,
            margin_percent, risk_level_snapshot, description,
            created_by, updated_by
        ) VALUES (
            v_empresa_id, v_estimacion_id, v_version_id, (NULLIF(v_item->>'job_function_id', ''))::uuid,
            (v_item->>'quantity')::int, (v_item->>'planned_hours_per_day')::numeric, 
            (v_item->>'planned_days_per_week')::numeric, (v_item->>'total_hours')::numeric,
            (v_item->>'includes_accommodation')::boolean, (v_item->>'includes_transport')::boolean, 
            (v_item->>'includes_ppe')::boolean,
            (v_item->>'base_cost_hour')::numeric, (v_item->>'recommended_sell_rate')::numeric, 
            (v_item->>'minimum_sell_rate')::numeric, (v_item->>'sell_rate_hour')::numeric,
            (v_item->>'margin_percent')::numeric, v_item->>'risk_level', v_item->>'notes',
            v_user_id, v_user_id
        );

    END LOOP;

    v_total_estimated_cost := COALESCE((p_payload->>'total_estimated_cost')::numeric, 0);
    v_total_estimated_revenue := COALESCE((p_payload->>'total_estimated_revenue')::numeric, 0);
    v_margin_percent := COALESCE((p_payload->>'estimated_margin_percent')::numeric, 0);

    -- Atualizar totais na Versão
    UPDATE core_comercial.estimacion_versions
    SET 
        total_cost = v_total_estimated_cost,
        total_revenue = v_total_estimated_revenue,
        margin_percent = v_margin_percent
    WHERE id = v_version_id;

    -- 8. Custos adicionais (se houver)
    IF p_payload->'costs' IS NOT NULL AND jsonb_array_length(p_payload->'costs') > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'costs')
        LOOP
            INSERT INTO core_comercial.estimacion_costs (
                empresa_id, estimacion_version_id,
                cost_category, description, amount, is_rechargeable, markup_percent,
                created_by, updated_by
            ) VALUES (
                v_empresa_id, v_version_id,
                v_item->>'cost_category', v_item->>'description', (v_item->>'amount')::numeric,
                (v_item->>'is_rechargeable')::boolean, (v_item->>'markup_percent')::numeric,
                v_user_id, v_user_id
            );
        END LOOP;
    END IF;

    -- 9. Retorno
    RETURN json_build_object(
        'status', 'success',
        'estimacion_id', v_estimacion_id,
        'codigo', v_codigo,
        'version_id', v_version_id,
        'total_cost', v_total_estimated_cost,
        'total_revenue', v_total_estimated_revenue,
        'margin_percent', v_margin_percent
    );
END;
$$;

-- Permissões
REVOKE ALL ON FUNCTION core_comercial.criar_estimacion_completa(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core_comercial.criar_estimacion_completa(jsonb) TO authenticated;

-- Atualizar o cache do PostgREST para garantir que ele reconheça a nova coluna na tabela de custos
NOTIFY pgrst, 'reload schema';

COMMIT;
