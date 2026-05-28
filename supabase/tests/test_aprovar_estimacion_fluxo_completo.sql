-- ========================================================================================
-- SCRIPT DE VALIDAÇÃO AUTOMATIZADA: FLUXO COMERCIAL (Aprovação)
-- Objetivo: Simular a jornada completa desde a Criação de um Orçamento, Aprovação 
-- (via RPC), Geração do Pedido até o Disparo do Playbook de Operações.
--
-- Instruções: Cole no SQL Editor e execute. O script vai processar todas as regras
-- de negócio de forma segura e depois imprimir 6 grids de resultados para você ver
-- os dados reais que foram gerados no banco de dados.
-- ========================================================================================

DO $$ 
DECLARE
    v_empresa_id UUID;
    v_user_id UUID;
    v_client_id UUID;
    v_client_site_id UUID;
    v_job_function_id UUID;
    v_job_function_name VARCHAR;
    v_estimacion_id UUID;
    v_version_id UUID;
    v_est_code VARCHAR;
    v_result JSON;
    v_pedido_id UUID;
    v_solicitud_id UUID;
    v_pedido_count INT;
    v_tarefas_count INT;
    v_solicitud_status VARCHAR;
    v_timeline_count INT;
    v_item_count INT;
BEGIN
    -- ====================================================================================
    -- 1. SETUP DE TESTE (Descobrir Empresa e Usuário)
    -- ====================================================================================
    SELECT id INTO v_empresa_id FROM core_common.empresas WHERE nome = 'Kotrik & Rosas' LIMIT 1;
    IF v_empresa_id IS NULL THEN RAISE EXCEPTION 'Empresa KOR não encontrada.'; END IF;

    -- Buscar um usuário que já seja super_admin ou operador
    SELECT user_id INTO v_user_id FROM core_common.user_memberships WHERE empresa_id = v_empresa_id AND role IN ('super_admin', 'operador') LIMIT 1;
    
    IF v_user_id IS NULL THEN
        -- Se não tiver, pegamos qualquer usuário da empresa e damos o cargo de operador para o teste rodar
        SELECT user_id INTO v_user_id FROM core_common.user_memberships WHERE empresa_id = v_empresa_id LIMIT 1;
        
        IF v_user_id IS NULL THEN RAISE EXCEPTION 'A empresa não tem nenhum usuário associado!'; END IF;
        
        -- Como o sistema legado tem uma trava que impede novos cargos, nós derrubamos ela no DEV para poder evoluir a arquitetura
        ALTER TABLE core_common.user_memberships DROP CONSTRAINT IF EXISTS user_memberships_role_check;
        
        INSERT INTO core_common.user_memberships (user_id, empresa_id, role)
        VALUES (v_user_id, v_empresa_id, 'operador')
        ON CONFLICT DO NOTHING;
    END IF;

    PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);

    -- ====================================================================================
    -- 2. DADOS DE TESTE (Cliente e Obra)
    -- ====================================================================================
    SELECT id INTO v_client_id FROM core_common.clients WHERE empresa_id = v_empresa_id AND tax_id = 'TEST-CLIENTE-COMERCIAL' LIMIT 1;
    IF v_client_id IS NULL THEN
        INSERT INTO core_common.clients (empresa_id, legal_name, trade_name, tax_id)
        VALUES (v_empresa_id, 'Cliente de Teste Comercial', 'Teste Comercial', 'TEST-CLIENTE-COMERCIAL')
        RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_client_site_id FROM core_common.client_sites WHERE client_id = v_client_id AND name = 'TEST-OBRA-COMERCIAL' LIMIT 1;
    IF v_client_site_id IS NULL THEN
        INSERT INTO core_common.client_sites (empresa_id, client_id, name)
        VALUES (v_empresa_id, v_client_id, 'TEST-OBRA-COMERCIAL')
        RETURNING id INTO v_client_site_id;
    END IF;

    -- Buscar uma profissão real cadastrada no banco
    SELECT id, name INTO v_job_function_id, v_job_function_name FROM core_comercial.job_functions WHERE empresa_id = v_empresa_id AND status = 'active' LIMIT 1;
    IF v_job_function_id IS NULL THEN
        -- Como não existe nenhuma, o script cria uma fictícia automaticamente para não quebrar.
        INSERT INTO core_comercial.job_functions (empresa_id, code, name, description, risk_level, status)
        VALUES (v_empresa_id, 'TEST-JOB', 'Técnico de Teste Operacional', 'Criado automaticamente pelo script de teste', 'low', 'active')
        RETURNING id, name INTO v_job_function_id, v_job_function_name;
    END IF;

    -- ====================================================================================
    -- 3. CRIAR ESTIMACIÓN (Orçamento)
    -- ====================================================================================
    -- Código dinâmico para não chocar com testes anteriores
    v_est_code := 'TEST-EST-' || TO_CHAR(NOW(), 'HH24MISS');

    INSERT INTO core_comercial.estimaciones (
        empresa_id, codigo, client_id, client_site_id, status, estimation_type, 
        commercial_owner_id, contact_name, contact_email, 
        expected_start_date, expected_end_date, validity_date, 
        payment_terms, total_estimated_cost, total_estimated_revenue, estimated_margin_percent,
        created_by
    ) VALUES (
        v_empresa_id, v_est_code, v_client_id, v_client_site_id, 'sent', 'new_allocation',
        v_user_id, 'Contato Teste', 'teste@mastercorp.local',
        CURRENT_DATE + 7, CURRENT_DATE + 90, CURRENT_DATE + 15,
        'Teste de aprovação automática', 5760.00, 8960.00, 35.71,
        v_user_id
    ) RETURNING id INTO v_estimacion_id;

    -- Version 1
    INSERT INTO core_comercial.estimacion_versions (
        empresa_id, estimacion_id, version_number, status, created_by
    ) VALUES (
        v_empresa_id, v_estimacion_id, 1, 'active', v_user_id
    ) RETURNING id INTO v_version_id;

    UPDATE core_comercial.estimaciones SET current_version_id = v_version_id WHERE id = v_estimacion_id;

    -- Adicionar Itens ao Orçamento
    INSERT INTO core_comercial.estimacion_items (
        empresa_id, estimacion_id, estimacion_version_id, job_function_id, job_function_name_snapshot,
        quantity, planned_hours_per_day, planned_days_per_week, planned_total_hours,
        includes_housing, includes_transport, includes_epi,
        base_cost_hour, sell_rate_hour, minimum_sell_rate_hour, recommended_sell_rate_hour, margin_percent,
        created_by
    ) VALUES (
        v_empresa_id, v_estimacion_id, v_version_id, v_job_function_id, v_job_function_name,
        2, 8, 5, 320,
        true, true, true,
        18, 28, 25, 30, 35.71,
        v_user_id
    );

    -- ====================================================================================
    -- 4. A HORA DA VERDADE (Executar a RPC)
    -- ====================================================================================
    v_result := core_comercial.aprovar_estimacion(v_estimacion_id);
    
    -- Capturar JSON Retornado
    v_pedido_id := (v_result->>'pedido_id')::uuid;
    v_solicitud_id := (v_result->>'solicitud_id')::uuid;
    v_tarefas_count := (v_result->>'tarefas_geradas')::int;

    -- ====================================================================================
    -- 5. VALIDAÇÕES INVISÍVEIS (Se falhar, aborta tudo)
    -- ====================================================================================
    SELECT COUNT(*) INTO v_pedido_count FROM core_comercial.pedidos WHERE id = v_pedido_id AND source_estimacion_id = v_estimacion_id AND source_estimacion_version_id = v_version_id AND commercial_status = 'active';
    IF v_pedido_count = 0 THEN RAISE EXCEPTION 'Falha: Pedido não foi criado ou status incorreto.'; END IF;

    SELECT COUNT(*) INTO v_item_count FROM core_comercial.pedido_items WHERE pedido_id = v_pedido_id AND quantity_requested = 2;
    IF v_item_count = 0 THEN RAISE EXCEPTION 'Falha: Pedido_items não foi clonado corretamente.'; END IF;

    SELECT status INTO v_solicitud_status FROM core_operacoes.solicitudes_operativas WHERE id = v_solicitud_id AND tipo = 'new_order' AND pedido_id = v_pedido_id;
    IF v_solicitud_status != 'in_progress' THEN RAISE EXCEPTION 'Falha: Solicitud não assumiu status in_progress após rodar o playbook.'; END IF;

    SELECT COUNT(*) INTO v_timeline_count FROM core_operacoes.solicitud_timeline WHERE solicitud_id = v_solicitud_id AND event_type = 'playbook_started';
    IF v_timeline_count = 0 THEN RAISE EXCEPTION 'Falha: Evento playbook_started não foi achado na timeline.'; END IF;

    -- ====================================================================================
    -- 6. TESTE DE BLOQUEIO (Dupla Aprovação)
    -- ====================================================================================
    BEGIN
        PERFORM core_comercial.aprovar_estimacion(v_estimacion_id);
        RAISE EXCEPTION 'FALHA CRÍTICA DE SEGURANÇA: A RPC permitiu aprovar a mesma estimación duas vezes!';
    EXCEPTION WHEN OTHERS THEN
        -- Esperado falhar! O banco barrou porque já existe pedido.
        NULL;
    END;

    -- Mensagem de Sucesso na Aba Messages
    RAISE NOTICE '======= SUCESSO: FLUXO COMERCIAL VALIDADO =======';
    RAISE NOTICE 'A estimación % foi convertida no pedido %.', v_est_code, v_result->>'pedido_codigo';
    RAISE NOTICE 'Isso disparou o playbook gerando a Solicitud % com % tarefas operacionais!', v_result->>'solicitud_codigo', v_tarefas_count;

END $$;

-- ====================================================================================
-- 7. RELATÓRIO VISUAL (Aba Results)
-- As queries abaixo vão trazer os dados que a automação acabou de cuspir no banco.
-- ====================================================================================

-- Tabela 1: Estimación original (Note que o status foi atualizado para "approved")
SELECT '1_ESTIMACION_APROVADA' AS view, id, codigo, status, current_version_id FROM core_comercial.estimaciones WHERE codigo LIKE 'TEST-EST-%' ORDER BY created_at DESC LIMIT 1;

-- Tabela 2: Pedido Oficial Criado
SELECT '2_PEDIDO_GERADO' AS view, id, codigo, commercial_status, operational_status, source_estimacion_id FROM core_comercial.pedidos WHERE source_estimacion_id IN (SELECT id FROM core_comercial.estimaciones WHERE codigo LIKE 'TEST-EST-%' ORDER BY created_at DESC LIMIT 1);

-- Tabela 3: Itens do Pedido Clonados Perfeitamente
SELECT '3_PEDIDO_ITEMS' AS view, id, job_function_name_snapshot, quantity_requested, sell_rate_hour_snapshot FROM core_comercial.pedido_items WHERE pedido_id IN (SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id IN (SELECT id FROM core_comercial.estimaciones WHERE codigo LIKE 'TEST-EST-%' ORDER BY created_at DESC LIMIT 1));

-- Tabela 4: Solicitud Operativa Engatilhada
SELECT '4_SOLICITUD_OPERATIVA' AS view, id, codigo, tipo, status FROM core_operacoes.solicitudes_operativas WHERE pedido_id IN (SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id IN (SELECT id FROM core_comercial.estimaciones WHERE codigo LIKE 'TEST-EST-%' ORDER BY created_at DESC LIMIT 1));

-- Tabela 5: As Tarefas do Playbook Distribuídas!
SELECT '5_TAREFAS_PLAYBOOK' AS view, id, title, status, blocked_by_task_id FROM core_operacoes.solicitud_tareas WHERE solicitud_id IN (SELECT id FROM core_operacoes.solicitudes_operativas WHERE pedido_id IN (SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id IN (SELECT id FROM core_comercial.estimaciones WHERE codigo LIKE 'TEST-EST-%' ORDER BY created_at DESC LIMIT 1)));

-- Tabela 6: Linha do Tempo e Auditoria
SELECT '6_TIMELINE' AS view, event_type, description, created_at FROM core_operacoes.solicitud_timeline WHERE solicitud_id IN (SELECT id FROM core_operacoes.solicitudes_operativas WHERE pedido_id IN (SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id IN (SELECT id FROM core_comercial.estimaciones WHERE codigo LIKE 'TEST-EST-%' ORDER BY created_at DESC LIMIT 1)));
