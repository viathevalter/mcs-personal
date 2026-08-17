-- ========================================================================================
-- MIGRATION: RPCs PARA GESTÃO DE TAREFAS OPERACIONAIS V2
-- Objetivo: Fornecer endpoints consistentes para iniciar e concluir tarefas.
-- Inclui controle de concorrência com SELECT FOR UPDATE e transições de estado estritas.
-- ========================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION core_operacoes.iniciar_tarefa(p_tarefa_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' 
AS $$
DECLARE
    v_user_id UUID;
    v_tarefa RECORD;
    v_solicitud RECORD;
BEGIN
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;

    -- 1. Buscar a tarefa COM LOCK
    SELECT * INTO v_tarefa
    FROM core_operacoes.solicitud_tareas
    WHERE id = p_tarefa_id
    FOR UPDATE;

    IF v_tarefa.id IS NULL THEN
        RAISE EXCEPTION 'Tarefa % não encontrada', p_tarefa_id;
    END IF;

    -- 2. Validar permissões
    IF NOT (
        core_common.has_role(v_tarefa.empresa_id, 'super_admin')
        OR core_common.has_role(v_tarefa.empresa_id, 'operador')
        OR core_common.has_role(v_tarefa.empresa_id, 'admin_rh')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para iniciar tarefas na empresa %', v_tarefa.empresa_id;
    END IF;

    -- 3. Validar Status e Transições
    IF v_tarefa.status = 'blocked' THEN
        RAISE EXCEPTION 'Não é possível iniciar uma tarefa que está bloqueada.';
    END IF;

    IF v_tarefa.status = 'in_progress' THEN
        RAISE EXCEPTION 'A tarefa já está em andamento.';
    END IF;

    IF v_tarefa.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Não é possível iniciar uma tarefa que já está concluída ou cancelada.';
    END IF;
    
    IF v_tarefa.status != 'pending' THEN
        RAISE EXCEPTION 'A tarefa deve estar pendente para ser iniciada (Status atual: %).', v_tarefa.status;
    END IF;

    -- 4. Atualizar Tarefa
    UPDATE core_operacoes.solicitud_tareas
    SET status = 'in_progress', updated_at = NOW(), updated_by = v_user_id
    WHERE id = p_tarefa_id;

    -- 5. Atualizar Solicitud Mestre COM LOCK (se estiver pending)
    SELECT * INTO v_solicitud
    FROM core_operacoes.solicitudes_operativas
    WHERE id = v_tarefa.solicitud_id
    FOR UPDATE;

    IF v_solicitud.status = 'pending' THEN
        UPDATE core_operacoes.solicitudes_operativas
        SET status = 'in_progress', updated_at = NOW(), updated_by = v_user_id
        WHERE id = v_solicitud.id;
    END IF;

    -- 6. Registrar Timeline da Tarefa
    INSERT INTO core_operacoes.solicitud_timeline (
        empresa_id, solicitud_id, event_type, title, description, created_by
    ) VALUES (
        v_tarefa.empresa_id, v_tarefa.solicitud_id, 'task_started', 'Tarefa iniciada', v_tarefa.title, v_user_id
    );

    RETURN json_build_object(
        'status', 'success',
        'tarefa_id', p_tarefa_id,
        'solicitud_id', v_tarefa.solicitud_id,
        'new_status', 'in_progress'
    );
END;
$$;


CREATE OR REPLACE FUNCTION core_operacoes.concluir_tarefa(p_tarefa_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' 
AS $$
DECLARE
    v_user_id UUID;
    v_tarefa RECORD;
    v_unblocked_task RECORD;
    v_solicitud RECORD;
    v_unblocked_count INT := 0;
    v_pending_tasks_count INT;
BEGIN
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;

    -- 1. Buscar a tarefa COM LOCK
    SELECT * INTO v_tarefa
    FROM core_operacoes.solicitud_tareas
    WHERE id = p_tarefa_id
    FOR UPDATE;

    IF v_tarefa.id IS NULL THEN
        RAISE EXCEPTION 'Tarefa % não encontrada', p_tarefa_id;
    END IF;

    -- 2. Validar permissões
    IF NOT (
        core_common.has_role(v_tarefa.empresa_id, 'super_admin')
        OR core_common.has_role(v_tarefa.empresa_id, 'operador')
        OR core_common.has_role(v_tarefa.empresa_id, 'admin_rh')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para concluir tarefas na empresa %', v_tarefa.empresa_id;
    END IF;

    -- 3. Validar Status e Transições
    IF v_tarefa.status = 'blocked' THEN
        RAISE EXCEPTION 'Não é possível concluir uma tarefa que está bloqueada.';
    END IF;

    IF v_tarefa.status = 'pending' THEN
        RAISE EXCEPTION 'A tarefa deve ser iniciada antes de ser concluída.';
    END IF;

    IF v_tarefa.status = 'completed' THEN
        RAISE EXCEPTION 'A tarefa já foi concluída.';
    END IF;

    IF v_tarefa.status = 'cancelled' THEN
        RAISE EXCEPTION 'Não é possível concluir uma tarefa cancelada.';
    END IF;

    IF v_tarefa.status != 'in_progress' THEN
        RAISE EXCEPTION 'A tarefa deve estar em andamento para ser concluída (Status atual: %).', v_tarefa.status;
    END IF;

    -- 4. Atualizar Tarefa para Completed
    UPDATE core_operacoes.solicitud_tareas
    SET status = 'completed', completed_at = NOW(), updated_at = NOW(), updated_by = v_user_id
    WHERE id = p_tarefa_id;

    -- 5. Registrar Timeline da Tarefa Concluída
    INSERT INTO core_operacoes.solicitud_timeline (
        empresa_id, solicitud_id, event_type, title, description, created_by
    ) VALUES (
        v_tarefa.empresa_id, v_tarefa.solicitud_id, 'task_completed', 'Tarefa concluída', v_tarefa.title, v_user_id
    );

    -- 6. Desbloquear Tarefas Dependentes
    FOR v_unblocked_task IN 
        UPDATE core_operacoes.solicitud_tareas
        SET status = 'pending', updated_at = NOW(), updated_by = v_user_id
        WHERE blocked_by_task_id = p_tarefa_id AND status = 'blocked'
        RETURNING id, title
    LOOP
        v_unblocked_count := v_unblocked_count + 1;
        
        -- Inserir timeline para cada desbloqueio
        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id, solicitud_id, event_type, title, description, created_by
        ) VALUES (
            v_tarefa.empresa_id, v_tarefa.solicitud_id, 'task_unblocked', 'Tarefa desbloqueada', 
            'A tarefa "' || v_unblocked_task.title || '" foi desbloqueada após a conclusão da tarefa "' || v_tarefa.title || '".', 
            v_user_id
        );
    END LOOP;

    -- 7. Verificar se todas as tarefas da solicitud foram concluídas
    -- Buscamos a solicitud com FOR UPDATE
    SELECT * INTO v_solicitud
    FROM core_operacoes.solicitudes_operativas
    WHERE id = v_tarefa.solicitud_id
    FOR UPDATE;

    SELECT COUNT(*) INTO v_pending_tasks_count
    FROM core_operacoes.solicitud_tareas
    WHERE solicitud_id = v_solicitud.id AND status NOT IN ('completed', 'cancelled');

    -- Se não houver mais tarefas pendentes e a solicitud não estiver concluída/cancelada
    IF v_pending_tasks_count = 0 AND v_solicitud.status NOT IN ('completed', 'cancelled') THEN
        -- Atualizar Solicitud Mestre
        UPDATE core_operacoes.solicitudes_operativas
        SET status = 'completed', updated_at = NOW(), updated_by = v_user_id
        WHERE id = v_solicitud.id;
        
        v_solicitud.status := 'completed';

        -- Registrar na timeline da solicitud
        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id, solicitud_id, event_type, title, description, created_by
        ) VALUES (
            v_tarefa.empresa_id, v_solicitud.id, 'solicitud_completed', 'Solicitud Concluída', 
            'Todas as tarefas da solicitação foram concluídas.', v_user_id
        );
    END IF;

    RETURN json_build_object(
        'status', 'success',
        'tarefa_id', p_tarefa_id,
        'solicitud_id', v_solicitud.id,
        'new_status', 'completed',
        'tarefas_desbloqueadas', v_unblocked_count,
        'solicitud_status', v_solicitud.status
    );
END;
$$;

-- Ajustes de permissão de execução
REVOKE ALL ON FUNCTION core_operacoes.iniciar_tarefa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core_operacoes.iniciar_tarefa(UUID) TO authenticated;

REVOKE ALL ON FUNCTION core_operacoes.concluir_tarefa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core_operacoes.concluir_tarefa(UUID) TO authenticated;

COMMIT;
