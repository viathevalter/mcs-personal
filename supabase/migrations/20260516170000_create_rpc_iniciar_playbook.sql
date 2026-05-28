-- ========================================================================================
-- MIGRATION: RPC INICIAR PLAYBOOK
-- Objetivo: Criar as tarefas operacionais automaticamente baseadas no playbook ativo.
-- Funcionalidade: Engine de criação de tarefas em lote com resolução de dependências.
-- ========================================================================================

BEGIN;

-- 1. Índice único para garantir idempotência (Evitar duplicação de tarefas do mesmo step na mesma solicitud)
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_tarea_step
ON core_operacoes.solicitud_tareas(empresa_id, solicitud_id, playbook_step_id)
WHERE playbook_step_id IS NOT NULL;

-- 2. Criação da RPC
CREATE OR REPLACE FUNCTION core_operacoes.iniciar_playbook(p_solicitud_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- Prática de segurança para funções SECURITY DEFINER (evita injeção de schema)
AS $$
DECLARE
    v_empresa_id UUID;
    v_tipo VARCHAR;
    v_status VARCHAR;
    v_playbook_id UUID;
    v_playbook_name VARCHAR;
    v_user_id UUID;
    v_inserted INT;
BEGIN
    -- Identifica quem está executando a ação (via JWT do Supabase auth)
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;
    
    -- 1. Buscar os dados base da solicitud
    SELECT empresa_id, tipo, status 
    INTO v_empresa_id, v_tipo, v_status
    FROM core_operacoes.solicitudes_operativas
    WHERE id = p_solicitud_id;

    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Solicitud operativa % não encontrada.', p_solicitud_id;
    END IF;

    -- 2. Localizar o playbook correspondente à empresa e ao tipo da solicitud
    SELECT id, name INTO v_playbook_id, v_playbook_name
    FROM core_operacoes.playbooks
    WHERE empresa_id = v_empresa_id 
      AND solicitud_type = v_tipo 
      AND status = 'active'
    LIMIT 1;

    IF v_playbook_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum playbook ativo encontrado para o tipo % na empresa %', v_tipo, v_empresa_id;
    END IF;

    -- 3. FASE 1: Inserir as tarefas que ainda não existem
    -- A subquery NOT EXISTS garante 100% de idempotência, ignorando tasks que já foram criadas
    INSERT INTO core_operacoes.solicitud_tareas (
        empresa_id, solicitud_id, playbook_step_id, department_id,
        title, description, priority, due_date, blocking, status, created_by
    )
    SELECT 
        v_empresa_id, 
        p_solicitud_id, 
        ps.id, 
        ps.department_id,
        ps.title, 
        ps.description, 
        ps.priority, 
        CURRENT_DATE + ps.default_due_days, 
        ps.blocking, 
        CASE WHEN ps.depends_on_step_id IS NULL THEN 'pending' ELSE 'blocked' END,
        v_user_id
    FROM core_operacoes.playbook_steps ps
    WHERE ps.playbook_id = v_playbook_id 
      AND ps.status = 'active'
      AND NOT EXISTS (
          SELECT 1 FROM core_operacoes.solicitud_tareas st 
          WHERE st.solicitud_id = p_solicitud_id AND st.playbook_step_id = ps.id
      );

    -- Armazena a quantidade de tarefas que foram efetivamente criadas nesta execução
    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    -- Só executa a Fase 2 se novas tarefas foram criadas
    IF v_inserted > 0 THEN
        
        -- 4. FASE 2: Resolver Dependências (Self-Join)
        -- Agora que as tarefas base (pending e blocked) estão criadas, atualizamos a chave estrangeira
        -- `blocked_by_task_id` apontando para o ID gerado para a tarefa parente
        UPDATE core_operacoes.solicitud_tareas st
        SET blocked_by_task_id = parent_task.id
        FROM core_operacoes.playbook_steps ps
        JOIN core_operacoes.solicitud_tareas parent_task 
          ON parent_task.playbook_step_id = ps.depends_on_step_id 
         AND parent_task.solicitud_id = p_solicitud_id
        WHERE st.solicitud_id = p_solicitud_id
          AND st.playbook_step_id = ps.id
          AND ps.depends_on_step_id IS NOT NULL
          AND st.blocked_by_task_id IS NULL;

        -- 5. Registrar na linha do tempo (Timeline Append-Only)
        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id, solicitud_id, event_type, title, description, created_by
        )
        VALUES (
            v_empresa_id, p_solicitud_id, 'playbook_started', 'Playbook Iniciado', 'A automação gerou as tarefas usando o playbook: ' || v_playbook_name, v_user_id
        );

        -- 6. Atualizar status da solicitud
        IF v_status = 'pending' THEN
            UPDATE core_operacoes.solicitudes_operativas
            SET status = 'in_progress', updated_at = NOW(), updated_by = v_user_id
            WHERE id = p_solicitud_id;
        END IF;
    END IF;

END;
$$;

COMMIT;
