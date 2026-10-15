-- ============================================================================
-- MIGRATION: Super Gaveta Flutuante (Command Center) + 8 Process Playbooks + MCS Chat Bridge
-- Date: 2026-10-15
-- ============================================================================

-- 1. Expandir core_operacoes.solicitud_tareas para suportar Tarefas Manuais (substituto do Teams),
--    Agendamento (scheduled_for), Vínculos Diretos (worker_id, pedido_id, client_id, conversation_id)
--    e Metadados Operacionais (Aviso Prévio, Carta de Renúncia, Sugestão de E-mail IA).
ALTER TABLE core_operacoes.solicitud_tareas
  ALTER COLUMN solicitud_id DROP NOT NULL;

ALTER TABLE core_operacoes.solicitud_tareas
  ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES core_personal.workers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pedido_id UUID REFERENCES core_comercial.pedidos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES core_common.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversation_id UUID,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS task_source VARCHAR(50) DEFAULT 'playbook',
  ADD COLUMN IF NOT EXISTS assigned_to_email TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
  ADD COLUMN IF NOT EXISTS created_by_email TEXT,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_solicitud_tareas_worker_id ON core_operacoes.solicitud_tareas(worker_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_tareas_pedido_id ON core_operacoes.solicitud_tareas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_tareas_conversation_id ON core_operacoes.solicitud_tareas(conversation_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_tareas_scheduled_for ON core_operacoes.solicitud_tareas(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_solicitud_tareas_assigned_email ON core_operacoes.solicitud_tareas(assigned_to_email);

-- Garantir políticas RLS em core_operacoes.solicitud_tareas para leitura e escrita autenticada
DROP POLICY IF EXISTS "solicitud_tareas_authenticated_select" ON core_operacoes.solicitud_tareas;
CREATE POLICY "solicitud_tareas_authenticated_select"
  ON core_operacoes.solicitud_tareas
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "solicitud_tareas_authenticated_insert" ON core_operacoes.solicitud_tareas;
CREATE POLICY "solicitud_tareas_authenticated_insert"
  ON core_operacoes.solicitud_tareas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "solicitud_tareas_authenticated_update" ON core_operacoes.solicitud_tareas;
CREATE POLICY "solicitud_tareas_authenticated_update"
  ON core_operacoes.solicitud_tareas
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Semear os 2 novos Playbooks específicos da operação real em todas as empresas:
--    - HIRING_WITHDRAWAL ('hiring_withdrawal'): Desistência na Contratação / Não Assinou Contrato
--    - WORKER_RESIGNATION ('worker_resignation'): Baixa por Iniciativa do Trabalhador (Retenção + Carta de Renúncia + Aviso Prévio)
--    E ativar os Playbooks dos 8 processos operacionais.
DO $$
DECLARE
  r_emp RECORD;
  v_pb_id UUID;
  v_dep_rh UUID;
  v_dep_log UUID;
  v_dep_seg UUID;
  v_dep_con UUID;
  v_dep_fin UUID;
  v_dep_ope UUID;
  v_dep_com UUID;
BEGIN
  FOR r_emp IN SELECT id FROM core_common.empresas LOOP
    SELECT id INTO v_dep_rh  FROM core_common.departments WHERE empresa_id = r_emp.id AND code = 'RH' LIMIT 1;
    SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = r_emp.id AND code = 'LOGISTICA' LIMIT 1;
    SELECT id INTO v_dep_seg FROM core_common.departments WHERE empresa_id = r_emp.id AND code = 'SEGURIDAD_SOCIAL' LIMIT 1;
    SELECT id INTO v_dep_con FROM core_common.departments WHERE empresa_id = r_emp.id AND code = 'CONTRATOS' LIMIT 1;
    SELECT id INTO v_dep_fin FROM core_common.departments WHERE empresa_id = r_emp.id AND code = 'FINANCEIRO' LIMIT 1;
    SELECT id INTO v_dep_ope FROM core_common.departments WHERE empresa_id = r_emp.id AND code = 'OPERACOES' LIMIT 1;
    SELECT id INTO v_dep_com FROM core_common.departments WHERE empresa_id = r_emp.id AND code = 'COMERCIAL' LIMIT 1;

    -- 2.1 Playbook: HIRING_WITHDRAWAL (Desistência na Contratação / Contrato)
    INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
    VALUES (
      r_emp.id,
      'HIRING_WITHDRAWAL',
      'Desistência na Contratação / Contrato',
      'hiring_withdrawal',
      'Acionado automaticamente quando um trabalhador desiste antes de iniciar ou recusa assinar o contrato.',
      'active'
    )
    ON CONFLICT (empresa_id, code) DO UPDATE
      SET name = EXCLUDED.name,
          solicitud_type = EXCLUDED.solicitud_type,
          description = EXCLUDED.description,
          status = 'active',
          updated_at = NOW()
    RETURNING id INTO v_pb_id;

    INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, status)
    VALUES
      (r_emp.id, v_pb_id, COALESCE(v_dep_rh, v_dep_ope), 'HW_STEP_1', 'Repor vaga reaberta por desistência', 'A vaga foi reaberta automaticamente na Contratação Inicial. Selecionar substituto com prioridade.', 'urgent', 1, true, 1, false, 'active'),
      (r_emp.id, v_pb_id, COALESCE(v_dep_log, v_dep_ope), 'HW_STEP_2', 'Cancelar reserva de cama no alojamento e suspender EPI', 'Trabalhador desistiu na etapa de contratação/contrato. Liberar vaga no alojamento e sustar envio de EPI.', 'high', 1, true, 2, false, 'active'),
      (r_emp.id, v_pb_id, COALESCE(v_dep_seg, v_dep_con, v_dep_rh), 'HW_STEP_3', 'Confirmar cancelamento de minuta de contrato e Alta na Seguridade', 'Verificar se havia pedido de Alta ou contrato pendente e confirmar cancelamento.', 'high', 1, true, 3, false, 'active'),
      (r_emp.id, v_pb_id, COALESCE(v_dep_ope, v_dep_com), 'HW_STEP_4', 'Avaliar impacto na data de início do Pedido', 'Caso não haja tempo hábil para reposição antes do início previsto, acionar Prorrogação de Início de Pedido.', 'normal', 1, true, 4, false, 'active')
    ON CONFLICT (playbook_id, code) DO UPDATE
      SET title = EXCLUDED.title,
          description = EXCLUDED.description,
          department_id = EXCLUDED.department_id,
          status = 'active',
          updated_at = NOW();

    -- 2.2 Playbook: WORKER_RESIGNATION (Baixa a Pedido do Trabalhador + Retenção + Carta de Renúncia + Decisão Cliente)
    INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
    VALUES (
      r_emp.id,
      'WORKER_RESIGNATION',
      'Pedido de Demissão / Aviso Prévio (MCS Chat)',
      'worker_resignation',
      'Fluxo iniciado no MCS Chat ou RH: retenção na mesma conversa, assinatura da Carta de Renúncia (15 dias) e consulta ao cliente (Reemplazo vs. Baixa Definitiva).',
      'active'
    )
    ON CONFLICT (empresa_id, code) DO UPDATE
      SET name = EXCLUDED.name,
          solicitud_type = EXCLUDED.solicitud_type,
          description = EXCLUDED.description,
          status = 'active',
          updated_at = NOW()
    RETURNING id INTO v_pb_id;

    INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, status)
    VALUES
      (r_emp.id, v_pb_id, COALESCE(v_dep_rh, v_dep_ope), 'WR_STEP_1', 'Colher Carta de Renúncia no MCS Chat e validar Aviso Prévio (15 dias)', 'Enviar Carta de Renúncia na conversa unificada do MCS Chat e confirmar se cumprirá os 15 dias ou se haverá desconto nas horas finais.', 'urgent', 1, true, 1, false, 'active'),
      (r_emp.id, v_pb_id, COALESCE(v_dep_ope, v_dep_com), 'WR_STEP_2', 'Consultar Cliente: Deseja Substituição (Reemplazo) ou Apenas Baixa?', 'Informar ao cliente que o trabalhador está em aviso prévio e clicar em [Converter em Reemplazo] se precisar repor a vaga, ou [Confirmar Só Baixa].', 'urgent', 1, true, 2, false, 'active'),
      (r_emp.id, v_pb_id, COALESCE(v_dep_seg, v_dep_rh), 'WR_STEP_3', 'Programar Baixa na Seguridad Social para o último dia trabalhado', 'Agendar e processar a baixa na Seguridad Social respeitando a data final do aviso prévio.', 'high', 2, true, 3, false, 'active'),
      (r_emp.id, v_pb_id, COALESCE(v_dep_log, v_dep_ope), 'WR_STEP_4', 'Programar desalojamento (check-out) e recolhimento de EPI', 'Retirar trabalhador do alojamento na data de saída e vistoriar entrega de chaves/EPI.', 'high', 2, true, 4, false, 'active'),
      (r_emp.id, v_pb_id, COALESCE(v_dep_fin, v_dep_ope), 'WR_STEP_5', 'Fechar liquidação final aplicando regra do Aviso Prévio', 'Apurar horas finais e aplicar desconto de aviso prévio caso o trabalhador não tenha cumprido os 15 dias registrados.', 'normal', 3, true, 5, false, 'active')
    ON CONFLICT (playbook_id, code) DO UPDATE
      SET title = EXCLUDED.title,
          description = EXCLUDED.description,
          department_id = EXCLUDED.department_id,
          status = 'active',
          updated_at = NOW();

    -- 2.3 Ativar os Playbooks dos 8 processos operacionais (mantendo NEW_ORDER inativo por padrão para não duplicar a tela nativa de Contratação/Logística)
    UPDATE core_operacoes.playbooks
    SET status = 'active', updated_at = NOW()
    WHERE empresa_id = r_emp.id
      AND code IN (
        'HIRING_WITHDRAWAL',
        'ORDER_POSTPONEMENT',
        'REPLACEMENT',
        'WORKER_RESIGNATION',
        'OFFBOARDING',
        'ORDER_EXTENSION',
        'ORDER_TERMINATION',
        'ORDER_PAUSE',
        'ORDER_CANCELLATION',
        'RELOCATION',
        'TECHNICAL_TEST',
        'FIELD_TRIAL',
        'INCIDENT'
      );

    UPDATE core_operacoes.playbooks
    SET status = 'inactive', updated_at = NOW()
    WHERE empresa_id = r_emp.id
      AND code = 'NEW_ORDER';
  END LOOP;
END $$;

-- 3. Atualizar core_operacoes.iniciar_playbook para preencher automaticamente worker_id, pedido_id e client_id nas tarefas geradas
CREATE OR REPLACE FUNCTION core_operacoes.iniciar_playbook(p_solicitud_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_empresa_id UUID;
    v_tipo VARCHAR;
    v_status VARCHAR;
    v_pedido_id UUID;
    v_client_id UUID;
    v_worker_id UUID;
    v_playbook_id UUID;
    v_playbook_name VARCHAR;
    v_user_id UUID;
    v_inserted INT;
BEGIN
    BEGIN
        v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- 1. Buscar os dados base da solicitud
    SELECT empresa_id, tipo, status, pedido_id, client_id, target_worker_id
    INTO v_empresa_id, v_tipo, v_status, v_pedido_id, v_client_id, v_worker_id
    FROM core_operacoes.solicitudes_operativas
    WHERE id = p_solicitud_id;

    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Solicitud operativa % não encontrada.', p_solicitud_id;
    END IF;

    -- Buscar worker_id e pedido_id do primeiro target se não estiver no cabeçalho
    IF v_worker_id IS NULL OR v_pedido_id IS NULL THEN
        SELECT COALESCE(v_worker_id, source_worker_id, target_worker_id),
               COALESCE(v_pedido_id, source_pedido_id, target_pedido_id),
               COALESCE(v_client_id, source_client_id, target_client_id)
        INTO v_worker_id, v_pedido_id, v_client_id
        FROM core_operacoes.solicitud_targets
        WHERE solicitud_id = p_solicitud_id
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    -- 2. Localizar o playbook ativo correspondente à empresa e ao tipo da solicitud
    SELECT id, name INTO v_playbook_id, v_playbook_name
    FROM core_operacoes.playbooks
    WHERE empresa_id = v_empresa_id 
      AND solicitud_type = v_tipo 
      AND status = 'active'
    LIMIT 1;

    IF v_playbook_id IS NULL THEN
        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id, solicitud_id, event_type, title, description, created_by
        )
        VALUES (
            v_empresa_id, 
            p_solicitud_id, 
            'playbook_warning', 
            'Sem Playbook Ativo', 
            'A solicitação foi registrada, mas o playbook do tipo ' || COALESCE(v_tipo, 'N/A') || ' está inativo.', 
            v_user_id
        );

        IF v_status = 'pending' THEN
            UPDATE core_operacoes.solicitudes_operativas
            SET status = 'in_progress', updated_at = NOW(), updated_by = v_user_id
            WHERE id = p_solicitud_id;
        END IF;

        RETURN;
    END IF;

    -- 3. Inserir as tarefas do Playbook já enriquecidas com worker_id, pedido_id e client_id
    INSERT INTO core_operacoes.solicitud_tareas (
        empresa_id, solicitud_id, playbook_step_id, department_id,
        worker_id, pedido_id, client_id, task_source,
        title, description, priority, due_date, blocking, status, created_by
    )
    SELECT 
        v_empresa_id, 
        p_solicitud_id, 
        ps.id, 
        ps.department_id,
        v_worker_id,
        v_pedido_id,
        v_client_id,
        'playbook',
        ps.title, 
        ps.description, 
        ps.priority, 
        CURRENT_DATE + COALESCE(ps.default_due_days, 1), 
        ps.blocking, 
        CASE WHEN ps.depends_on_step_id IS NULL THEN 'pending' ELSE 'blocked' END,
        v_user_id
    FROM core_operacoes.playbook_steps ps
    WHERE ps.playbook_id = v_playbook_id 
      AND ps.status = 'active'
      AND NOT EXISTS (
          SELECT 1 FROM core_operacoes.solicitud_tareas st 
          WHERE st.solicitud_id = p_solicitud_id AND st.playbook_step_id = ps.id
      )
    ON CONFLICT (empresa_id, solicitud_id, playbook_step_id) WHERE playbook_step_id IS NOT NULL 
    DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    -- 4. Resolver Dependências
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

    IF v_inserted > 0 THEN
        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id, solicitud_id, event_type, title, description, created_by
        )
        VALUES (
            v_empresa_id, p_solicitud_id, 'playbook_started', 'Playbook Iniciado', 'Tarefas distribuídas nos setores usando o playbook: ' || v_playbook_name, v_user_id
        );

        IF v_status = 'pending' THEN
            UPDATE core_operacoes.solicitudes_operativas
            SET status = 'in_progress', updated_at = NOW(), updated_by = v_user_id
            WHERE id = p_solicitud_id;
        END IF;
    END IF;
END;
$function$;

-- 4. RPC para Criar Tarefa Direta / Manual (Substituto do Teams) / Agendamento / IA / MCS Chat
CREATE OR REPLACE FUNCTION core_operacoes.criar_tarefa_direta(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_department_id UUID;
    v_department_code TEXT;
    v_title TEXT;
    v_description TEXT;
    v_priority VARCHAR;
    v_due_date DATE;
    v_scheduled_for TIMESTAMPTZ;
    v_assigned_to UUID;
    v_assigned_to_email TEXT;
    v_assigned_to_name TEXT;
    v_created_by_email TEXT;
    v_created_by_name TEXT;
    v_worker_id UUID;
    v_pedido_id UUID;
    v_client_id UUID;
    v_solicitud_id UUID;
    v_conversation_id UUID;
    v_task_source VARCHAR;
    v_metadata JSONB;
    v_task_id UUID;
BEGIN
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_department_id := NULLIF(payload->>'department_id', '')::uuid;
    v_department_code := UPPER(TRIM(COALESCE(payload->>'department_code', 'OPERACOES')));
    v_title := TRIM(COALESCE(payload->>'title', ''));
    v_description := TRIM(COALESCE(payload->>'description', ''));
    v_priority := COALESCE(NULLIF(payload->>'priority', ''), 'normal');
    v_due_date := COALESCE(NULLIF(payload->>'due_date', '')::date, CURRENT_DATE + 1);
    v_scheduled_for := NULLIF(payload->>'scheduled_for', '')::timestamptz;
    v_assigned_to := NULLIF(payload->>'assigned_to', '')::uuid;
    v_assigned_to_email := NULLIF(TRIM(payload->>'assigned_to_email'), '');
    v_assigned_to_name := NULLIF(TRIM(payload->>'assigned_to_name'), '');
    v_created_by_email := NULLIF(TRIM(payload->>'created_by_email'), '');
    v_created_by_name := NULLIF(TRIM(payload->>'created_by_name'), '');
    v_worker_id := NULLIF(payload->>'worker_id', '')::uuid;
    v_pedido_id := NULLIF(payload->>'pedido_id', '')::uuid;
    v_client_id := NULLIF(payload->>'client_id', '')::uuid;
    v_solicitud_id := NULLIF(payload->>'solicitud_id', '')::uuid;
    v_conversation_id := NULLIF(payload->>'conversation_id', '')::uuid;
    v_task_source := COALESCE(NULLIF(payload->>'task_source', ''), 'manual');
    v_metadata := COALESCE(payload->'metadata', '{}'::jsonb);

    IF v_title = '' THEN
        RAISE EXCEPTION 'O título da tarefa é obrigatório.';
    END IF;

    -- Se empresa_id não veio, tenta deduzir do pedido, trabalhador ou pega a primeira empresa ativa
    IF v_empresa_id IS NULL AND v_pedido_id IS NOT NULL THEN
        SELECT empresa_id, client_id INTO v_empresa_id, v_client_id
        FROM core_comercial.pedidos WHERE id = v_pedido_id;
    END IF;

    IF v_empresa_id IS NULL THEN
        SELECT id INTO v_empresa_id FROM core_common.empresas ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- Resolver department_id em core_common.departments
    IF v_department_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM core_common.departments WHERE id = v_department_id) THEN
            -- Caso tenham enviado um ID de public.mcs_departments, mapeamos pelo nome
            SELECT cd.id INTO v_department_id
            FROM public.mcs_departments md
            JOIN core_common.departments cd ON cd.empresa_id = v_empresa_id
             AND (
               UPPER(cd.name) = UPPER(md.name)
               OR (md.name ILIKE '%Recursos Humanos%' AND cd.code = 'RH')
               OR (md.name ILIKE '%Logística%' AND cd.code = 'LOGISTICA')
               OR (md.name ILIKE '%Financeiro%' AND cd.code = 'FINANCEIRO')
               OR (md.name ILIKE '%Comercial%' AND cd.code = 'COMERCIAL')
               OR (md.name ILIKE '%Documenta%' AND cd.code = 'DOCUMENTACION')
               OR (md.name ILIKE '%Wolters%' AND cd.code = 'SEGURIDAD_SOCIAL')
               OR (md.name ILIKE '%Opera%' AND cd.code = 'OPERACOES')
             )
            WHERE md.id = v_department_id
            LIMIT 1;
        END IF;
    END IF;

    IF v_department_id IS NULL THEN
        SELECT id INTO v_department_id
        FROM core_common.departments
        WHERE empresa_id = v_empresa_id
          AND UPPER(code) = v_department_code
        LIMIT 1;
    END IF;

    IF v_department_id IS NULL THEN
        SELECT id INTO v_department_id
        FROM core_common.departments
        WHERE empresa_id = v_empresa_id
        ORDER BY code ASC
        LIMIT 1;
    END IF;

    -- Se indicou assigned_to mas não email/nome, busca em public.mcs_users
    IF v_assigned_to IS NOT NULL AND (v_assigned_to_email IS NULL OR v_assigned_to_name IS NULL) THEN
        SELECT email, COALESCE(display_name, email)
        INTO v_assigned_to_email, v_assigned_to_name
        FROM public.mcs_users
        WHERE id = v_assigned_to;
    END IF;

    INSERT INTO core_operacoes.solicitud_tareas (
        empresa_id,
        solicitud_id,
        department_id,
        assigned_to,
        assigned_to_email,
        assigned_to_name,
        created_by,
        created_by_email,
        created_by_name,
        worker_id,
        pedido_id,
        client_id,
        conversation_id,
        title,
        description,
        priority,
        status,
        due_date,
        scheduled_for,
        task_source,
        metadata
    ) VALUES (
        v_empresa_id,
        v_solicitud_id,
        v_department_id,
        v_assigned_to,
        v_assigned_to_email,
        v_assigned_to_name,
        v_user_id,
        v_created_by_email,
        v_created_by_name,
        v_worker_id,
        v_pedido_id,
        v_client_id,
        v_conversation_id,
        v_title,
        v_description,
        v_priority,
        'pending',
        COALESCE(v_scheduled_for::date, v_due_date),
        v_scheduled_for,
        v_task_source,
        v_metadata
    )
    RETURNING id INTO v_task_id;

    RETURN jsonb_build_object(
        'success', true,
        'task_id', v_task_id,
        'empresa_id', v_empresa_id,
        'department_id', v_department_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION core_operacoes.criar_tarefa_direta(jsonb) TO authenticated;

-- 5. Atualizar core_personal.cancelar_alocacao_trabalhador (Processo 1: Desistência na Contratação)
--    Para disparar automaticamente a Solicitud 'hiring_withdrawal' + Playbook HIRING_WITHDRAWAL!
CREATE OR REPLACE FUNCTION core_personal.cancelar_alocacao_trabalhador(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_assignment_id UUID;
    v_reason TEXT;
    
    v_has_access BOOLEAN;
    v_worker_id UUID;
    v_worker_nome TEXT;
    v_pedido_item_id UUID;
    v_pedido_id UUID;
    v_client_id UUID;
    v_client_site_id UUID;
    v_empresa_id UUID;
    v_status_anterior VARCHAR;
    v_solicitud_id UUID;
    
    v_pedido_codigo VARCHAR;
    v_total_items INT;
    v_fulfilled_items INT;
    v_new_operational_status VARCHAR;

    v_withdrawal_solicitud_id UUID := gen_random_uuid();
    v_withdrawal_codigo VARCHAR;
    v_solicitudes_count INT;
BEGIN
    v_assignment_id := (payload->>'assignment_id')::uuid;
    v_reason := payload->>'reason';
    
    IF v_assignment_id IS NULL THEN
        RAISE EXCEPTION 'O campo assignment_id é obrigatório.';
    END IF;

    SELECT wa.worker_id, w.nome, wa.pedido_item_id, wa.pedido_id, wa.client_id, wa.client_site_id, wa.empresa_id, wa.status, wa.solicitud_id
    INTO v_worker_id, v_worker_nome, v_pedido_item_id, v_pedido_id, v_client_id, v_client_site_id, v_empresa_id, v_status_anterior, v_solicitud_id
    FROM core_personal.worker_assignments wa
    LEFT JOIN core_personal.workers w ON w.id = wa.worker_id
    WHERE wa.id = v_assignment_id;

    IF v_worker_id IS NULL THEN
        RAISE EXCEPTION 'Alocação não encontrada.';
    END IF;

    IF v_pedido_id IS NOT NULL THEN
        SELECT codigo, COALESCE(v_client_id, client_id), COALESCE(v_client_site_id, client_site_id)
        INTO v_pedido_codigo, v_client_id, v_client_site_id
        FROM core_comercial.pedidos
        WHERE id = v_pedido_id;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM core_common.user_memberships
        WHERE user_id = v_user_id 
          AND empresa_id = v_empresa_id 
          AND is_active = true
          AND role IN ('admin', 'rh', 'super_admin', 'admin_rh', 'operador')
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Acesso negado. Apenas RH ou Operação (Admin) podem cancelar alocações.';
    END IF;

    IF v_status_anterior = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Alocação já está cancelada.');
    END IF;

    -- 1. Atualizar status da alocação para cancelled
    UPDATE core_personal.worker_assignments
    SET status = 'cancelled',
        notes = COALESCE(notes || E'\n', '') || 'Cancelado em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || COALESCE(' - Motivo: ' || v_reason, ' - Desistência do trabalhador')
    WHERE id = v_assignment_id;

    -- 2. Reabrir a vaga correspondente no pedido item
    IF v_status_anterior IN ('planned', 'active', 'paused') AND v_solicitud_id IS NULL AND v_pedido_item_id IS NOT NULL THEN
        UPDATE core_comercial.pedido_items
        SET quantity_fulfilled = GREATEST(0, quantity_fulfilled - 1)
        WHERE id = v_pedido_item_id;
    END IF;

    -- 3. Recalcular o status operacional do Pedido Principal
    IF v_pedido_id IS NOT NULL THEN
        SELECT COUNT(*), COUNT(CASE WHEN quantity_fulfilled >= quantity_requested THEN 1 END)
        INTO v_total_items, v_fulfilled_items
        FROM core_comercial.pedido_items
        WHERE pedido_id = v_pedido_id;

        IF v_fulfilled_items = 0 THEN
            v_new_operational_status := 'pending_operations';
        ELSIF v_fulfilled_items < v_total_items THEN
            v_new_operational_status := 'partially_fulfilled';
        ELSE
            v_new_operational_status := 'fulfilled';
        END IF;

        UPDATE core_comercial.pedidos
        SET operational_status = v_new_operational_status
        WHERE id = v_pedido_id;
    END IF;

    -- 4. Atualizar o cadastro geral do trabalhador
    UPDATE core_personal.workers
    SET status_trabajador = 'Desistiu',
        departure_reason = COALESCE(v_reason, 'Desistência do trabalhador'),
        notes = COALESCE(notes || E'\n', '') || 'Desistiu da contratação em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || COALESCE(': ' || v_reason, '')
    WHERE id = v_worker_id;

    -- 5. Cancelar registros pendentes da Seguridade Social
    UPDATE core_personal.seguridade_status
    SET status = 'cancelado',
        observacoes = COALESCE(observacoes || E'\n', '') || 'Alocação cancelada: ' || COALESCE(v_reason, 'Desistência do trabalhador')
    WHERE worker_id = v_worker_id 
      AND status IN ('pendente', 'erro');

    -- 6. Cancelar contratos pendentes de assinatura vinculados a esta alocação
    UPDATE core_personal.contracts
    SET status = 'cancelled'
    WHERE assignment_id = v_assignment_id 
      AND signed_at IS NULL;

    -- 7. Se a alocação era um reemplazo, reabrir o target
    IF v_solicitud_id IS NOT NULL THEN
        UPDATE core_operacoes.solicitud_targets
        SET status = 'pending',
            target_worker_id = NULL,
            target_assignment_id = NULL,
            updated_at = now()
        WHERE target_assignment_id = v_assignment_id;

        UPDATE core_operacoes.solicitudes_operativas
        SET status = 'in_progress',
            updated_at = now()
        WHERE id = v_solicitud_id;
    END IF;

    -- 8. NOVO: Criar Solicitud Operativa 'hiring_withdrawal' e acionar o Playbook HIRING_WITHDRAWAL
    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      AND (tipo IS NULL OR tipo != 'replacement');

    v_withdrawal_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        pedido_id, pedido_item_id, client_id, client_site_id, target_worker_id, target_assignment_id,
        tipo, title, description, priority, status, reason, due_date, created_by
    ) VALUES (
        v_withdrawal_solicitud_id,
        v_empresa_id,
        v_withdrawal_codigo,
        'rh',
        'worker_assignment',
        v_assignment_id,
        v_pedido_id,
        v_pedido_item_id,
        v_client_id,
        v_client_site_id,
        v_worker_id,
        v_assignment_id,
        'hiring_withdrawal',
        'Desistência na Contratação - ' || COALESCE(v_worker_nome, 'Trabalhador') || COALESCE(' (' || v_pedido_codigo || ')', ''),
        'Trabalhador desistiu na etapa de contratação/assinatura de contrato. Motivo: ' || COALESCE(v_reason, 'Não informado'),
        'urgent',
        'pending',
        v_reason,
        CURRENT_DATE + 1,
        v_user_id
    );

    INSERT INTO core_operacoes.solicitud_targets (
        empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id, source_pedido_item_id,
        source_client_id, source_client_site_id, action_type, status, reason
    ) VALUES (
        v_empresa_id, v_withdrawal_solicitud_id, v_assignment_id, v_worker_id, v_pedido_id, v_pedido_item_id,
        v_client_id, v_client_site_id, 'offboard', 'pending', v_reason
    );

    PERFORM core_operacoes.iniciar_playbook(v_withdrawal_solicitud_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Alocação cancelada e tarefas de desistência distribuídas aos setores.',
        'assignment_id', v_assignment_id,
        'worker_id', v_worker_id,
        'solicitud_id', v_withdrawal_solicitud_id
    );
END;
$function$;

-- 6. Atualizar core_operacoes.processar_adiamento_inicio (Processo 2: Prorrogação de Início)
--    Para criar a Solicitud 'order_postponement' e acionar o Playbook ORDER_POSTPONEMENT!
CREATE OR REPLACE FUNCTION core_operacoes.processar_adiamento_inicio(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_origem_tipo VARCHAR;
    v_origem_id UUID;
    v_nova_data_inicio DATE;
    v_motivo TEXT;
    v_observacoes TEXT;
    
    v_solicitud_id UUID;
    v_solicitud_codigo VARCHAR;
    v_new_postpone_solicitud_id UUID := gen_random_uuid();
    v_new_postpone_codigo VARCHAR;
    v_solicitudes_count INT;
    v_pedido_id UUID;
    v_pedido_codigo VARCHAR;
    v_client_id UUID;
    v_client_site_id UUID;
    v_client_name TEXT;
    v_codigo_ref VARCHAR;
    
    v_workers_updated INT := 0;
    v_cpp_updated INT := 0;
    
    v_dep_rh UUID;
    v_dep_doc UUID;
    v_dep_log UUID;
    v_dep_com UUID;
    v_msg TEXT;
    v_link VARCHAR;
    v_source_assignment_id UUID;
BEGIN
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_origem_tipo := LOWER(TRIM(payload->>'origem_tipo'));
    v_origem_id := (payload->>'origem_id')::uuid;
    v_nova_data_inicio := (payload->>'nova_data_inicio')::date;
    v_motivo := payload->>'motivo';
    v_observacoes := payload->>'observacoes';

    IF v_empresa_id IS NULL OR v_origem_id IS NULL OR v_nova_data_inicio IS NULL THEN
        RAISE EXCEPTION 'empresa_id, origem_id e nova_data_inicio são obrigatórios.';
    END IF;

    IF v_origem_tipo = 'pedido' THEN
        v_pedido_id := v_origem_id;

        SELECT p.codigo, p.client_id, p.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
        INTO v_pedido_codigo, v_client_id, v_client_site_id, v_client_name
        FROM core_comercial.pedidos p
        LEFT JOIN core_common.clients c ON c.id = p.client_id
        WHERE p.id = v_pedido_id;

        IF v_pedido_codigo IS NULL THEN
            RAISE EXCEPTION 'Pedido com ID % não encontrado.', v_pedido_id;
        END IF;

        v_codigo_ref := v_pedido_codigo;

        UPDATE core_comercial.pedidos
        SET expected_start_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE id = v_pedido_id;

        UPDATE core_personal.worker_assignments
        SET planned_start_date = v_nova_data_inicio,
            start_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE pedido_id = v_pedido_id
          AND status != 'terminated';
        
        GET DIAGNOSTICS v_workers_updated = ROW_COUNT;

        UPDATE public.colaborador_por_pedido
        SET fechainiciopedido = v_nova_data_inicio,
            updated_at = NOW()
        WHERE codpedido = v_pedido_codigo;

        GET DIAGNOSTICS v_cpp_updated = ROW_COUNT;
        v_link := '/operacoes/pedidos/' || v_pedido_id;

    ELSIF v_origem_tipo = 'reemplazo' THEN
        v_solicitud_id := v_origem_id;

        SELECT s.codigo, s.pedido_id, s.client_id, s.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
        INTO v_solicitud_codigo, v_pedido_id, v_client_id, v_client_site_id, v_client_name
        FROM core_operacoes.solicitudes_operativas s
        LEFT JOIN core_common.clients c ON c.id = s.client_id
        WHERE s.id = v_solicitud_id AND s.tipo = 'replacement';

        IF v_solicitud_codigo IS NULL THEN
            RAISE EXCEPTION 'Solicitação de Reemplazo com ID % não encontrada.', v_solicitud_id;
        END IF;

        v_codigo_ref := v_solicitud_codigo;

        UPDATE core_operacoes.solicitudes_operativas
        SET due_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE id = v_solicitud_id;

        UPDATE core_personal.worker_assignments
        SET planned_start_date = v_nova_data_inicio,
            start_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE (
            solicitud_id = v_solicitud_id 
            OR id IN (
                SELECT target_assignment_id 
                FROM core_operacoes.solicitud_targets 
                WHERE solicitud_id = v_solicitud_id AND target_assignment_id IS NOT NULL
            )
        )
        AND status != 'terminated';

        GET DIAGNOSTICS v_workers_updated = ROW_COUNT;

        SELECT source_assignment_id INTO v_source_assignment_id
        FROM core_operacoes.solicitud_targets
        WHERE solicitud_id = v_solicitud_id AND source_assignment_id IS NOT NULL
        LIMIT 1;

        IF v_source_assignment_id IS NOT NULL THEN
            UPDATE core_personal.worker_assignments
            SET end_date = (v_nova_data_inicio - 1),
                updated_at = NOW()
            WHERE id = v_source_assignment_id;
        END IF;

        UPDATE public.colaborador_por_pedido
        SET fechainiciopedido = v_nova_data_inicio,
            updated_at = NOW()
        WHERE codpedido = v_solicitud_codigo;

        GET DIAGNOSTICS v_cpp_updated = ROW_COUNT;
        v_link := '/operacoes/solicitudes/' || v_solicitud_id;
    END IF;

    -- Criar Solicitud Operativa 'order_postponement' e disparar Playbook ORDER_POSTPONEMENT
    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      AND (tipo IS NULL OR tipo != 'replacement');

    v_new_postpone_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        pedido_id, client_id, client_site_id, tipo, title, description, priority, status, reason, due_date, created_by
    ) VALUES (
        v_new_postpone_solicitud_id,
        v_empresa_id,
        v_new_postpone_codigo,
        'operacoes',
        v_origem_tipo,
        v_origem_id,
        v_pedido_id,
        v_client_id,
        v_client_site_id,
        'order_postponement',
        'Prorrogação de Início - ' || v_codigo_ref || ' (' || COALESCE(v_client_name, 'Cliente') || ') -> ' || TO_CHAR(v_nova_data_inicio, 'DD/MM/YYYY'),
        COALESCE(v_motivo, '') || CASE WHEN COALESCE(v_observacoes, '') != '' THEN ' | Obs: ' || v_observacoes ELSE '' END,
        'high',
        'pending',
        v_motivo,
        v_nova_data_inicio,
        v_user_id
    );

    IF v_pedido_id IS NOT NULL THEN
        INSERT INTO core_operacoes.solicitud_targets (
            empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id,
            source_client_id, source_client_site_id, action_type, status, reason, notes
        )
        SELECT v_empresa_id, v_new_postpone_solicitud_id, wa.id, wa.worker_id, wa.pedido_id,
               wa.client_id, wa.client_site_id, 'postpone', 'pending', v_motivo, v_observacoes
        FROM core_personal.worker_assignments wa
        WHERE wa.pedido_id = v_pedido_id AND wa.status NOT IN ('cancelled', 'terminated');
    END IF;

    PERFORM core_operacoes.iniciar_playbook(v_new_postpone_solicitud_id);

    -- Notificar departamentos
    SELECT id INTO v_dep_rh FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'RH';
    SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'DOCUMENTACION';
    SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'LOGISTICA';
    SELECT id INTO v_dep_com FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'COMERCIAL';

    v_msg := 'O início de ' || v_codigo_ref || ' (' || v_client_name || ') foi adiado para ' || TO_CHAR(v_nova_data_inicio, 'DD/MM/YYYY') || '. Tarefas operacionais foram geradas para os setores.';

    PERFORM core_common.create_notification(v_empresa_id, v_dep_rh,  NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_doc, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_log, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_com, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);

    RETURN jsonb_build_object(
        'success', true,
        'origem_tipo', v_origem_tipo,
        'codigo_ref', v_codigo_ref,
        'nova_data_inicio', v_nova_data_inicio,
        'solicitud_id', v_new_postpone_solicitud_id,
        'pedido_id', v_pedido_id,
        'workers_assignments_updated', v_workers_updated,
        'cpp_records_updated', v_cpp_updated
    );
END;
$function$;

-- 7. Atualizar core_operacoes.processar_cancelamento_pedido (Processo 8: Cancelamento de Pedido)
--    Para disparar o Playbook ORDER_CANCELLATION nas tarefas dos departamentos!
CREATE OR REPLACE FUNCTION core_operacoes.processar_cancelamento_pedido(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_pedido_id UUID;
    v_motivo TEXT;
    v_observacoes TEXT;
    v_cancel_assignments BOOLEAN;
    v_worker_destination_status VARCHAR;

    v_pedido_codigo VARCHAR;
    v_client_id UUID;
    v_client_site_id UUID;
    v_client_name TEXT;
    v_current_status VARCHAR;

    v_initial_solicitud_id UUID;
    v_initial_solicitud_codigo VARCHAR;
    v_new_solicitud_id UUID := gen_random_uuid();
    v_new_solicitud_codigo VARCHAR;
    v_solicitudes_count INT;

    v_workers_cancelled INT := 0;
    v_tasks_cancelled INT := 0;
    v_items_cancelled INT := 0;

    v_msg TEXT;
    v_link VARCHAR;
    r_assign RECORD;
BEGIN
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_pedido_id := (payload->>'pedido_id')::uuid;
    v_motivo := COALESCE(NULLIF(TRIM(payload->>'motivo'), ''), 'Cancelamento solicitado pelo cliente');
    v_observacoes := COALESCE(NULLIF(TRIM(payload->>'observacoes'), ''), '');
    v_cancel_assignments := COALESCE((payload->>'cancel_assignments')::boolean, true);
    v_worker_destination_status := COALESCE(NULLIF(TRIM(payload->>'worker_destination_status'), ''), 'Disponível');

    IF v_empresa_id IS NULL OR v_pedido_id IS NULL THEN
        RAISE EXCEPTION 'empresa_id e pedido_id são obrigatórios.';
    END IF;

    SELECT p.codigo, p.client_id, p.client_site_id, p.commercial_status, COALESCE(c.trade_name, c.legal_name, 'Cliente')
    INTO v_pedido_codigo, v_client_id, v_client_site_id, v_current_status, v_client_name
    FROM core_comercial.pedidos p
    LEFT JOIN core_common.clients c ON c.id = p.client_id
    WHERE p.id = v_pedido_id;

    IF v_pedido_codigo IS NULL THEN
        RAISE EXCEPTION 'Pedido com ID % não encontrado.', v_pedido_id;
    END IF;

    UPDATE core_comercial.pedidos
    SET commercial_status = 'cancelled',
        operational_status = 'cancelled',
        notes = COALESCE(notes || E'\n', '') || '[CANCELADO EM ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || '] Motivo: ' || v_motivo || CASE WHEN v_observacoes != '' THEN E'\nObs: ' || v_observacoes ELSE '' END,
        updated_at = NOW()
    WHERE id = v_pedido_id;

    UPDATE core_comercial.pedido_items
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE pedido_id = v_pedido_id;
    GET DIAGNOSTICS v_items_cancelled = ROW_COUNT;

    SELECT id, codigo INTO v_initial_solicitud_id, v_initial_solicitud_codigo
    FROM core_operacoes.solicitudes_operativas
    WHERE pedido_id = v_pedido_id AND tipo = 'new_order'
    LIMIT 1;

    IF v_initial_solicitud_id IS NOT NULL THEN
        UPDATE core_operacoes.solicitudes_operativas
        SET status = 'cancelled',
            description = COALESCE(description || E'\n', '') || '[Cancelada em ' || to_char(NOW(), 'DD/MM/YYYY') || ']: ' || v_motivo,
            updated_at = NOW()
        WHERE id = v_initial_solicitud_id;
    END IF;

    UPDATE core_operacoes.solicitud_tareas
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE solicitud_id IN (
        SELECT id FROM core_operacoes.solicitudes_operativas WHERE pedido_id = v_pedido_id
    )
    AND status NOT IN ('completed', 'cancelled');
    GET DIAGNOSTICS v_tasks_cancelled = ROW_COUNT;

    IF v_cancel_assignments THEN
        FOR r_assign IN
            SELECT wa.id AS assignment_id, wa.worker_id
            FROM core_personal.worker_assignments wa
            WHERE wa.pedido_id = v_pedido_id
              AND wa.status NOT IN ('cancelled', 'terminated')
        LOOP
            UPDATE core_personal.worker_assignments
            SET status = 'cancelled',
                notes = COALESCE(notes || E'\n', '') || 'Cancelado em ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || ' - Pedido Cancelado: ' || v_motivo,
                updated_at = NOW()
            WHERE id = r_assign.assignment_id;

            UPDATE core_personal.contracts
            SET status = 'cancelled',
                updated_at = NOW()
            WHERE assignment_id = r_assign.assignment_id
              AND signed_at IS NULL;

            UPDATE core_personal.seguridade_status
            SET status = 'cancelado',
                observacoes = COALESCE(observacoes || E'\n', '') || 'Cancelado por cancelamento do pedido ' || v_pedido_codigo || ': ' || v_motivo,
                updated_at = NOW()
            WHERE worker_id = r_assign.worker_id
              AND status IN ('pendente', 'erro');

            UPDATE core_personal.workers
            SET status_trabajador = CASE 
                    WHEN status_trabajador = 'Desistiu' THEN status_trabajador
                    ELSE COALESCE(v_worker_destination_status, 'Disponível')
                END,
                departure_reason = 'Pedido cancelado pelo cliente: ' || v_motivo,
                notes = COALESCE(notes || E'\n', '') || 'Alocação cancelada por cancelamento do pedido ' || v_pedido_codigo
            WHERE id = r_assign.worker_id
              AND status_trabajador = 'Pendente Ingresso';

            v_workers_cancelled := v_workers_cancelled + 1;
        END LOOP;
    END IF;

    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      AND (tipo IS NULL OR tipo != 'replacement');

    v_new_solicitud_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        tipo, title, description, priority, status, pedido_id, due_date, client_id, client_site_id, reason, created_by
    ) VALUES (
        v_new_solicitud_id,
        v_empresa_id,
        v_new_solicitud_codigo,
        'comercial',
        'pedido',
        v_pedido_id,
        'order_cancellation',
        'Cancelamento de Pedido - ' || v_pedido_codigo || ' - ' || v_client_name,
        'Cancelamento operacional efetuado. Motivo: ' || v_motivo || CASE WHEN v_observacoes != '' THEN E'\nObs: ' || v_observacoes ELSE '' END,
        'urgent',
        'pending',
        v_pedido_id,
        NOW(),
        v_client_id,
        v_client_site_id,
        v_motivo,
        v_user_id
    );

    INSERT INTO core_operacoes.solicitud_targets (
        empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id,
        source_client_id, source_client_site_id, action_type, status, reason, notes
    )
    SELECT 
        v_empresa_id, v_new_solicitud_id, wa.id, wa.worker_id, wa.pedido_id,
        wa.client_id, wa.client_site_id, 'cancel', 'pending', v_motivo, v_observacoes
    FROM core_personal.worker_assignments wa
    WHERE wa.pedido_id = v_pedido_id;

    -- Disparar Playbook de Desmobilização de Cancelamento!
    PERFORM core_operacoes.iniciar_playbook(v_new_solicitud_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pedido cancelado e tarefas de desmobilização criadas nos setores.',
        'pedido_id', v_pedido_id,
        'pedido_codigo', v_pedido_codigo,
        'solicitud_id', v_new_solicitud_id,
        'solicitud_codigo', v_new_solicitud_codigo,
        'workers_cancelled', v_workers_cancelled,
        'tasks_cancelled', v_tasks_cancelled,
        'items_cancelled', v_items_cancelled
    );
END;
$function$;

-- 8. Novo RPC para Prorrogação de Obra (order_extension) e Finalização de Obra (order_termination) (Processos 5 e 6)
CREATE OR REPLACE FUNCTION core_operacoes.processar_prorrogacao_ou_finalizacao_obra(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_pedido_id UUID;
    v_tipo VARCHAR;
    v_nova_data_fim DATE;
    v_motivo TEXT;
    v_observacoes TEXT;

    v_pedido_codigo VARCHAR;
    v_client_id UUID;
    v_client_site_id UUID;
    v_client_name TEXT;

    v_new_solicitud_id UUID := gen_random_uuid();
    v_new_solicitud_codigo VARCHAR;
    v_solicitudes_count INT;
BEGIN
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_pedido_id := (payload->>'pedido_id')::uuid;
    v_tipo := LOWER(TRIM(COALESCE(payload->>'tipo', 'order_extension')));
    v_nova_data_fim := NULLIF(payload->>'nova_data_fim', '')::date;
    v_motivo := COALESCE(NULLIF(TRIM(payload->>'motivo'), ''), 'Solicitação operacional');
    v_observacoes := COALESCE(NULLIF(TRIM(payload->>'observacoes'), ''), '');

    IF v_pedido_id IS NULL THEN
        RAISE EXCEPTION 'O campo pedido_id é obrigatório.';
    END IF;

    SELECT p.codigo, COALESCE(v_empresa_id, p.empresa_id), p.client_id, p.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
    INTO v_pedido_codigo, v_empresa_id, v_client_id, v_client_site_id, v_client_name
    FROM core_comercial.pedidos p
    LEFT JOIN core_common.clients c ON c.id = p.client_id
    WHERE p.id = v_pedido_id;

    IF v_pedido_codigo IS NULL THEN
        RAISE EXCEPTION 'Pedido % não encontrado.', v_pedido_id;
    END IF;

    IF v_tipo = 'order_extension' THEN
        UPDATE core_comercial.pedidos
        SET expected_end_date = COALESCE(v_nova_data_fim, expected_end_date),
            updated_at = NOW()
        WHERE id = v_pedido_id;

        IF v_nova_data_fim IS NOT NULL THEN
            UPDATE core_personal.worker_assignments
            SET planned_end_date = v_nova_data_fim,
                updated_at = NOW()
            WHERE pedido_id = v_pedido_id
              AND status IN ('active', 'planned');
        END IF;
    ELSIF v_tipo = 'order_termination' THEN
        UPDATE core_comercial.pedidos
        SET expected_end_date = COALESCE(v_nova_data_fim, CURRENT_DATE),
            commercial_status = 'completed',
            operational_status = 'completed',
            updated_at = NOW()
        WHERE id = v_pedido_id;
    END IF;

    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      AND (tipo IS NULL OR tipo != 'replacement');

    v_new_solicitud_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        tipo, title, description, priority, status, pedido_id, due_date, client_id, client_site_id, reason, created_by
    ) VALUES (
        v_new_solicitud_id,
        v_empresa_id,
        v_new_solicitud_codigo,
        'operacoes',
        'pedido',
        v_pedido_id,
        v_tipo,
        CASE WHEN v_tipo = 'order_extension'
             THEN 'Prorrogação de Obra - ' || v_pedido_codigo || ' (' || v_client_name || ')'
             ELSE 'Finalização de Obra - ' || v_pedido_codigo || ' (' || v_client_name || ')'
        END,
        v_motivo || CASE WHEN v_observacoes != '' THEN ' | Obs: ' || v_observacoes ELSE '' END,
        'high',
        'pending',
        v_pedido_id,
        COALESCE(v_nova_data_fim, CURRENT_DATE),
        v_client_id,
        v_client_site_id,
        v_motivo,
        v_user_id
    );

    INSERT INTO core_operacoes.solicitud_targets (
        empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id,
        source_client_id, source_client_site_id, action_type, status, reason, notes
    )
    SELECT
        v_empresa_id, v_new_solicitud_id, wa.id, wa.worker_id, wa.pedido_id,
        wa.client_id, wa.client_site_id,
        CASE WHEN v_tipo = 'order_extension' THEN 'extend' ELSE 'offboard' END,
        'pending', v_motivo, v_observacoes
    FROM core_personal.worker_assignments wa
    WHERE wa.pedido_id = v_pedido_id
      AND wa.status NOT IN ('cancelled', 'terminated');

    PERFORM core_operacoes.iniciar_playbook(v_new_solicitud_id);

    RETURN jsonb_build_object(
        'success', true,
        'solicitud_id', v_new_solicitud_id,
        'solicitud_codigo', v_new_solicitud_codigo,
        'pedido_id', v_pedido_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION core_operacoes.processar_prorrogacao_ou_finalizacao_obra(jsonb) TO authenticated;

-- 9. Novo RPC para Processo 4: Iniciar Baixa por Iniciativa do Trabalhador (Retenção + Carta de Renúncia + Aviso Prévio)
--    e Decidir se o Cliente quer Reemplazo ou Apenas Baixa!
CREATE OR REPLACE FUNCTION core_operacoes.iniciar_baixa_trabalhador_chat(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_worker_id UUID;
    v_worker_nome TEXT;
    v_conversation_id UUID;
    v_empresa_id UUID;
    v_assignment_id UUID;
    v_pedido_id UUID;
    v_pedido_item_id UUID;
    v_client_id UUID;
    v_client_site_id UUID;
    v_job_function_id UUID;
    v_job_function_name VARCHAR;
    v_cumpre_15_dias BOOLEAN;
    v_ultimo_dia DATE;
    v_desconto_horas BOOLEAN;
    v_motivo TEXT;
    v_observacoes TEXT;
    v_solicitud_id UUID := gen_random_uuid();
    v_solicitud_codigo VARCHAR;
    v_solicitudes_count INT;
    v_meta JSONB;
BEGIN
    v_worker_id := (payload->>'worker_id')::uuid;
    v_conversation_id := NULLIF(payload->>'conversation_id', '')::uuid;
    v_empresa_id := NULLIF(payload->>'empresa_id', '')::uuid;
    v_cumpre_15_dias := COALESCE((payload->>'cumpre_15_dias')::boolean, true);
    v_ultimo_dia := COALESCE(NULLIF(payload->>'ultimo_dia_trabalhado', '')::date, CURRENT_DATE + CASE WHEN v_cumpre_15_dias THEN 15 ELSE 0 END);
    v_desconto_horas := COALESCE((payload->>'aplicar_desconto_horas')::boolean, NOT v_cumpre_15_dias);
    v_motivo := COALESCE(NULLIF(TRIM(payload->>'motivo'), ''), 'Solicitação de saída pelo trabalhador (Carta de Renúncia)');
    v_observacoes := COALESCE(NULLIF(TRIM(payload->>'observacoes'), ''), '');

    IF v_worker_id IS NULL THEN
        RAISE EXCEPTION 'O campo worker_id é obrigatório.';
    END IF;

    SELECT nome INTO v_worker_nome FROM core_personal.workers WHERE id = v_worker_id;

    -- Buscar alocação ativa do trabalhador
    SELECT wa.id, wa.empresa_id, wa.pedido_id, wa.pedido_item_id, wa.client_id, wa.client_site_id, wa.job_function_id, wa.job_function_name_snapshot
    INTO v_assignment_id, v_empresa_id, v_pedido_id, v_pedido_item_id, v_client_id, v_client_site_id, v_job_function_id, v_job_function_name
    FROM core_personal.worker_assignments wa
    WHERE wa.worker_id = v_worker_id
      AND wa.status IN ('active', 'planned')
    ORDER BY wa.created_at DESC
    LIMIT 1;

    IF v_empresa_id IS NULL THEN
        SELECT id INTO v_empresa_id FROM core_common.empresas ORDER BY created_at ASC LIMIT 1;
    END IF;

    v_meta := jsonb_build_object(
        'cumpre_15_dias', v_cumpre_15_dias,
        'ultimo_dia_trabalhado', v_ultimo_dia,
        'aplicar_desconto_horas', v_desconto_horas,
        'conversation_id', v_conversation_id,
        'decisao_cliente_pendente', true
    );

    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      AND (tipo IS NULL OR tipo != 'replacement');

    v_solicitud_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        pedido_id, pedido_item_id, client_id, client_site_id, target_worker_id, target_assignment_id,
        tipo, title, description, priority, status, reason, due_date, pergunta_respuesta, created_by
    ) VALUES (
        v_solicitud_id,
        v_empresa_id,
        v_solicitud_codigo,
        'mcs_chat',
        'worker',
        v_worker_id,
        v_pedido_id,
        v_pedido_item_id,
        v_client_id,
        v_client_site_id,
        v_worker_id,
        v_assignment_id,
        'worker_resignation',
        'Pedido de Saída / Aviso Prévio - ' || COALESCE(v_worker_nome, 'Trabalhador'),
        'Saída solicitada pelo trabalhador. Cumpre 15 dias: ' || CASE WHEN v_cumpre_15_dias THEN 'SIM' ELSE 'NÃO (Aplicar desconto)' END ||
        ' | Último dia: ' || TO_CHAR(v_ultimo_dia, 'DD/MM/YYYY') || ' | Motivo: ' || v_motivo,
        'urgent',
        'pending',
        v_motivo,
        v_ultimo_dia,
        v_meta,
        v_user_id
    );

    INSERT INTO core_operacoes.solicitud_targets (
        empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id, source_pedido_item_id,
        source_client_id, source_client_site_id, target_job_function_id, target_job_function_name,
        action_type, status, reason, notes
    ) VALUES (
        v_empresa_id, v_solicitud_id, v_assignment_id, v_worker_id, v_pedido_id, v_pedido_item_id,
        v_client_id, v_client_site_id, v_job_function_id, v_job_function_name,
        'offboard', 'pending', v_motivo, v_observacoes
    );

    PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);

    -- Enriquecer as tarefas geradas com o conversation_id e metadata do aviso prévio
    UPDATE core_operacoes.solicitud_tareas
    SET conversation_id = v_conversation_id,
        metadata = v_meta
    WHERE solicitud_id = v_solicitud_id;

    RETURN jsonb_build_object(
        'success', true,
        'solicitud_id', v_solicitud_id,
        'solicitud_codigo', v_solicitud_codigo,
        'ultimo_dia_trabalhado', v_ultimo_dia
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION core_operacoes.iniciar_baixa_trabalhador_chat(jsonb) TO authenticated;

-- 10. RPC para Decisão do Cliente na Baixa do Trabalhador: Converter em Reemplazo OU Confirmar Só Baixa
CREATE OR REPLACE FUNCTION core_operacoes.decidir_baixa_cliente(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_solicitud_id UUID;
    v_task_id UUID;
    v_decisao VARCHAR; -- 'reemplazo' ou 'baixa_definitiva'
    v_s RECORD;
    v_t RECORD;
    v_reemplazo_id UUID;
BEGIN
    v_solicitud_id := NULLIF(payload->>'solicitud_id', '')::uuid;
    v_task_id := NULLIF(payload->>'task_id', '')::uuid;
    v_decisao := LOWER(TRIM(COALESCE(payload->>'decisao', 'baixa_definitiva')));

    IF v_solicitud_id IS NULL AND v_task_id IS NOT NULL THEN
        SELECT solicitud_id INTO v_solicitud_id FROM core_operacoes.solicitud_tareas WHERE id = v_task_id;
    END IF;

    SELECT * INTO v_s FROM core_operacoes.solicitudes_operativas WHERE id = v_solicitud_id;
    IF v_s.id IS NULL THEN
        RAISE EXCEPTION 'Solicitação não encontrada.';
    END IF;

    SELECT * INTO v_t FROM core_operacoes.solicitud_targets WHERE solicitud_id = v_solicitud_id LIMIT 1;

    -- Concluir a tarefa de consulta ao cliente se informada
    IF v_task_id IS NOT NULL THEN
        UPDATE core_operacoes.solicitud_tareas
        SET status = 'completed',
            completed_at = NOW(),
            resolution_notes = CASE WHEN v_decisao = 'reemplazo' THEN 'Cliente solicitou Substituição (Convertido em Reemplazo)' ELSE 'Cliente confirmou apenas Baixa (sem reposição)' END,
            updated_at = NOW()
        WHERE id = v_task_id;
    END IF;

    IF v_decisao = 'reemplazo' THEN
        -- Criar automaticamente o Reemplazo abrindo a vaga na Contratação Inicial!
        v_reemplazo_id := core_operacoes.criar_solicitud_operativa_com_targets(
            jsonb_build_object(
                'empresa_id', v_s.empresa_id,
                'origin_pedido_id', v_s.pedido_id,
                'type', 'replacement',
                'title', 'Reemplazo (Aviso Prévio) - ' || v_s.title,
                'description', 'Gerado a partir de pedido de demissão/aviso prévio após confirmação do cliente.',
                'priority', 'urgent',
                'due_date', COALESCE(v_s.due_date, CURRENT_DATE + 15),
                'client_id', v_s.client_id,
                'client_site_id', v_s.client_site_id,
                'targets', jsonb_build_array(
                    jsonb_build_object(
                        'source_assignment_id', v_t.source_assignment_id,
                        'source_worker_id', v_t.source_worker_id,
                        'source_pedido_id', v_t.source_pedido_id,
                        'source_pedido_item_id', v_t.source_pedido_item_id,
                        'source_client_id', v_t.source_client_id,
                        'source_client_site_id', v_t.source_client_site_id,
                        'target_client_id', v_t.source_client_id,
                        'target_client_site_id', v_t.source_client_site_id,
                        'target_job_function_id', v_t.target_job_function_id,
                        'target_job_function_name', v_t.target_job_function_name,
                        'requires_replacement', true,
                        'action_type', 'replace',
                        'reason', v_s.reason,
                        'notes', 'Substituição por pedido de saída do trabalhador'
                    )
                )
            )
        );
    END IF;

    UPDATE core_operacoes.solicitudes_operativas
    SET pergunta_respuesta = COALESCE(pergunta_respuesta, '{}'::jsonb) || jsonb_build_object(
        'decisao_cliente_pendente', false,
        'decisao_cliente', v_decisao,
        'reemplazo_solicitud_id', v_reemplazo_id
    ),
    updated_at = NOW()
    WHERE id = v_solicitud_id;

    RETURN jsonb_build_object(
        'success', true,
        'decisao', v_decisao,
        'reemplazo_solicitud_id', v_reemplazo_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION core_operacoes.decidir_baixa_cliente(jsonb) TO authenticated;

-- 11. RPC para Radar Preventivo D-10 (Processo 5 & 6: Verifica obras que vencem nos próximos 10 dias)
CREATE OR REPLACE FUNCTION core_operacoes.verificar_radar_d10_pedidos(p_empresa_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    r_ped RECORD;
    v_dep_ope UUID;
    v_created INT := 0;
BEGIN
    FOR r_ped IN
        SELECT p.id, p.empresa_id, p.codigo, p.client_id, p.expected_end_date,
               COALESCE(c.trade_name, c.legal_name, 'Cliente') AS client_name
        FROM core_comercial.pedidos p
        LEFT JOIN core_common.clients c ON c.id = p.client_id
        WHERE (p_empresa_id IS NULL OR p.empresa_id = p_empresa_id)
          AND p.operational_status NOT IN ('cancelled', 'completed')
          AND p.expected_end_date IS NOT NULL
          AND p.expected_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 10)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM core_operacoes.solicitud_tareas st
            WHERE st.pedido_id = r_ped.id
              AND st.task_source = 'radar_d10'
              AND st.status NOT IN ('cancelled')
        ) THEN
            SELECT id INTO v_dep_ope
            FROM core_common.departments
            WHERE empresa_id = r_ped.empresa_id AND code IN ('OPERACOES', 'COMERCIAL')
            ORDER BY CASE WHEN code = 'OPERACOES' THEN 1 ELSE 2 END
            LIMIT 1;

            IF v_dep_ope IS NOT NULL THEN
                INSERT INTO core_operacoes.solicitud_tareas (
                    empresa_id, department_id, pedido_id, client_id,
                    title, description, priority, status, due_date, task_source, metadata
                ) VALUES (
                    r_ped.empresa_id,
                    v_dep_ope,
                    r_ped.id,
                    r_ped.client_id,
                    'Radar D-10: Obra ' || r_ped.codigo || ' (' || r_ped.client_name || ') encerra em ' || TO_CHAR(r_ped.expected_end_date, 'DD/MM/YYYY'),
                    'Contatar o cliente preventivamente para definir se haverá Prorrogação de Obra (renovação de alojamento) ou Finalização de Obra (desmobilização e resgate de fiança).',
                    'high',
                    'pending',
                    r_ped.expected_end_date - 2,
                    'radar_d10',
                    jsonb_build_object(
                        'expected_end_date', r_ped.expected_end_date,
                        'pedido_codigo', r_ped.codigo,
                        'client_name', r_ped.client_name
                    )
                );
                v_created := v_created + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'alerts_created', v_created);
END;
$function$;

GRANT EXECUTE ON FUNCTION core_operacoes.verificar_radar_d10_pedidos(uuid) TO authenticated;
