-- Migration: Add Legal Representative (Firmante) fields to Clients, Contacts, Leads, and Estimaciones
-- Plus public RPCs for collecting fiscal + legal representative data via shareable link

-- 1. Add columns to core_common.clients
ALTER TABLE core_common.clients
    ADD COLUMN IF NOT EXISTS legal_rep_name TEXT,
    ADD COLUMN IF NOT EXISTS legal_rep_tax_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS legal_rep_role TEXT;

-- 2. Add columns to core_common.client_contacts
ALTER TABLE core_common.client_contacts
    ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS is_legal_representative BOOLEAN DEFAULT FALSE;

-- 3. Add columns to core_comercial.leads
ALTER TABLE core_comercial.leads
    ADD COLUMN IF NOT EXISTS legal_rep_name TEXT,
    ADD COLUMN IF NOT EXISTS legal_rep_tax_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS legal_rep_role TEXT;

-- 4. Add columns to core_comercial.estimaciones
ALTER TABLE core_comercial.estimaciones
    ADD COLUMN IF NOT EXISTS signer_tax_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS signer_role TEXT;

-- 5. Update core_comercial.criar_estimacion_completa to support signer_tax_id and signer_role
CREATE OR REPLACE FUNCTION core_comercial.criar_estimacion_completa(p_payload jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_user_id UUID;
    v_commercial_owner_id UUID;
    v_empresa_id UUID;
    v_client_id UUID;
    v_lead_id UUID;
    v_client_site_id UUID;
    v_country_id UUID;
    v_estimation_type TEXT;
    v_contact_name TEXT;
    v_contact_email TEXT;
    v_signer_tax_id TEXT;
    v_signer_role TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_validity_date DATE;
    v_payment_terms TEXT;
    v_general_notes TEXT;
    v_postal_code TEXT;
    v_status TEXT;
    v_document_language TEXT;
    v_payment_term_id UUID;
    v_pricing_model TEXT;
    v_fixed_price_notes TEXT;
    
    -- Campos de jornada e receitas
    v_work_lunes BOOLEAN;
    v_work_martes BOOLEAN;
    v_work_miercoles BOOLEAN;
    v_work_jueves BOOLEAN;
    v_work_viernes BOOLEAN;
    v_work_sabado BOOLEAN;
    v_work_domingo BOOLEAN;
    v_hours_weekday NUMERIC(5,2);
    v_hours_sabado NUMERIC(5,2);
    v_hours_domingo NUMERIC(5,2);
    v_additional_revenues JSONB;

    -- Horas individuais
    v_hours_lunes NUMERIC(5,2);
    v_hours_martes NUMERIC(5,2);
    v_hours_miercoles NUMERIC(5,2);
    v_hours_jueves NUMERIC(5,2);
    v_hours_viernes NUMERIC(5,2);

    -- Campos de governança/revisão
    v_review_justification TEXT;
    v_review_requested_at TIMESTAMPTZ;
    v_viability_reasons JSONB;

    v_items JSONB;
    v_item JSONB;
    
    v_estimacion_id UUID;
    v_codigo TEXT;
    v_version_id UUID;
    
    -- Totais e cálculos
    v_total_estimated_cost NUMERIC(15,2) := 0;
    v_total_estimated_revenue NUMERIC(15,2) := 0;
    v_margin_percent NUMERIC(5,2) := 0;
    
    v_items_length INT;
BEGIN
    v_user_id := COALESCE(
        auth.uid(),
        (NULLIF(NULLIF(p_payload->>'user_id', ''), 'none'))::uuid,
        (NULLIF(NULLIF(p_payload->>'created_by', ''), 'none'))::uuid,
        (NULLIF(NULLIF(p_payload->>'commercial_owner_id', ''), 'none'))::uuid,
        (NULLIF(current_setting('request.jwt.claim.sub', true), ''))::uuid
    );

    v_commercial_owner_id := COALESCE(
        (NULLIF(NULLIF(p_payload->>'commercial_owner_id', ''), 'none'))::uuid,
        v_user_id
    );
    
    -- 1. Extrair payload principal com sanitização contra 'none'
    v_empresa_id := (NULLIF(NULLIF(p_payload->>'empresa_id', ''), 'none'))::uuid;
    v_client_id := (NULLIF(NULLIF(p_payload->>'client_id', ''), 'none'))::uuid;
    v_lead_id := (NULLIF(NULLIF(p_payload->>'lead_id', ''), 'none'))::uuid;
    v_client_site_id := (NULLIF(NULLIF(p_payload->>'client_site_id', ''), 'none'))::uuid;
    v_country_id := (NULLIF(NULLIF(p_payload->>'country_id', ''), 'none'))::uuid;
    v_estimation_type := COALESCE(NULLIF(p_payload->>'estimation_type', ''), 'new_allocation');
    v_contact_name := NULLIF(p_payload->>'contact_name', '');
    v_contact_email := NULLIF(p_payload->>'contact_email', '');
    v_signer_tax_id := NULLIF(p_payload->>'signer_tax_id', '');
    v_signer_role := NULLIF(p_payload->>'signer_role', '');
    v_start_date := (NULLIF(p_payload->>'expected_start_date', ''))::date;
    v_end_date := (NULLIF(p_payload->>'expected_end_date', ''))::date;
    v_validity_date := COALESCE((NULLIF(p_payload->>'validity_date', ''))::date, (CURRENT_DATE + INTERVAL '15 days')::date);
    v_payment_terms := p_payload->>'payment_terms';
    v_general_notes := p_payload->>'general_notes';
    v_postal_code := p_payload->>'postal_code';
    v_status := COALESCE(NULLIF(p_payload->>'status', ''), 'draft');
    v_document_language := COALESCE(NULLIF(p_payload->>'document_language', ''), 'pt');
    v_pricing_model := COALESCE(NULLIF(p_payload->>'pricing_model', ''), 'hourly');
    v_fixed_price_notes := NULLIF(p_payload->>'fixed_price_notes', '');
    v_payment_term_id := (NULLIF(NULLIF(p_payload->>'payment_term_id', ''), 'none'))::uuid;
    IF v_payment_term_id IS NOT NULL THEN
        SELECT name INTO v_payment_terms FROM core_common.payment_terms WHERE id = v_payment_term_id;
    END IF;
    
    -- Governança
    v_review_justification := p_payload->>'review_justification';
    IF p_payload->>'review_requested_at' IS NOT NULL THEN
        v_review_requested_at := (p_payload->>'review_requested_at')::timestamptz;
    ELSIF v_status = 'review' THEN
        v_review_requested_at := NOW();
    ELSE
        v_review_requested_at := NULL;
    END IF;
    v_viability_reasons := p_payload->'viability_reasons';

    -- Jornada
    v_work_lunes := COALESCE((p_payload->>'work_lunes')::boolean, true);
    v_work_martes := COALESCE((p_payload->>'work_martes')::boolean, true);
    v_work_miercoles := COALESCE((p_payload->>'work_miercoles')::boolean, true);
    v_work_jueves := COALESCE((p_payload->>'work_jueves')::boolean, true);
    v_work_viernes := COALESCE((p_payload->>'work_viernes')::boolean, true);
    v_work_sabado := COALESCE((p_payload->>'work_sabado')::boolean, false);
    v_work_domingo := COALESCE((p_payload->>'work_domingo')::boolean, false);
    v_hours_weekday := COALESCE((p_payload->>'hours_weekday')::numeric, 8.0);
    v_hours_sabado := COALESCE((p_payload->>'hours_sabado')::numeric, 0.0);
    v_hours_domingo := COALESCE((p_payload->>'hours_domingo')::numeric, 0.0);
    v_additional_revenues := COALESCE(p_payload->'additional_revenues', '[]'::jsonb);

    v_hours_lunes := COALESCE((p_payload->>'hours_lunes')::numeric, v_hours_weekday);
    v_hours_martes := COALESCE((p_payload->>'hours_martes')::numeric, v_hours_weekday);
    v_hours_miercoles := COALESCE((p_payload->>'hours_miercoles')::numeric, v_hours_weekday);
    v_hours_jueves := COALESCE((p_payload->>'hours_jueves')::numeric, v_hours_weekday);
    v_hours_viernes := COALESCE((p_payload->>'hours_viernes')::numeric, v_hours_weekday);

    v_items := p_payload->'items';
 
    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'empresa_id é obrigatório.';
    END IF;
 
    IF v_client_id IS NULL AND v_lead_id IS NULL THEN
        RAISE EXCEPTION 'Deve informar ou um client_id ou um lead_id.';
    END IF;
 
    -- 2. Validar permissões
    IF NOT (
        core_common.has_role(v_empresa_id, 'super_admin') OR
        core_common.has_role(v_empresa_id, 'admin') OR 
        core_common.has_role(v_empresa_id, 'commercial') OR 
        core_common.has_role(v_empresa_id, 'operador')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para criar estimación na empresa %', v_empresa_id;
    END IF;
 
    -- 3. Validar array de itens
    v_items_length := jsonb_array_length(v_items);
    IF v_items_length IS NULL OR v_items_length = 0 THEN
        RAISE EXCEPTION 'A estimación deve conter pelo menos 1 item.';
    END IF;
 
    -- 3.5. Gerar código sequencial unificado (Formato: EST-YYYY-000001)
    v_codigo := core_comercial.fn_generate_next_estimacion_code();
 
    -- 4. Inserir Estimación
    INSERT INTO core_comercial.estimaciones (
        empresa_id, codigo, client_id, lead_id, client_site_id, country_id,
        estimation_type, contact_name, contact_email, signer_tax_id, signer_role,
        expected_start_date, expected_end_date, validity_date, payment_terms, payment_term_id, status,
        general_notes, postal_code, document_language,
        pricing_model, fixed_price_notes,
        work_lunes, work_martes, work_miercoles, work_jueves, work_viernes, work_sabado, work_domingo,
        hours_weekday, hours_sabado, hours_domingo, additional_revenues,
        hours_lunes, hours_martes, hours_miercoles, hours_jueves, hours_viernes,
        review_justification, review_requested_at, viability_reasons,
        is_approved_by_manager,
        commercial_owner_id, created_by, updated_by
    ) VALUES (
        v_empresa_id, v_codigo, v_client_id, v_lead_id, v_client_site_id, v_country_id,
        v_estimation_type, v_contact_name, v_contact_email, v_signer_tax_id, v_signer_role,
        v_start_date, v_end_date, v_validity_date, v_payment_terms, v_payment_term_id, v_status,
        v_general_notes, v_postal_code, v_document_language,
        v_pricing_model, v_fixed_price_notes,
        v_work_lunes, v_work_martes, v_work_miercoles, v_work_jueves, v_work_viernes, v_work_sabado, v_work_domingo,
        v_hours_weekday, v_hours_sabado, v_hours_domingo, v_additional_revenues,
        v_hours_lunes, v_hours_martes, v_hours_miercoles, v_hours_jueves, v_hours_viernes,
        v_review_justification, v_review_requested_at, v_viability_reasons,
        FALSE,
        v_commercial_owner_id, v_user_id, v_user_id
    )
    RETURNING id, codigo INTO v_estimacion_id, v_codigo;

    -- Sync legal representative to client if provided
    IF v_client_id IS NOT NULL AND (v_contact_name IS NOT NULL OR v_signer_tax_id IS NOT NULL) THEN
        UPDATE core_common.clients
        SET
            legal_rep_name = COALESCE(v_contact_name, legal_rep_name),
            legal_rep_tax_id = COALESCE(v_signer_tax_id, legal_rep_tax_id),
            legal_rep_role = COALESCE(v_signer_role, legal_rep_role)
        WHERE id = v_client_id
          AND (legal_rep_name IS NULL OR legal_rep_tax_id IS NULL);
    END IF;
 
    -- 5. Inserir Version (Version Number = 1, status = 'active')
    INSERT INTO core_comercial.estimacion_versions (
        empresa_id, estimacion_id, version_number, status,
        notes, created_by, updated_by
    ) VALUES (
        v_empresa_id, v_estimacion_id, 1, 'active',
        'Versão inicial criada automaticamente', v_user_id, v_user_id
    )
    RETURNING id INTO v_version_id;
 
    -- 6. Atualizar a Estimación com a current_version_id
    UPDATE core_comercial.estimaciones
    SET current_version_id = v_version_id
    WHERE id = v_estimacion_id;
 
    -- 7. Loop de Inserção de Itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
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
            ss_regime, custom_lodging_rate, custom_epi_rate, custom_transport_rate,
            created_by, updated_by
        ) VALUES (
            v_empresa_id, v_estimacion_id, v_version_id, (NULLIF(NULLIF(v_item->>'job_function_id', ''), 'none'))::uuid,
            (v_item->>'quantity')::int, 
            (v_item->>'planned_hours_per_day')::numeric, 
            (v_item->>'planned_days_per_week')::numeric, 
            COALESCE((v_item->>'planned_total_hours')::numeric, (v_item->>'total_hours')::numeric, 0),
            COALESCE((v_item->>'includes_housing')::boolean, (v_item->>'includes_accommodation')::boolean, false), 
            COALESCE((v_item->>'includes_transport')::boolean, false), 
            COALESCE((v_item->>'includes_epi')::boolean, (v_item->>'includes_ppe')::boolean, false),
            (v_item->>'base_cost_hour')::numeric, 
            COALESCE((v_item->>'recommended_sell_rate_hour')::numeric, (v_item->>'recommended_sell_rate')::numeric), 
            COALESCE((v_item->>'minimum_sell_rate_hour')::numeric, (v_item->>'minimum_sell_rate')::numeric), 
            (v_item->>'sell_rate_hour')::numeric,
            (v_item->>'margin_percent')::numeric, 
            COALESCE(v_item->>'risk_level_snapshot', v_item->>'risk_level'), 
            COALESCE(v_item->>'description', v_item->>'notes'),
            COALESCE(v_item->>'ss_regime', 'local'), 
            (v_item->>'custom_lodging_rate')::numeric,
            (v_item->>'custom_epi_rate')::numeric, 
            (v_item->>'custom_transport_rate')::numeric,
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

    -- Atualizar totais na Estimación
    UPDATE core_comercial.estimaciones
    SET 
        total_estimated_cost = v_total_estimated_cost,
        total_estimated_revenue = v_total_estimated_revenue,
        estimated_margin_percent = v_margin_percent
    WHERE id = v_estimacion_id;
 
    -- 8. Custos adicionais
    IF p_payload->'costs' IS NOT NULL AND jsonb_array_length(p_payload->'costs') > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'costs')
        LOOP
            INSERT INTO core_comercial.estimacion_costs (
                empresa_id, estimacion_version_id,
                cost_category, description, amount, is_rechargeable, markup_percent,
                is_auto,
                created_by, updated_by
            ) VALUES (
                v_empresa_id, v_version_id,
                v_item->>'cost_category', v_item->>'description', (v_item->>'amount')::numeric,
                COALESCE((v_item->>'is_rechargeable')::boolean, false), (v_item->>'markup_percent')::numeric,
                COALESCE((v_item->>'is_auto')::boolean, false),
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
$function$;

-- 6. Update core_comercial.atualizar_estimacion_completa to support signer_tax_id and signer_role
CREATE OR REPLACE FUNCTION core_comercial.atualizar_estimacion_completa(p_estimacion_id uuid, p_payload jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_user_id UUID;
    v_empresa_id UUID;
    v_client_id UUID;
    v_lead_id UUID;
    v_client_site_id UUID;
    v_country_id UUID;
    v_estimation_type TEXT;
    v_contact_name TEXT;
    v_contact_email TEXT;
    v_signer_tax_id TEXT;
    v_signer_role TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_validity_date DATE;
    v_payment_terms TEXT;
    v_general_notes TEXT;
    v_postal_code TEXT;
    v_status TEXT;
    v_document_language TEXT;
    v_payment_term_id UUID;
    v_pricing_model TEXT;
    v_fixed_price_notes TEXT;
    
    -- Campos de jornada e receitas
    v_work_lunes BOOLEAN;
    v_work_martes BOOLEAN;
    v_work_miercoles BOOLEAN;
    v_work_jueves BOOLEAN;
    v_work_viernes BOOLEAN;
    v_work_sabado BOOLEAN;
    v_work_domingo BOOLEAN;
    v_hours_weekday NUMERIC(5,2);
    v_hours_sabado NUMERIC(5,2);
    v_hours_domingo NUMERIC(5,2);
    v_additional_revenues JSONB;

    -- Horas individuais
    v_hours_lunes NUMERIC(5,2);
    v_hours_martes NUMERIC(5,2);
    v_hours_miercoles NUMERIC(5,2);
    v_hours_jueves NUMERIC(5,2);
    v_hours_viernes NUMERIC(5,2);

    -- Campos de governança/revisão
    v_review_justification TEXT;
    v_review_requested_at TIMESTAMPTZ;
    v_viability_reasons JSONB;

    v_items JSONB;
    v_item JSONB;
    
    v_version_id UUID;
    v_status_check TEXT;
    v_is_admin BOOLEAN := FALSE;
    v_has_active_order BOOLEAN := FALSE;
    
    -- Totais e cálculos
    v_total_estimated_cost NUMERIC(15,2) := 0;
    v_total_estimated_revenue NUMERIC(15,2) := 0;
    v_margin_percent NUMERIC(5,2) := 0;
BEGIN
    v_user_id := COALESCE(auth.uid(), (NULLIF(current_setting('request.jwt.claim.sub', true), ''))::uuid);
    
    -- 1. Verificar status atual da estimación
    SELECT status, current_version_id, empresa_id INTO v_status_check, v_version_id, v_empresa_id
    FROM core_comercial.estimaciones
    WHERE id = p_estimacion_id;
    
    IF v_status_check IS NULL THEN
        RAISE EXCEPTION 'Estimación não encontrada.';
    END IF;

    v_is_admin := (
        core_common.has_role(v_empresa_id, 'super_admin') OR
        core_common.has_role(v_empresa_id, 'admin')
    );

    SELECT EXISTS (
        SELECT 1 FROM core_comercial.pedidos WHERE source_estimacion_id = p_estimacion_id
    ) INTO v_has_active_order;
    
    IF v_status_check NOT IN ('draft', 'review') AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Apenas estimaciones em status rascunho (draft) ou sob revisão (review) podem ser editadas por vendedores.';
    END IF;
 
    -- 2. Validar permissões
    IF NOT (
        v_is_admin OR 
        core_common.has_role(v_empresa_id, 'commercial') OR 
        core_common.has_role(v_empresa_id, 'operador')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para atualizar estimación na empresa %', v_empresa_id;
    END IF;
 
    -- 3. Extrair payload principal com sanitização contra 'none'
    v_client_id := (NULLIF(NULLIF(p_payload->>'client_id', ''), 'none'))::uuid;
    v_lead_id := (NULLIF(NULLIF(p_payload->>'lead_id', ''), 'none'))::uuid;
    v_client_site_id := (NULLIF(NULLIF(p_payload->>'client_site_id', ''), 'none'))::uuid;
    v_country_id := (NULLIF(NULLIF(p_payload->>'country_id', ''), 'none'))::uuid;
    v_estimation_type := COALESCE(NULLIF(p_payload->>'estimation_type', ''), 'new_allocation');
    v_contact_name := NULLIF(p_payload->>'contact_name', '');
    v_contact_email := NULLIF(p_payload->>'contact_email', '');
    v_signer_tax_id := NULLIF(p_payload->>'signer_tax_id', '');
    v_signer_role := NULLIF(p_payload->>'signer_role', '');
    v_start_date := (NULLIF(p_payload->>'expected_start_date', ''))::date;
    v_end_date := (NULLIF(p_payload->>'expected_end_date', ''))::date;
    v_validity_date := (NULLIF(p_payload->>'validity_date', ''))::date;
    v_payment_terms := p_payload->>'payment_terms';
    v_general_notes := p_payload->>'general_notes';
    v_postal_code := p_payload->>'postal_code';
    v_status := COALESCE(NULLIF(p_payload->>'status', ''), 'draft');
    IF v_has_active_order OR v_status_check = 'approved' THEN
        v_status := 'approved';
    END IF;
    v_document_language := COALESCE(NULLIF(p_payload->>'document_language', ''), 'pt');
    v_pricing_model := COALESCE(NULLIF(p_payload->>'pricing_model', ''), 'hourly');
    v_fixed_price_notes := NULLIF(p_payload->>'fixed_price_notes', '');
    v_payment_term_id := (NULLIF(NULLIF(p_payload->>'payment_term_id', ''), 'none'))::uuid;
    IF v_payment_term_id IS NOT NULL THEN
        SELECT name INTO v_payment_terms FROM core_common.payment_terms WHERE id = v_payment_term_id;
    END IF;
    
    -- Governança
    v_review_justification := p_payload->>'review_justification';
    IF p_payload->>'review_requested_at' IS NOT NULL THEN
        v_review_requested_at := (p_payload->>'review_requested_at')::timestamptz;
    ELSIF v_status = 'review' THEN
        v_review_requested_at := NOW();
    ELSE
        v_review_requested_at := NULL;
    END IF;
    v_viability_reasons := p_payload->'viability_reasons';

    -- Extrair campos de jornada
    v_work_lunes := COALESCE((p_payload->>'work_lunes')::boolean, true);
    v_work_martes := COALESCE((p_payload->>'work_martes')::boolean, true);
    v_work_miercoles := COALESCE((p_payload->>'work_miercoles')::boolean, true);
    v_work_jueves := COALESCE((p_payload->>'work_jueves')::boolean, true);
    v_work_viernes := COALESCE((p_payload->>'work_viernes')::boolean, true);
    v_work_sabado := COALESCE((p_payload->>'work_sabado')::boolean, false);
    v_work_domingo := COALESCE((p_payload->>'work_domingo')::boolean, false);
    v_hours_weekday := COALESCE((p_payload->>'hours_weekday')::numeric, 8.0);
    v_hours_sabado := COALESCE((p_payload->>'hours_sabado')::numeric, 0.0);
    v_hours_domingo := COALESCE((p_payload->>'hours_domingo')::numeric, 0.0);
    v_additional_revenues := COALESCE(p_payload->'additional_revenues', '[]'::jsonb);

    v_hours_lunes := COALESCE((p_payload->>'hours_lunes')::numeric, v_hours_weekday);
    v_hours_martes := COALESCE((p_payload->>'hours_martes')::numeric, v_hours_weekday);
    v_hours_miercoles := COALESCE((p_payload->>'hours_miercoles')::numeric, v_hours_weekday);
    v_hours_jueves := COALESCE((p_payload->>'hours_jueves')::numeric, v_hours_weekday);
    v_hours_viernes := COALESCE((p_payload->>'hours_viernes')::numeric, v_hours_weekday);

    v_items := p_payload->'items';
 
    IF v_client_id IS NULL AND v_lead_id IS NULL THEN
        RAISE EXCEPTION 'Deve informar ou um client_id ou um lead_id.';
    END IF;
 
    -- 4. Validar array de itens
    IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
        RAISE EXCEPTION 'A estimación deve conter pelo menos 1 item.';
    END IF;
 
    v_total_estimated_cost := COALESCE((p_payload->>'total_estimated_cost')::numeric, 0);
    v_total_estimated_revenue := COALESCE((p_payload->>'total_estimated_revenue')::numeric, 0);
    v_margin_percent := COALESCE((p_payload->>'estimated_margin_percent')::numeric, 0);

    -- 5. Atualizar Estimación
    UPDATE core_comercial.estimaciones
    SET 
        client_id = v_client_id,
        commercial_owner_id = COALESCE((NULLIF(NULLIF(p_payload->>'commercial_owner_id', ''), 'none'))::uuid, commercial_owner_id, v_user_id),
        created_by = COALESCE(created_by, (NULLIF(NULLIF(p_payload->>'commercial_owner_id', ''), 'none'))::uuid, v_user_id),
        lead_id = v_lead_id,
        client_site_id = v_client_site_id,
        country_id = v_country_id,
        estimation_type = v_estimation_type,
        pricing_model = v_pricing_model,
        fixed_price_notes = v_fixed_price_notes,
        contact_name = v_contact_name,
        contact_email = v_contact_email,
        signer_tax_id = COALESCE(v_signer_tax_id, signer_tax_id),
        signer_role = COALESCE(v_signer_role, signer_role),
        expected_start_date = v_start_date,
        expected_end_date = v_end_date,
        validity_date = v_validity_date,
        payment_terms = v_payment_terms,
        payment_term_id = v_payment_term_id,
        general_notes = v_general_notes,
        postal_code = v_postal_code,
        status = v_status,
        document_language = v_document_language,
        work_lunes = v_work_lunes,
        work_martes = v_work_martes,
        work_miercoles = v_work_miercoles,
        work_jueves = v_work_jueves,
        work_viernes = v_work_viernes,
        work_sabado = v_work_sabado,
        work_domingo = v_work_domingo,
        hours_weekday = v_hours_weekday,
        hours_sabado = v_hours_sabado,
        hours_domingo = v_hours_domingo,
        additional_revenues = v_additional_revenues,
        hours_lunes = v_hours_lunes,
        hours_martes = v_hours_martes,
        hours_miercoles = v_hours_miercoles,
        hours_jueves = v_hours_jueves,
        hours_viernes = v_hours_viernes,
        review_justification = COALESCE(v_review_justification, review_justification),
        review_requested_at = COALESCE(v_review_requested_at, review_requested_at),
        viability_reasons = COALESCE(v_viability_reasons, viability_reasons),
        is_approved_by_manager = CASE WHEN v_has_active_order THEN is_approved_by_manager ELSE FALSE END,
        total_estimated_cost = v_total_estimated_cost,
        total_estimated_revenue = v_total_estimated_revenue,
        estimated_margin_percent = v_margin_percent,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = p_estimacion_id;

    -- Sync legal representative to client if provided
    IF v_client_id IS NOT NULL AND (v_contact_name IS NOT NULL OR v_signer_tax_id IS NOT NULL) THEN
        UPDATE core_common.clients
        SET
            legal_rep_name = COALESCE(v_contact_name, legal_rep_name),
            legal_rep_tax_id = COALESCE(v_signer_tax_id, legal_rep_tax_id),
            legal_rep_role = COALESCE(v_signer_role, legal_rep_role)
        WHERE id = v_client_id;
    END IF;
 
    -- 6. Garantir que a versão existe
    IF v_version_id IS NULL THEN
        INSERT INTO core_comercial.estimacion_versions (
            empresa_id, estimacion_id, version_number, status,
            notes, created_by
        ) VALUES (
            v_empresa_id, p_estimacion_id, 1, 'active',
            'Versão inicial criada automaticamente no update', v_user_id
        )
        RETURNING id INTO v_version_id;
        
        UPDATE core_comercial.estimaciones
        SET current_version_id = v_version_id
        WHERE id = p_estimacion_id;
    END IF;
 
    -- 7. Limpar itens e custos antigos da versão atual
    DELETE FROM core_comercial.estimacion_items
    WHERE estimacion_version_id = v_version_id;
 
    DELETE FROM core_comercial.estimacion_costs
    WHERE estimacion_version_id = v_version_id;
 
    -- 8. Loop de Inserção de Itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
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
            ss_regime, custom_lodging_rate, custom_epi_rate, custom_transport_rate,
            created_by, updated_by
        ) VALUES (
            v_empresa_id, p_estimacion_id, v_version_id, (NULLIF(NULLIF(v_item->>'job_function_id', ''), 'none'))::uuid,
            (v_item->>'quantity')::int, 
            (v_item->>'planned_hours_per_day')::numeric, 
            (v_item->>'planned_days_per_week')::numeric, 
            COALESCE((v_item->>'planned_total_hours')::numeric, (v_item->>'total_hours')::numeric, 0),
            COALESCE((v_item->>'includes_housing')::boolean, (v_item->>'includes_accommodation')::boolean, false), 
            COALESCE((v_item->>'includes_transport')::boolean, false), 
            COALESCE((v_item->>'includes_epi')::boolean, (v_item->>'includes_ppe')::boolean, false),
            (v_item->>'base_cost_hour')::numeric, 
            COALESCE((v_item->>'recommended_sell_rate_hour')::numeric, (v_item->>'recommended_sell_rate')::numeric), 
            COALESCE((v_item->>'minimum_sell_rate_hour')::numeric, (v_item->>'minimum_sell_rate')::numeric), 
            (v_item->>'sell_rate_hour')::numeric,
            (v_item->>'margin_percent')::numeric, 
            COALESCE(v_item->>'risk_level_snapshot', v_item->>'risk_level'), 
            COALESCE(v_item->>'description', v_item->>'notes'),
            COALESCE(v_item->>'ss_regime', 'local'), 
            (v_item->>'custom_lodging_rate')::numeric,
            (v_item->>'custom_epi_rate')::numeric, 
            (v_item->>'custom_transport_rate')::numeric,
            v_user_id, v_user_id
        );
    END LOOP;
 
    -- Atualizar totais na Versão
    UPDATE core_comercial.estimacion_versions
    SET 
        total_cost = v_total_estimated_cost,
        total_revenue = v_total_estimated_revenue,
        margin_percent = v_margin_percent
    WHERE id = v_version_id;
 
    -- 9. Custos adicionais
    IF p_payload->'costs' IS NOT NULL AND jsonb_array_length(p_payload->'costs') > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'costs')
        LOOP
            INSERT INTO core_comercial.estimacion_costs (
                empresa_id, estimacion_version_id,
                cost_category, description, amount, is_rechargeable, markup_percent,
                is_auto,
                created_by, updated_by
            ) VALUES (
                v_empresa_id, v_version_id,
                v_item->>'cost_category', v_item->>'description', (v_item->>'amount')::numeric,
                COALESCE((v_item->>'is_rechargeable')::boolean, false), (v_item->>'markup_percent')::numeric,
                COALESCE((v_item->>'is_auto')::boolean, false),
                v_user_id, v_user_id
            );
        END LOOP;
    END IF;
 
    -- 10. Retorno
    RETURN json_build_object(
        'status', 'success',
        'estimacion_id', p_estimacion_id,
        'version_id', v_version_id,
        'total_cost', v_total_estimated_cost,
        'total_revenue', v_total_estimated_revenue,
        'margin_percent', v_margin_percent
    );
END;
$function$;

-- 7. Secure Public RPCs for Fiscal & Legal Representative Data Collection
-- Supports p_id being a lead_id, client_id, or estimacion_id
CREATE OR REPLACE FUNCTION core_comercial.public_get_fiscal_data_target(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_lead RECORD;
    v_client RECORD;
    v_est RECORD;
    v_result jsonb;
BEGIN
    -- 1. Check if p_id is an estimacion_id
    SELECT id, client_id, lead_id, contact_name, contact_email, signer_tax_id, signer_role, document_language
    INTO v_est
    FROM core_comercial.estimaciones
    WHERE id = p_id;

    IF v_est.id IS NOT NULL THEN
        IF v_est.client_id IS NOT NULL THEN
            SELECT * INTO v_client FROM core_common.clients WHERE id = v_est.client_id;
            RETURN jsonb_build_object(
                'target_type', 'estimacion_client',
                'estimacion_id', v_est.id,
                'client_id', v_client.id,
                'lead_id', v_est.lead_id,
                'company_name', COALESCE(v_client.trade_name, v_client.legal_name),
                'legal_name', COALESCE(v_client.legal_name, v_client.trade_name),
                'tax_id', v_client.tax_id,
                'address_line', v_client.address_line,
                'postal_code', v_client.postal_code,
                'city', v_client.city,
                'province', v_client.province,
                'country_id', v_client.country_id,
                'region_id', v_client.region_id,
                'billing_email', COALESCE(v_client.billing_email, v_client.email, v_est.contact_email),
                'phone', v_client.phone,
                'legal_rep_name', COALESCE(v_client.legal_rep_name, CASE WHEN v_est.contact_name IS DISTINCT FROM v_client.trade_name AND v_est.contact_name IS DISTINCT FROM v_client.legal_name THEN v_est.contact_name ELSE NULL END),
                'legal_rep_tax_id', COALESCE(v_client.legal_rep_tax_id, v_est.signer_tax_id),
                'legal_rep_role', COALESCE(v_client.legal_rep_role, v_est.signer_role),
                'document_language', v_est.document_language
            );
        ELSIF v_est.lead_id IS NOT NULL THEN
            SELECT * INTO v_lead FROM core_comercial.leads WHERE id = v_est.lead_id;
            RETURN jsonb_build_object(
                'target_type', 'estimacion_lead',
                'estimacion_id', v_est.id,
                'client_id', v_lead.client_id,
                'lead_id', v_lead.id,
                'company_name', COALESCE(v_lead.company_name, v_lead.name),
                'legal_name', COALESCE(v_lead.legal_name, v_lead.company_name),
                'tax_id', v_lead.tax_id,
                'address_line', v_lead.address_line,
                'postal_code', v_lead.postal_code,
                'city', v_lead.city,
                'province', v_lead.province,
                'country_id', v_lead.country_id,
                'region_id', v_lead.region_id,
                'billing_email', COALESCE(v_lead.billing_email, v_lead.email, v_est.contact_email),
                'phone', v_lead.phone,
                'legal_rep_name', COALESCE(v_lead.legal_rep_name, CASE WHEN v_est.contact_name IS DISTINCT FROM v_lead.company_name THEN v_est.contact_name ELSE v_lead.name END),
                'legal_rep_tax_id', COALESCE(v_lead.legal_rep_tax_id, v_est.signer_tax_id),
                'legal_rep_role', COALESCE(v_lead.legal_rep_role, v_est.signer_role, v_lead.cargo),
                'document_language', v_est.document_language
            );
        END IF;
    END IF;

    -- 2. Check if p_id is a lead_id
    SELECT * INTO v_lead FROM core_comercial.leads WHERE id = p_id;
    IF v_lead.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'target_type', 'lead',
            'estimacion_id', NULL,
            'client_id', v_lead.client_id,
            'lead_id', v_lead.id,
            'company_name', COALESCE(v_lead.company_name, v_lead.name),
            'legal_name', COALESCE(v_lead.legal_name, v_lead.company_name),
            'tax_id', v_lead.tax_id,
            'address_line', v_lead.address_line,
            'postal_code', v_lead.postal_code,
            'city', v_lead.city,
            'province', v_lead.province,
            'country_id', v_lead.country_id,
            'region_id', v_lead.region_id,
            'billing_email', COALESCE(v_lead.billing_email, v_lead.email),
            'phone', v_lead.phone,
            'legal_rep_name', COALESCE(v_lead.legal_rep_name, CASE WHEN v_lead.name IS DISTINCT FROM v_lead.company_name THEN v_lead.name ELSE NULL END),
            'legal_rep_tax_id', v_lead.legal_rep_tax_id,
            'legal_rep_role', COALESCE(v_lead.legal_rep_role, v_lead.cargo),
            'document_language', NULL
        );
    END IF;

    -- 3. Check if p_id is a client_id
    SELECT * INTO v_client FROM core_common.clients WHERE id = p_id;
    IF v_client.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'target_type', 'client',
            'estimacion_id', NULL,
            'client_id', v_client.id,
            'lead_id', NULL,
            'company_name', COALESCE(v_client.trade_name, v_client.legal_name),
            'legal_name', COALESCE(v_client.legal_name, v_client.trade_name),
            'tax_id', v_client.tax_id,
            'address_line', v_client.address_line,
            'postal_code', v_client.postal_code,
            'city', v_client.city,
            'province', v_client.province,
            'country_id', v_client.country_id,
            'region_id', v_client.region_id,
            'billing_email', COALESCE(v_client.billing_email, v_client.email),
            'phone', v_client.phone,
            'legal_rep_name', v_client.legal_rep_name,
            'legal_rep_tax_id', v_client.legal_rep_tax_id,
            'legal_rep_role', v_client.legal_rep_role,
            'document_language', NULL
        );
    END IF;

    RETURN NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION core_comercial.public_get_fiscal_data_target(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION core_comercial.public_submit_fiscal_data(p_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_est RECORD;
    v_lead_id UUID;
    v_client_id UUID;
    v_legal_name TEXT := NULLIF(TRIM(p_payload->>'legal_name'), '');
    v_tax_id TEXT := NULLIF(UPPER(TRIM(p_payload->>'tax_id')), '');
    v_address_line TEXT := NULLIF(TRIM(p_payload->>'address_line'), '');
    v_postal_code TEXT := NULLIF(TRIM(p_payload->>'postal_code'), '');
    v_city TEXT := NULLIF(TRIM(p_payload->>'city'), '');
    v_province TEXT := NULLIF(TRIM(p_payload->>'province'), '');
    v_country_id UUID := (NULLIF(NULLIF(p_payload->>'country_id', ''), 'none'))::uuid;
    v_region_id UUID := (NULLIF(NULLIF(p_payload->>'region_id', ''), 'none'))::uuid;
    v_billing_email TEXT := NULLIF(TRIM(p_payload->>'billing_email'), '');
    v_phone TEXT := NULLIF(TRIM(p_payload->>'phone'), '');
    v_legal_rep_name TEXT := NULLIF(TRIM(p_payload->>'legal_rep_name'), '');
    v_legal_rep_tax_id TEXT := NULLIF(UPPER(TRIM(p_payload->>'legal_rep_tax_id')), '');
    v_legal_rep_role TEXT := COALESCE(NULLIF(TRIM(p_payload->>'legal_rep_role'), ''), 'Representante Legal');
    v_existing_contact_id UUID;
BEGIN
    -- 1. Resolve target IDs
    SELECT id, client_id, lead_id INTO v_est FROM core_comercial.estimaciones WHERE id = p_id;
    IF v_est.id IS NOT NULL THEN
        v_client_id := v_est.client_id;
        v_lead_id := v_est.lead_id;
    ELSE
        SELECT id, client_id INTO v_lead_id, v_client_id FROM core_comercial.leads WHERE id = p_id;
        IF v_lead_id IS NULL THEN
            SELECT id INTO v_client_id FROM core_common.clients WHERE id = p_id;
        END IF;
    END IF;

    IF v_est.id IS NULL AND v_lead_id IS NULL AND v_client_id IS NULL THEN
        RAISE EXCEPTION 'Registro não encontrado.';
    END IF;

    -- 2. Update Lead if applicable
    IF v_lead_id IS NOT NULL THEN
        UPDATE core_comercial.leads
        SET
            legal_name = COALESCE(v_legal_name, legal_name),
            tax_id = COALESCE(v_tax_id, tax_id),
            address_line = COALESCE(v_address_line, address_line),
            postal_code = COALESCE(v_postal_code, postal_code),
            city = COALESCE(v_city, city),
            province = COALESCE(v_province, province),
            country_id = COALESCE(v_country_id, country_id),
            region_id = COALESCE(v_region_id, region_id),
            billing_email = COALESCE(v_billing_email, billing_email),
            phone = COALESCE(v_phone, phone),
            legal_rep_name = COALESCE(v_legal_rep_name, legal_rep_name),
            legal_rep_tax_id = COALESCE(v_legal_rep_tax_id, legal_rep_tax_id),
            legal_rep_role = COALESCE(v_legal_rep_role, legal_rep_role),
            updated_at = NOW()
        WHERE id = v_lead_id;
    END IF;

    -- 3. Update Client if applicable
    IF v_client_id IS NOT NULL THEN
        UPDATE core_common.clients
        SET
            legal_name = COALESCE(v_legal_name, legal_name),
            tax_id = COALESCE(v_tax_id, tax_id),
            address_line = COALESCE(v_address_line, address_line),
            postal_code = COALESCE(v_postal_code, postal_code),
            city = COALESCE(v_city, city),
            province = COALESCE(v_province, province),
            country_id = COALESCE(v_country_id, country_id),
            region_id = COALESCE(v_region_id, region_id),
            billing_email = COALESCE(v_billing_email, billing_email),
            phone = COALESCE(v_phone, phone),
            legal_rep_name = COALESCE(v_legal_rep_name, legal_rep_name),
            legal_rep_tax_id = COALESCE(v_legal_rep_tax_id, legal_rep_tax_id),
            legal_rep_role = COALESCE(v_legal_rep_role, legal_rep_role),
            updated_at = NOW()
        WHERE id = v_client_id;

        -- Also upsert into core_common.client_contacts if legal_rep_name is provided
        IF v_legal_rep_name IS NOT NULL THEN
            SELECT id INTO v_existing_contact_id
            FROM core_common.client_contacts
            WHERE client_id = v_client_id
              AND (is_legal_representative = TRUE OR LOWER(name) = LOWER(v_legal_rep_name))
            ORDER BY is_legal_representative DESC, created_at DESC
            LIMIT 1;

            IF v_existing_contact_id IS NOT NULL THEN
                UPDATE core_common.client_contacts
                SET
                    name = v_legal_rep_name,
                    tax_id = COALESCE(v_legal_rep_tax_id, tax_id),
                    role = COALESCE(v_legal_rep_role, role),
                    email = COALESCE(v_billing_email, email),
                    phone = COALESCE(v_phone, phone),
                    is_legal_representative = TRUE,
                    updated_at = NOW()
                WHERE id = v_existing_contact_id;
            ELSE
                INSERT INTO core_common.client_contacts (
                    client_id, name, role, tax_id, email, phone, is_legal_representative
                ) VALUES (
                    v_client_id, v_legal_rep_name, v_legal_rep_role, v_legal_rep_tax_id, v_billing_email, v_phone, TRUE
                );
            END IF;
        END IF;
    END IF;

    -- 4. Update Estimaciones linked to this id / client / lead
    IF v_est.id IS NOT NULL THEN
        UPDATE core_comercial.estimaciones
        SET
            contact_name = COALESCE(v_legal_rep_name, contact_name),
            signer_tax_id = COALESCE(v_legal_rep_tax_id, signer_tax_id),
            signer_role = COALESCE(v_legal_rep_role, signer_role),
            postal_code = COALESCE(v_postal_code, postal_code),
            country_id = COALESCE(v_country_id, country_id),
            updated_at = NOW()
        WHERE id = v_est.id;
    ELSIF v_client_id IS NOT NULL OR v_lead_id IS NOT NULL THEN
        UPDATE core_comercial.estimaciones
        SET
            contact_name = COALESCE(v_legal_rep_name, contact_name),
            signer_tax_id = COALESCE(v_legal_rep_tax_id, signer_tax_id),
            signer_role = COALESCE(v_legal_rep_role, signer_role),
            updated_at = NOW()
        WHERE (v_client_id IS NOT NULL AND client_id = v_client_id AND status IN ('draft', 'review', 'sent', 'approved'))
           OR (v_lead_id IS NOT NULL AND lead_id = v_lead_id AND status IN ('draft', 'review', 'sent', 'approved'));
    END IF;

    RETURN jsonb_build_object(
        'status', 'success',
        'estimacion_id', v_est.id,
        'client_id', v_client_id,
        'lead_id', v_lead_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION core_comercial.public_submit_fiscal_data(uuid, jsonb) TO anon, authenticated;
