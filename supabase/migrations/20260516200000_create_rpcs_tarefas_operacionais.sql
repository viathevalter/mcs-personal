-- ========================================================================================
-- MIGRATION: RPCs PARA GESTÃO DE TAREFAS OPERACIONAIS
-- Objetivo: Fornecer os endpoints seguros para que o Frontend possa Iniciar, Concluir
-- e Desbloquear tarefas, além de atualizar o status da Solicitud Mestre.
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
BEGIN
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;

    -- 1. Buscar a tarefa
    SELECT * INTO v_tarefa
    FROM core_operacoes.solicitud_tareas
    WHERE id = p_tarefa_id;

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

    -- 3. Validar Status
    IF v_tarefa.status = 'blocked' THEN
        RAISE EXCEPTION 'Não é possível iniciar uma tarefa que está bloqueada.';
    END IF;
    
    IF v_tarefa.status != 'pending' THEN
        RAISE EXCEPTION 'A tarefa deve estar pendente para ser iniciada (Status atual: %).', v_tarefa.status;
    END IF;

    -- 4. Atualizar Tarefa
    UPDATE core_operacoes.solicitud_tareas
    SET status = 'in_progress', updated_at = NOW(), updated_by = v_user_id
    WHERE id = p_tarefa_id;

    -- 5. Registrar Timeline
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
    v_unblocked_count INT := 0;
    v_pending_tasks_count INT;
    v_solicitud_status VARCHAR;
BEGIN
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;

    -- 1. Buscar a tarefa
    SELECT * INTO v_tarefa
    FROM core_operacoes.solicitud_tareas
    WHERE id = p_tarefa_id;

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

    -- 3. Atualizar Tarefa para Completed
    UPDATE core_operacoes.solicitud_tareas
    SET status = 'completed', completed_at = NOW(), updated_at = NOW(), updated_by = v_user_id
    WHERE id = p_tarefa_id;

    -- 4. Registrar Timeline da Tarefa Concluída
    INSERT INTO core_operacoes.solicitud_timeline (
        empresa_id, solicitud_id, event_type, title, description, created_by
    ) VALUES (
        v_tarefa.empresa_id, v_tarefa.solicitud_id, 'task_completed', 'Tarefa concluída', v_tarefa.title, v_user_id
    );

    -- 5. Desbloquear Tarefas Dependentes
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

    -- 6. Verificar se todas as tarefas ativas da solicitud foram concluídas
    SELECT COUNT(*) INTO v_pending_tasks_count
    FROM core_operacoes.solicitud_tareas
    WHERE solicitud_id = v_tarefa.solicitud_id AND status NOT IN ('completed', 'cancelled');

    SELECT status INTO v_solicitud_status
    FROM core_operacoes.solicitudes_operativas
    WHERE id = v_tarefa.solicitud_id;

    -- Se não houver mais tarefas pendentes/em andamento/bloqueadas e a solicitud não estiver cancelada/concluída
    IF v_pending_tasks_count = 0 AND v_solicitud_status NOT IN ('completed', 'cancelled') THEN
        -- Atualizar Solicitud Mestre
        UPDATE core_operacoes.solicitudes_operativas
        SET status = 'completed', updated_at = NOW(), updated_by = v_user_id
        WHERE id = v_tarefa.solicitud_id;
        
        v_solicitud_status := 'completed';

        -- Registrar na timeline da solicitud
        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id, solicitud_id, event_type, title, description, created_by
        ) VALUES (
            v_tarefa.empresa_id, v_tarefa.solicitud_id, 'solicitud_completed', 'Solicitud Concluída', 
            'Todas as tarefas da solicitação foram concluídas.', v_user_id
        );
    END IF;

    RETURN json_build_object(
        'status', 'success',
        'tarefa_id', p_tarefa_id,
        'solicitud_id', v_tarefa.solicitud_id,
        'new_status', 'completed',
        'tarefas_desbloqueadas', v_unblocked_count,
        'solicitud_status', v_solicitud_status
    );
END;
$$;

-- Ajustes de permissão de execução
REVOKE ALL ON FUNCTION core_operacoes.iniciar_tarefa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core_operacoes.iniciar_tarefa(UUID) TO authenticated;

REVOKE ALL ON FUNCTION core_operacoes.concluir_tarefa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core_operacoes.concluir_tarefa(UUID) TO authenticated;

COMMIT;
