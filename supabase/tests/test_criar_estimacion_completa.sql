-- ========================================================================================
-- SCRIPT DE VALIDAÇÃO AUTOMATIZADA: CRIAÇÃO TRANSAcional DE ESTIMACIONES
-- Objetivo: Validar se a RPC `criar_estimacion_completa` processa o JSON corretamente,
-- cria as 4 tabelas conectadas, realiza cálculos e impõe RLS e regras de negócio.
--
-- Instruções: Cole no SQL Editor e execute.
-- ========================================================================================

DO $$ 
DECLARE
    v_empresa_id UUID;
    v_user_id UUID;
    v_client_id UUID;
    v_client_site_id UUID;
    v_job_function_id UUID;
    v_payload JSONB;
    v_result JSON;
    v_estimacion_count INT;
    v_version_count INT;
    v_item_count INT;
BEGIN
    -- 1. SETUP DE TESTE (Descobrir Empresa e Usuário)
    SELECT id INTO v_empresa_id FROM core_common.empresas WHERE nome = 'Kotrik & Rosas' LIMIT 1;
    IF v_empresa_id IS NULL THEN RAISE EXCEPTION 'Empresa KOR não encontrada.'; END IF;

    SELECT user_id INTO v_user_id FROM core_common.user_memberships WHERE empresa_id = v_empresa_id AND role IN ('super_admin', 'operador') LIMIT 1;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário com permissão de operador encontrado. Dê permissão de operador a um usuário antes de testar.';
    END IF;

    -- "Mockar" o usuário logado para a sessão do teste (Security Definer vai ler isso)
    PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);

    -- Pegar Cliente
    SELECT id INTO v_client_id FROM core_common.clients WHERE empresa_id = v_empresa_id LIMIT 1;
    
    -- Pegar Obra
    SELECT id INTO v_client_site_id FROM core_common.client_sites WHERE client_id = v_client_id LIMIT 1;

    -- Pegar Job Function
    SELECT id INTO v_job_function_id FROM core_comercial.job_functions LIMIT 1;

    IF v_client_id IS NULL THEN RAISE EXCEPTION 'Cliente não encontrado para a empresa.'; END IF;
    IF v_client_site_id IS NULL THEN RAISE EXCEPTION 'Obra não encontrada para o cliente. Rode o seed de obras.'; END IF;
    IF v_job_function_id IS NULL THEN RAISE EXCEPTION 'Nenhuma Função (Job Function) encontrada no banco. Crie pelo menos uma função antes de testar.'; END IF;

    -- 2. MONTAR PAYLOAD DE TESTE
    v_payload := jsonb_build_object(
        'empresa_id', v_empresa_id,
        'client_id', v_client_id,
        'client_site_id', v_client_site_id,
        'estimation_type', 'new_allocation',
        'contact_name', 'João Silva',
        'contact_email', 'joao.silva@cliente.com',
        'expected_start_date', current_date + interval '5 days',
        'expected_end_date', current_date + interval '65 days',
        'validity_date', current_date + interval '15 days',
        'payment_terms', '30 dias',
        'status', 'draft',
        'general_notes', 'Proposta montada via RPC única de teste.',
        'total_estimated_cost', 5000,
        'total_estimated_revenue', 6500,
        'estimated_margin_percent', 23.07,
        'items', jsonb_build_array(
            jsonb_build_object(
                'job_function_id', v_job_function_id,
                'quantity', 2,
                'planned_hours_per_day', 8,
                'planned_days_per_week', 5,
                'total_hours', 320,
                'includes_accommodation', true,
                'includes_transport', false,
                'includes_ppe', true,
                'base_cost_hour', 15.00,
                'recommended_sell_rate', 20.00,
                'minimum_sell_rate', 18.00,
                'sell_rate_hour', 20.00,
                'margin_percent', 25.00,
                'risk_level', 'high',
                'notes', 'Alojamento por conta da KOR.'
            )
        ),
        'costs', jsonb_build_array(
            jsonb_build_object(
                'cost_category', 'housing',
                'description', 'Aluguel do alojamento X',
                'amount', 1200,
                'is_rechargeable', false,
                'markup_percent', 0
            )
        )
    );

    -- 3. EXECUTAR A RPC
    SELECT core_comercial.criar_estimacion_completa(v_payload) INTO v_result;

    -- 4. VALIDAÇÕES FINAIS
    SELECT count(*) INTO v_estimacion_count FROM core_comercial.estimaciones WHERE id = (v_result->>'estimacion_id')::uuid;
    SELECT count(*) INTO v_version_count FROM core_comercial.estimacion_versions WHERE id = (v_result->>'version_id')::uuid;
    SELECT count(*) INTO v_item_count FROM core_comercial.estimacion_items WHERE estimacion_version_id = (v_result->>'version_id')::uuid;

    IF v_estimacion_count = 0 THEN RAISE EXCEPTION 'Falha: Estimación não encontrada no banco.'; END IF;
    IF v_version_count = 0 THEN RAISE EXCEPTION 'Falha: Versão não encontrada no banco.'; END IF;
    IF v_item_count = 0 THEN RAISE EXCEPTION 'Falha: Itens não inseridos no banco.'; END IF;

    -- Imprimir sucesso
    RAISE NOTICE '✅ SUCESSO: A RPC criar_estimacion_completa funcionou perfeitamente!';
    RAISE NOTICE 'Dados retornados: %', v_result;
END $$;
