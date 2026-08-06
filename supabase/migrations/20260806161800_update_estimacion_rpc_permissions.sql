-- Migration: Update estimacion RPC permissions to allow admin, commercial, and operador roles

CREATE OR REPLACE FUNCTION core_comercial.criar_estimacion_completa(p_payload jsonb)
RETURNS json
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
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
    v_start_date DATE;
    v_end_date DATE;
    v_validity_date DATE;
    v_payment_terms TEXT;
    v_general_notes TEXT;
    v_postal_code TEXT;
    v_status TEXT;
    v_document_language TEXT;
    v_payment_term_id UUID;
    
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

    -- Novas colunas de horas individuais
    v_hours_lunes NUMERIC(5,2);
    v_hours_martes NUMERIC(5,2);
    v_hours_miercoles NUMERIC(5,2);
    v_hours_jueves NUMERIC(5,2);
    v_hours_viernes NUMERIC(5,2);

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
    v_empresa_id := (p_payload->>'empresa_id')::uuid;
    v_client_id := (p_payload->>'client_id')::uuid;
    v_lead_id := (p_payload->>'lead_id')::uuid;
    v_client_site_id := (p_payload->>'client_site_id')::uuid;
    v_country_id := (p_payload->>'country_id')::uuid;
    v_estimation_type := COALESCE(p_payload->>'estimation_type', 'new_allocation');
    v_contact_name := p_payload->>'contact_name';
    v_contact_email := p_payload->>'contact_email';
    v_start_date := (p_payload->>'expected_start_date')::date;
    v_end_date := (p_payload->>'expected_end_date')::date;
    v_validity_date := (p_payload->>'validity_date')::date;
    v_payment_terms := p_payload->>'payment_terms';
    v_general_notes := p_payload->>'general_notes';
    v_postal_code := p_payload->>'postal_code';
    v_status := COALESCE(p_payload->>'status', 'draft');
    v_document_language := COALESCE(p_payload->>'document_language', 'pt');
    v_payment_term_id := (p_payload->>'payment_term_id')::uuid;
    IF v_payment_term_id IS NOT NULL THEN
        SELECT name INTO v_payment_terms FROM core_common.payment_terms WHERE id = v_payment_term_id;
    END IF;
    
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

    -- Extrair horas individuais, caindo de volta para v_hours_weekday caso não definidas individualmente
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
        estimation_type, contact_name, contact_email,
        expected_start_date, expected_end_date, validity_date, payment_terms, payment_term_id, status,
        general_notes, postal_code, document_language,
        work_lunes, work_martes, work_miercoles, work_jueves, work_viernes, work_sabado, work_domingo,
        hours_weekday, hours_sabado, hours_domingo, additional_revenues,
        hours_lunes, hours_martes, hours_miercoles, hours_jueves, hours_viernes,
        created_by, updated_by
    ) VALUES (
        v_empresa_id, v_codigo, v_client_id, v_lead_id, v_client_site_id, v_country_id,
        v_estimation_type, v_contact_name, v_contact_email,
        v_start_date, v_end_date, v_validity_date, v_payment_terms, v_payment_term_id, v_status,
        v_general_notes, v_postal_code, v_document_language,
        v_work_lunes, v_work_martes, v_work_miercoles, v_work_jueves, v_work_viernes, v_work_sabado, v_work_domingo,
        v_hours_weekday, v_hours_sabado, v_hours_domingo, v_additional_revenues,
        v_hours_lunes, v_hours_martes, v_hours_miercoles, v_hours_jueves, v_hours_viernes,
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
            v_empresa_id, v_estimacion_id, v_version_id, (v_item->>'job_function_id')::uuid,
            (v_item->>'quantity')::int, (v_item->>'planned_hours_per_day')::numeric, 
            (v_item->>'planned_days_per_week')::numeric, (v_item->>'total_hours')::numeric,
            COALESCE((v_item->>'includes_accommodation')::boolean, false), COALESCE((v_item->>'includes_transport')::boolean, false), 
            COALESCE((v_item->>'includes_ppe')::boolean, false),
            (v_item->>'base_cost_hour')::numeric, (v_item->>'recommended_sell_rate')::numeric, 
            (v_item->>'minimum_sell_rate')::numeric, (v_item->>'sell_rate_hour')::numeric,
            (v_item->>'margin_percent')::numeric, v_item->>'risk_level', v_item->>'notes',
            COALESCE(v_item->>'ss_regime', 'local'), (v_item->>'custom_lodging_rate')::numeric,
            (v_item->>'custom_epi_rate')::numeric, (v_item->>'custom_transport_rate')::numeric,
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
$$;

CREATE OR REPLACE FUNCTION core_comercial.atualizar_estimacion_completa(p_estimacion_id uuid, p_payload jsonb)
RETURNS json
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
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
    v_start_date DATE;
    v_end_date DATE;
    v_validity_date DATE;
    v_payment_terms TEXT;
    v_general_notes TEXT;
    v_postal_code TEXT;
    v_status TEXT;
    v_document_language TEXT;
    v_payment_term_id UUID;
    
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

    -- Novas colunas de horas individuais
    v_hours_lunes NUMERIC(5,2);
    v_hours_martes NUMERIC(5,2);
    v_hours_miercoles NUMERIC(5,2);
    v_hours_jueves NUMERIC(5,2);
    v_hours_viernes NUMERIC(5,2);

    v_items JSONB;
    v_item JSONB;
    
    v_version_id UUID;
    v_status_check TEXT;
    
    -- Totais e cálculos
    v_total_estimated_cost NUMERIC(15,2) := 0;
    v_total_estimated_revenue NUMERIC(15,2) := 0;
    v_margin_percent NUMERIC(5,2) := 0;
BEGIN
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;
    
    -- 1. Verificar status atual da estimación
    SELECT status, current_version_id, empresa_id INTO v_status_check, v_version_id, v_empresa_id
    FROM core_comercial.estimaciones
    WHERE id = p_estimacion_id;
    
    IF v_status_check IS NULL THEN
        RAISE EXCEPTION 'Estimación não encontrada.';
    END IF;
    
    IF v_status_check <> 'draft' THEN
        RAISE EXCEPTION 'Apenas estimaciones em status rascunho (draft) podem ser editadas.';
    END IF;
 
    -- 2. Validar permissões (super_admin ou operador)
    IF NOT (
        core_common.has_role(v_empresa_id, 'admin') OR 
        core_common.has_role(v_empresa_id, 'commercial') OR 
        core_common.has_role(v_empresa_id, 'operador')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para atualizar estimación na empresa %', v_empresa_id;
    END IF;
 
    -- 3. Extrair payload principal
    v_client_id := (p_payload->>'client_id')::uuid;
    v_lead_id := (p_payload->>'lead_id')::uuid;
    v_client_site_id := (p_payload->>'client_site_id')::uuid;
    v_country_id := (p_payload->>'country_id')::uuid;
    v_estimation_type := COALESCE(p_payload->>'estimation_type', 'new_allocation');
    v_contact_name := p_payload->>'contact_name';
    v_contact_email := p_payload->>'contact_email';
    v_start_date := (p_payload->>'expected_start_date')::date;
    v_end_date := (p_payload->>'expected_end_date')::date;
    v_validity_date := (p_payload->>'validity_date')::date;
    v_payment_terms := p_payload->>'payment_terms';
    v_general_notes := p_payload->>'general_notes';
    v_postal_code := p_payload->>'postal_code';
    v_status := COALESCE(p_payload->>'status', 'draft');
    v_document_language := COALESCE(p_payload->>'document_language', 'pt');
    v_payment_term_id := (p_payload->>'payment_term_id')::uuid;
    IF v_payment_term_id IS NOT NULL THEN
        SELECT name INTO v_payment_terms FROM core_common.payment_terms WHERE id = v_payment_term_id;
    END IF;
    
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

    -- Extrair horas individuais, caindo de volta para v_hours_weekday caso não definidas individualmente
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
 
    -- 5. Atualizar Estimación
    UPDATE core_comercial.estimaciones
    SET 
        client_id = v_client_id,
        lead_id = v_lead_id,
        client_site_id = v_client_site_id,
        country_id = v_country_id,
        estimation_type = v_estimation_type,
        contact_name = v_contact_name,
        contact_email = v_contact_email,
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
        is_approved_by_manager = FALSE, -- reseta aprovação do gerente ao editar
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = p_estimacion_id;
 
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
 
    -- 8. Loop de Inserção de Itens e Somatório
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        -- Validações de item
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
            v_empresa_id, p_estimacion_id, v_version_id, (v_item->>'job_function_id')::uuid,
            (v_item->>'quantity')::int, (v_item->>'planned_hours_per_day')::numeric, 
            (v_item->>'planned_days_per_week')::numeric, (v_item->>'total_hours')::numeric,
            COALESCE((v_item->>'includes_accommodation')::boolean, false), COALESCE((v_item->>'includes_transport')::boolean, false), 
            COALESCE((v_item->>'includes_ppe')::boolean, false),
            (v_item->>'base_cost_hour')::numeric, (v_item->>'recommended_sell_rate')::numeric, 
            (v_item->>'minimum_sell_rate')::numeric, (v_item->>'sell_rate_hour')::numeric,
            (v_item->>'margin_percent')::numeric, v_item->>'risk_level', v_item->>'notes',
            COALESCE(v_item->>'ss_regime', 'local'), (v_item->>'custom_lodging_rate')::numeric,
            (v_item->>'custom_epi_rate')::numeric, (v_item->>'custom_transport_rate')::numeric,
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
$$;

CREATE OR REPLACE FUNCTION core_comercial.criar_nova_versao_estimacion(p_estimacion_id uuid, p_notes text)
RETURNS json
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_empresa_id UUID;
    v_current_version_id UUID;
    v_max_version_number INT;
    v_new_version_id UUID;
    v_total_cost NUMERIC(15,2);
    v_total_revenue NUMERIC(15,2);
    v_margin_percent NUMERIC(5,2);
    v_status_check TEXT;
    
    -- Novos campos de contrato customizado
    v_custom_contract_url TEXT;
    v_custom_contract_uploaded_at TIMESTAMP WITH TIME ZONE;
    v_custom_contract_uploaded_by UUID;
    
    -- Para loops de duplicação
    v_item RECORD;
    v_cost RECORD;
BEGIN
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;
    
    -- 1. Obter dados da estimación atual
    SELECT current_version_id, status, empresa_id, custom_contract_url, custom_contract_uploaded_at, custom_contract_uploaded_by
    INTO v_current_version_id, v_status_check, v_empresa_id, v_custom_contract_url, v_custom_contract_uploaded_at, v_custom_contract_uploaded_by
    FROM core_comercial.estimaciones
    WHERE id = p_estimacion_id;
    
    IF v_status_check IS NULL THEN
        RAISE EXCEPTION 'Estimación não encontrada.';
    END IF;
    
    -- O versionamento pode ser feito a partir de estimativas já enviadas ou recusadas, mas não em rascunho (draft)
    IF v_status_check = 'draft' THEN
        RAISE EXCEPTION 'O orçamento já está em status rascunho (draft) e pode ser editado diretamente.';
    END IF;
    
    -- 2. Validar permissões (super_admin ou operador)
    IF NOT (
        core_common.has_role(v_empresa_id, 'admin') OR 
        core_common.has_role(v_empresa_id, 'commercial') OR 
        core_common.has_role(v_empresa_id, 'operador')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para versionar estimación na empresa %', v_empresa_id;
    END IF;
    
    -- 3. Obter o maior número de versão existente
    SELECT COALESCE(MAX(version_number), 0) INTO v_max_version_number
    FROM core_comercial.estimacion_versions
    WHERE estimacion_id = p_estimacion_id;
    
    -- 4. Obter totais da versão atual
    SELECT total_cost, total_revenue, margin_percent INTO v_total_cost, v_total_revenue, v_margin_percent
    FROM core_comercial.estimacion_versions
    WHERE id = v_current_version_id;
    
    -- 5. Arquivar versão atual
    UPDATE core_comercial.estimacion_versions
    SET status = 'archived'
    WHERE id = v_current_version_id;
    
    -- 6. Inserir nova versão (version_number = v_max_version_number + 1)
    INSERT INTO core_comercial.estimacion_versions (
        empresa_id, estimacion_id, version_number, status,
        notes, total_cost, total_revenue, margin_percent,
        created_by
    ) VALUES (
        v_empresa_id, p_estimacion_id, v_max_version_number + 1, 'active',
        COALESCE(p_notes, 'Nova versão criada a partir da versão ' || v_max_version_number::text),
        COALESCE(v_total_cost, 0), COALESCE(v_total_revenue, 0), COALESCE(v_margin_percent, 0),
        v_user_id
    )
    RETURNING id INTO v_new_version_id;
    
    -- 7. Duplicar os itens da versão anterior para a nova versão
    FOR v_item IN (
        SELECT * FROM core_comercial.estimacion_items 
        WHERE estimacion_version_id = v_current_version_id
    ) LOOP
        INSERT INTO core_comercial.estimacion_items (
            empresa_id, estimacion_id, estimacion_version_id, job_function_id,
            quantity, planned_hours_per_day, planned_days_per_week, planned_total_hours,
            includes_housing, includes_transport, includes_epi,
            base_cost_hour, recommended_sell_rate_hour, minimum_sell_rate_hour, sell_rate_hour,
            margin_percent, risk_level_snapshot, description,
            ss_regime, custom_lodging_rate, custom_epi_rate, custom_transport_rate,
            created_by, updated_by
        ) VALUES (
            v_empresa_id, p_estimacion_id, v_new_version_id, v_item.job_function_id,
            v_item.quantity, v_item.planned_hours_per_day, v_item.planned_days_per_week, v_item.planned_total_hours,
            v_item.includes_housing, v_item.includes_transport, v_item.includes_epi,
            v_item.base_cost_hour, v_item.recommended_sell_rate_hour, v_item.minimum_sell_rate_hour, v_item.sell_rate_hour,
            v_item.margin_percent, v_item.risk_level_snapshot, v_item.description,
            v_item.ss_regime, v_item.custom_lodging_rate, v_item.custom_epi_rate, v_item.custom_transport_rate,
            v_user_id, v_user_id
        );
    END LOOP;
    
    -- 8. Duplicar os custos adicionais da versão anterior para a nova versão
    FOR v_cost IN (
        SELECT * FROM core_comercial.estimacion_costs 
        WHERE estimacion_version_id = v_current_version_id
    ) LOOP
        INSERT INTO core_comercial.estimacion_costs (
            empresa_id, estimacion_version_id, cost_category, description,
            amount, is_rechargeable, markup_percent, is_auto,
            created_by, updated_by
        ) VALUES (
            v_empresa_id, v_new_version_id, v_cost.cost_category, v_cost.description,
            v_cost.amount, v_cost.is_rechargeable, v_cost.markup_percent, v_cost.is_auto,
            v_user_id, v_user_id
        );
    END LOOP;
    
    -- 9. Marcar links de assinatura pendente anteriores como expiráveis/expirados
    UPDATE core_comercial.proposal_signatures
    SET status = 'expired', updated_at = NOW()
    WHERE estimacion_id = p_estimacion_id 
      AND status = 'pending_signature';
      
    -- 10. Atualizar o orçamento com a ID da nova versão, resetando a aprovação do contrato customizado
    -- mas mantendo a referência do arquivo para que o vendedor possa re-editar ou submeter novamente para aprovação.
    UPDATE core_comercial.estimaciones
    SET 
        current_version_id = v_new_version_id,
        status = 'draft',
        is_custom_contract_approved = FALSE,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = p_estimacion_id;
    
    -- 11. Retornar dados da nova versão
    RETURN json_build_object(
        'status', 'success',
        'estimacion_id', p_estimacion_id,
        'new_version_id', v_new_version_id,
        'version_number', v_max_version_number + 1
    );
END;
$$;

CREATE OR REPLACE FUNCTION core_comercial.aprovar_estimacion(p_estimacion_id uuid, p_expected_start_date date DEFAULT NULL::date, p_expected_end_date date DEFAULT NULL::date)
RETURNS json
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_est RECORD;
    v_items_count INT;
    v_pedido_id UUID;
    v_pedido_codigo VARCHAR;
    v_solicitud_id UUID;
    v_solicitud_codigo VARCHAR;
    v_tarefas_count INT;
BEGIN
    -- Identifica o usuário via JWT
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;

    -- 1. Buscar a estimación base
    SELECT * INTO v_est
    FROM core_comercial.estimaciones
    WHERE id = p_estimacion_id;

    IF v_est.id IS NULL THEN
        RAISE EXCEPTION 'Estimación % não encontrada', p_estimacion_id;
    END IF;

    -- 2. Validar Permissões (super_admin ou operador)
    IF NOT (
        core_common.has_role(v_est.empresa_id, 'admin') OR
        core_common.has_role(v_est.empresa_id, 'commercial') OR
        core_common.has_role(v_est.empresa_id, 'operador')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para aprovar estimación na empresa %', v_est.empresa_id;
    END IF;

    -- 3. Validar estado da estimación
    IF v_est.status NOT IN ('sent', 'review', 'approved', 'signed') THEN
        RAISE EXCEPTION 'A estimación está no status %, não pode ser convertida para pedido.', v_est.status;
    END IF;

    -- 4. Validar versão atual e local (client_site_id)
    IF v_est.current_version_id IS NULL THEN
        RAISE EXCEPTION 'A estimación não possui uma versão atual (current_version_id é nulo).';
    END IF;

    -- 6. Validar local
    IF v_est.client_site_id IS NULL THEN
        RAISE EXCEPTION 'A estimación precisa ter uma obra/local antes de ser convertida em pedido.';
    END IF;

    -- 5. Validar itens
    SELECT COUNT(*) INTO v_items_count
    FROM core_comercial.estimacion_items
    WHERE estimacion_version_id = v_est.current_version_id;

    IF v_items_count = 0 THEN
        RAISE EXCEPTION 'A versão atual da estimación não possui nenhum item.';
    END IF;

    -- 6. Evitar duplicidade de Pedido
    SELECT id INTO v_pedido_id
    FROM core_comercial.pedidos
    WHERE source_estimacion_id = p_estimacion_id;

    IF v_pedido_id IS NOT NULL THEN
        RAISE EXCEPTION 'Esta estimación já foi convertida no pedido (ID: %).', v_pedido_id;
    END IF;

    -- 7. Gerar código do Pedido herdando da Estimativa
    v_pedido_codigo := REPLACE(v_est.codigo, 'EST-', 'PED-');
    IF v_pedido_codigo = v_est.codigo THEN
        v_pedido_codigo := 'PED-' || SUBSTRING(v_est.codigo FROM 5);
    END IF;

    -- 8. Criar o Pedido (incluindo document_language)
    INSERT INTO core_comercial.pedidos (
        empresa_id, codigo, source_estimacion_id, source_estimacion_version_id,
        client_id, client_site_id, order_type, commercial_status, operational_status,
        commercial_owner_id, responsible_id, approved_at, expected_start_date, expected_end_date,
        payment_terms, notes, total_cost_snapshot, total_revenue_snapshot, margin_percent_snapshot,
        document_language, created_by
    ) VALUES (
        v_est.empresa_id, 
        v_pedido_codigo, 
        p_estimacion_id, 
        v_est.current_version_id,
        v_est.client_id, 
        v_est.client_site_id, 
        CASE WHEN v_est.estimation_type IN ('new_allocation', 'expansion') THEN v_est.estimation_type ELSE 'new_allocation' END, 
        'active', 
        'pending_operations',
        v_est.commercial_owner_id, 
        v_est.commercial_owner_id, 
        NOW(), 
        COALESCE(p_expected_start_date, v_est.expected_start_date), 
        COALESCE(p_expected_end_date, v_est.expected_end_date),
        v_est.payment_terms, 
        v_est.general_notes, 
        v_est.total_estimated_cost, 
        v_est.total_estimated_revenue, 
        v_est.estimated_margin_percent,
        COALESCE(v_est.document_language, 'pt'),
        v_user_id
    ) RETURNING id INTO v_pedido_id;

    -- 9. Clonar os Itens para o Pedido
    INSERT INTO core_comercial.pedido_items (
        empresa_id, pedido_id, source_estimacion_item_id, job_function_id, job_function_name_snapshot,
        description_snapshot, risk_level_snapshot, quantity_requested, quantity_fulfilled,
        planned_hours_per_day, planned_days_per_week, planned_total_hours,
        sell_rate_hour_snapshot, base_cost_hour_snapshot, margin_percent_snapshot,
        includes_housing, includes_transport, includes_epi, status, created_by
    )
    SELECT
        v_est.empresa_id, 
        v_pedido_id, 
        id, 
        job_function_id, 
        job_function_name_snapshot,
        description, 
        risk_level_snapshot, 
        quantity, 
        0,
        planned_hours_per_day, 
        planned_days_per_week, 
        planned_total_hours,
        sell_rate_hour, 
        base_cost_hour, 
        margin_percent,
        includes_housing, 
        includes_transport, 
        includes_epi, 
        'pending', 
        v_user_id
    FROM core_comercial.estimacion_items
    WHERE estimacion_version_id = v_est.current_version_id;

    -- 10. Atualizar a Estimación para Approved
    UPDATE core_comercial.estimaciones
    SET status = 'approved', updated_at = NOW(), updated_by = v_user_id
    WHERE id = p_estimacion_id;

    -- 11. Registrar Evento do Pedido
    INSERT INTO core_comercial.pedido_events (
        empresa_id, pedido_id, event_type, title, description, new_values, created_by
    ) VALUES (
        v_est.empresa_id, 
        v_pedido_id, 
        'other', 
        'Pedido criado a partir de estimación', 
        'Convertido a partir da Estimación ' || COALESCE(v_est.codigo, p_estimacion_id::text), 
        jsonb_build_object('estimacion_id', p_estimacion_id, 'version_id', v_est.current_version_id), 
        v_user_id
    );

    -- 12. Registrar Histórico de Status
    INSERT INTO core_comercial.pedido_status_history (
        empresa_id, pedido_id, new_commercial_status, new_operational_status, reason, created_by
    ) VALUES (
        v_est.empresa_id, v_pedido_id, 'active', 'pending_operations', 'Pedido criado a partir de estimación aprovada', v_user_id
    );

    -- 13. Gerar código da Solicitud Operativa herdando da Estimativa
    v_solicitud_codigo := REPLACE(v_est.codigo, 'EST-', 'SOL-');
    IF v_solicitud_codigo = v_est.codigo THEN
        v_solicitud_codigo := 'SOL-' || SUBSTRING(v_est.codigo FROM 5);
    END IF;

    -- 14. Criar Solicitud Operativa apontando para o Pedido
    INSERT INTO core_operacoes.solicitudes_operativas (
        empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        pedido_id, tipo, title, description, priority, status,
        client_id, client_site_id, requested_by, requested_at, created_by
    ) VALUES (
        v_est.empresa_id, 
        v_solicitud_codigo, 
        'comercial', 
        'pedido', 
        v_pedido_id,
        v_pedido_id, 
        'new_order', 
        'Nuevo pedido / Mobilización inicial', 
        'Solicitud generada automáticamente a partir del pedido ' || v_pedido_codigo, 
        'normal', 
        'pending',
        v_est.client_id, 
        v_est.client_site_id, 
        v_user_id, 
        NOW(), 
        v_user_id
    ) RETURNING id INTO v_solicitud_id;

    -- 15. Iniciar a Malha Operacional (Playbook)
    PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);

    -- Conta as tarefas geradas
    SELECT COUNT(*) INTO v_tarefas_count
    FROM core_operacoes.solicitud_tareas
    WHERE solicitud_id = v_solicitud_id;

    -- 16. Retornar Resultado Estruturado
    RETURN json_build_object(
        'status', 'success',
        'pedido_id', v_pedido_id,
        'pedido_codigo', v_pedido_codigo,
        'solicitud_id', v_solicitud_id,
        'solicitud_codigo', v_solicitud_codigo,
        'tarefas_geradas', v_tarefas_count
    );
END;
$$;

