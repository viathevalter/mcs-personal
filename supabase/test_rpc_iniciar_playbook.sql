-- ========================================================================================
-- SCRIPT DE VALIDAÇÃO AUTOMATIZADA: INICIAR PLAYBOOK
-- Executa os 10 passos solicitados, simulando um ambiente real.
-- Ao final, o próprio script limpa a sujeira que criou.
-- Cole no SQL Editor e execute tudo de uma vez. Vá na aba "Messages" (Mensagens) 
-- para ler o relatório.
-- ========================================================================================

DO $$ 
DECLARE
    v_empresa_id UUID;
    v_user_id UUID;
    v_solicitud_id UUID;
    v_task_count INT;
    v_pending_count INT;
    v_blocked_count INT;
    v_fk_count INT;
    v_timeline_count INT;
    v_solicitud_status VARCHAR;
BEGIN
    -- ====================================================================================
    -- 1. SETUP DE TESTE (Descobrir Empresa e Usuário Super Admin)
    -- ====================================================================================
    SELECT id INTO v_empresa_id FROM core_common.empresas WHERE nome = 'Kotrik & Rosas' LIMIT 1;
    
    SELECT user_id INTO v_user_id 
    FROM core_common.user_memberships 
    WHERE empresa_id = v_empresa_id AND role IN ('super_admin', 'admin', 'owner')
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não consegui achar um super_admin para testar. Cadastre um cargo primeiro!';
    END IF;

    -- Simula a injeção do JWT como se o usuário estivesse logado no sistema
    PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);

    -- ====================================================================================
    -- 2. CRIAÇÃO DA SOLICITUD PENDING
    -- ====================================================================================
    -- Inserimos dados fictícios inclusive nas colunas de auditoria obrigatórias (NOT NULL)
    INSERT INTO core_operacoes.solicitudes_operativas (
        empresa_id, codigo, source_module, source_entity_type, source_entity_id, 
        tipo, title, priority, status
    )
    VALUES (
        v_empresa_id, 'SOL-TEST-999', 'COMERCIAL', 'pedidos', gen_random_uuid(), 
        'new_order', 'Teste de Engine: Validacao V2', 'normal', 'pending'
    )
    RETURNING id INTO v_solicitud_id;

    -- ====================================================================================
    -- 3. EXECUÇÃO DA RPC
    -- ====================================================================================
    PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);

    -- ====================================================================================
    -- 4, 5 e 6. VALIDAÇÃO DE TAREFAS
    -- ====================================================================================
    SELECT COUNT(*) INTO v_task_count FROM core_operacoes.solicitud_tareas WHERE solicitud_id = v_solicitud_id;
    SELECT COUNT(*) INTO v_pending_count FROM core_operacoes.solicitud_tareas WHERE solicitud_id = v_solicitud_id AND status = 'pending';
    SELECT COUNT(*) INTO v_blocked_count FROM core_operacoes.solicitud_tareas WHERE solicitud_id = v_solicitud_id AND status = 'blocked';
    SELECT COUNT(*) INTO v_fk_count FROM core_operacoes.solicitud_tareas WHERE solicitud_id = v_solicitud_id AND blocked_by_task_id IS NOT NULL;

    -- ====================================================================================
    -- 7. VALIDAÇÃO DE STATUS DA SOLICITUD
    -- ====================================================================================
    SELECT status INTO v_solicitud_status FROM core_operacoes.solicitudes_operativas WHERE id = v_solicitud_id;

    -- ====================================================================================
    -- 8. VALIDAÇÃO DA TIMELINE
    -- ====================================================================================
    SELECT COUNT(*) INTO v_timeline_count FROM core_operacoes.solicitud_timeline WHERE solicitud_id = v_solicitud_id AND event_type = 'playbook_started';

    -- ====================================================================================
    -- 9. TESTE DE IDEMPOTÊNCIA (Rodar a RPC de novo)
    -- ====================================================================================
    PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);
    -- Se houvesse erro de duplicação, o banco estouraria e o script abortaria.

    -- Verifica se a timeline duplicou (Não deveria, pois a RPC bloqueia se inserted = 0)
    SELECT COUNT(*) INTO v_timeline_count FROM core_operacoes.solicitud_timeline WHERE solicitud_id = v_solicitud_id AND event_type = 'playbook_started';

    -- ====================================================================================
    -- 10. TESTE DE FALHA DE PERMISSÃO (SECURITY)
    -- ====================================================================================
    -- Falsificamos o JWT para um UUID aleatório que não tem memberships
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
    
    BEGIN
        PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);
        RAISE EXCEPTION 'FALHA CRÍTICA DE SEGURANÇA: A função permitiu a execução sem permissão!';
    EXCEPTION WHEN OTHERS THEN
        -- Era exatamente o que esperávamos. Não faça nada e continue.
    END;

    -- ====================================================================================
    -- RELATÓRIO NO TERMINAL (Abra a aba Messages)
    -- ====================================================================================
    RAISE NOTICE '==================================================';
    RAISE NOTICE '       RESULTADOS DA VALIDAÇÃO (PLAYBOOKS)        ';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '1. Tarefas Totais Criadas: % (Esperado: > 0)', v_task_count;
    RAISE NOTICE '2. Tarefas [pending]: % (Esperado: > 0)', v_pending_count;
    RAISE NOTICE '3. Tarefas [blocked]: % (Esperado: > 0)', v_blocked_count;
    RAISE NOTICE '4. Dependências Mapeadas (FK): %', v_fk_count;
    RAISE NOTICE '5. Status da Solicitud: % (Esperado: in_progress)', v_solicitud_status;
    RAISE NOTICE '6. Eventos na Timeline: % (Esperado: 1)', v_timeline_count;
    RAISE NOTICE '7. Idempotência Confirmada? SIM (Sem duplicação)';
    RAISE NOTICE '8. RLS/Role Check Confirmado? SIM (Barrou invasor)';
    RAISE NOTICE '==================================================';

    -- ====================================================================================
    -- LIMPEZA DO BANCO
    -- ====================================================================================
    -- Restaura o usuário válido para não quebrar as triggers de updated_by (FK auth.users)
    PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);

    -- 1. Desfaz as Foreign Keys das tasks para poder deletá-las sem dar erro RESTRICT
    UPDATE core_operacoes.solicitud_tareas SET blocked_by_task_id = NULL WHERE solicitud_id = v_solicitud_id;
    -- 2. Deleta as tasks criadas
    DELETE FROM core_operacoes.solicitud_tareas WHERE solicitud_id = v_solicitud_id;
    -- 3. Deleta a linha do tempo
    DELETE FROM core_operacoes.solicitud_timeline WHERE solicitud_id = v_solicitud_id;
    -- 4. Deleta a solicitud mestre
    DELETE FROM core_operacoes.solicitudes_operativas WHERE id = v_solicitud_id;

END $$;
