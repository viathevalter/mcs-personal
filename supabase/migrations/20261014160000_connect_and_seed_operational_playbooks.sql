-- ========================================================================================
-- MIGRATION: CONNECT & SEED OPERATIONAL PLAYBOOKS ACROSS ALL EMPRESAS
-- Description:
-- 1. Updates RLS policies on core_operacoes.playbooks and core_operacoes.playbook_steps
-- 2. Creates SECURITY DEFINER RPCs to manage Playbooks and Playbook Steps (with group-wide sync)
-- 3. Ensures all empresas have the 8 standard departments
-- 4. Seeds/updates all 13 operational Playbooks and their departmental steps (initially inactive
--    so no automatic tasks are generated while the user analyzes/validates each workflow)
-- ========================================================================================

BEGIN;

-- 1. Atualizar Políticas RLS de playbooks e playbook_steps
DROP POLICY IF EXISTS "Manage playbooks" ON core_operacoes.playbooks;
DROP POLICY IF EXISTS "Update playbooks" ON core_operacoes.playbooks;
DROP POLICY IF EXISTS "Delete playbooks" ON core_operacoes.playbooks;
DROP POLICY IF EXISTS "View playbooks if member" ON core_operacoes.playbooks;

CREATE POLICY "View playbooks if member" ON core_operacoes.playbooks
    FOR SELECT USING (core_common.is_member(empresa_id));

CREATE POLICY "Manage playbooks" ON core_operacoes.playbooks
    FOR INSERT WITH CHECK (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    );

CREATE POLICY "Update playbooks" ON core_operacoes.playbooks
    FOR UPDATE USING (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    ) WITH CHECK (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    );

CREATE POLICY "Delete playbooks" ON core_operacoes.playbooks
    FOR DELETE USING (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    );

DROP POLICY IF EXISTS "Manage playbook_steps" ON core_operacoes.playbook_steps;
DROP POLICY IF EXISTS "Update playbook_steps" ON core_operacoes.playbook_steps;
DROP POLICY IF EXISTS "Delete playbook_steps" ON core_operacoes.playbook_steps;
DROP POLICY IF EXISTS "View playbook_steps if member" ON core_operacoes.playbook_steps;

CREATE POLICY "View playbook_steps if member" ON core_operacoes.playbook_steps
    FOR SELECT USING (core_common.is_member(empresa_id));

CREATE POLICY "Manage playbook_steps" ON core_operacoes.playbook_steps
    FOR INSERT WITH CHECK (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    );

CREATE POLICY "Update playbook_steps" ON core_operacoes.playbook_steps
    FOR UPDATE USING (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    ) WITH CHECK (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    );

CREATE POLICY "Delete playbook_steps" ON core_operacoes.playbook_steps
    FOR DELETE USING (
        core_common.has_role(empresa_id, 'super_admin')
        OR core_common.has_role(empresa_id, 'admin')
        OR core_common.has_role(empresa_id, 'operador')
        OR core_common.has_role(empresa_id, 'admin_rh')
    );

-- 2. RPC: Salvar / Atualizar Playbook (com sincronização entre empresas por code)
CREATE OR REPLACE FUNCTION core_operacoes.salvar_playbook(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id uuid := (payload->>'id')::uuid;
    v_empresa_id uuid := (payload->>'empresa_id')::uuid;
    v_code varchar := UPPER(TRIM(COALESCE(payload->>'code', '')));
    v_name varchar := TRIM(COALESCE(payload->>'name', 'Novo Playbook'));
    v_solicitud_type varchar := TRIM(COALESCE(payload->>'solicitud_type', 'incident'));
    v_description text := COALESCE(payload->>'description', '');
    v_status varchar := COALESCE(payload->>'status', 'inactive');
    v_sync_all boolean := COALESCE((payload->>'sync_all')::boolean, true);
    v_old_code varchar;
    v_emp record;
    v_result_id uuid;
BEGIN
    IF v_id IS NOT NULL THEN
        SELECT code, empresa_id INTO v_old_code, v_empresa_id
        FROM core_operacoes.playbooks
        WHERE id = v_id;
    END IF;

    IF v_code = '' THEN
        IF v_old_code IS NOT NULL THEN
            v_code := v_old_code;
        ELSE
            v_code := UPPER(REGEXP_REPLACE(v_solicitud_type, '[^a-zA-Z0-9]+', '_', 'g')) || '_' || SUBSTRING(gen_random_uuid()::text FROM 1 FOR 4);
        END IF;
    END IF;

    IF v_sync_all THEN
        FOR v_emp IN SELECT id FROM core_common.empresas LOOP
            IF v_old_code IS NOT NULL THEN
                UPDATE core_operacoes.playbooks
                SET code = v_code,
                    name = v_name,
                    solicitud_type = v_solicitud_type,
                    description = v_description,
                    status = v_status,
                    updated_at = NOW()
                WHERE empresa_id = v_emp.id AND code = v_old_code;

                IF NOT FOUND THEN
                    INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
                    VALUES (v_emp.id, v_code, v_name, v_solicitud_type, v_description, v_status)
                    ON CONFLICT (empresa_id, code) DO UPDATE
                    SET name = EXCLUDED.name,
                        solicitud_type = EXCLUDED.solicitud_type,
                        description = EXCLUDED.description,
                        status = EXCLUDED.status,
                        updated_at = NOW();
                END IF;
            ELSE
                INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
                VALUES (v_emp.id, v_code, v_name, v_solicitud_type, v_description, v_status)
                ON CONFLICT (empresa_id, code) DO UPDATE
                SET name = EXCLUDED.name,
                    solicitud_type = EXCLUDED.solicitud_type,
                    description = EXCLUDED.description,
                    status = EXCLUDED.status,
                    updated_at = NOW();
            END IF;
        END LOOP;
    ELSE
        IF v_id IS NOT NULL THEN
            UPDATE core_operacoes.playbooks
            SET code = v_code,
                name = v_name,
                solicitud_type = v_solicitud_type,
                description = v_description,
                status = v_status,
                updated_at = NOW()
            WHERE id = v_id;
        ELSE
            INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
            VALUES (v_empresa_id, v_code, v_name, v_solicitud_type, v_description, v_status)
            ON CONFLICT (empresa_id, code) DO UPDATE
            SET name = EXCLUDED.name,
                solicitud_type = EXCLUDED.solicitud_type,
                description = EXCLUDED.description,
                status = EXCLUDED.status,
                updated_at = NOW();
        END IF;
    END IF;

    SELECT id INTO v_result_id
    FROM core_operacoes.playbooks
    WHERE empresa_id = v_empresa_id AND code = v_code
    LIMIT 1;

    RETURN jsonb_build_object('id', v_result_id, 'code', v_code, 'status', v_status);
END;
$$;

-- 3. RPC: Salvar / Atualizar Passo do Playbook (com sincronização entre empresas)
CREATE OR REPLACE FUNCTION core_operacoes.salvar_playbook_step(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_step_id uuid := NULLIF(payload->>'id', '')::uuid;
    v_playbook_id uuid := (payload->>'playbook_id')::uuid;
    v_department_id uuid := NULLIF(payload->>'department_id', '')::uuid;
    v_department_code varchar := NULLIF(TRIM(payload->>'department_code'), '');
    v_title varchar := TRIM(COALESCE(payload->>'title', 'Nova Tarefa'));
    v_description text := COALESCE(payload->>'description', '');
    v_priority varchar := COALESCE(payload->>'priority', 'normal');
    v_default_due_days int := COALESCE((payload->>'default_due_days')::int, 1);
    v_blocking boolean := COALESCE((payload->>'blocking')::boolean, false);
    v_required boolean := COALESCE((payload->>'required')::boolean, true);
    v_depends_on_step_id uuid := NULLIF(payload->>'depends_on_step_id', '')::uuid;
    v_sync_all boolean := COALESCE((payload->>'sync_all')::boolean, true);

    v_pb_code varchar;
    v_empresa_id uuid;
    v_step_code varchar;
    v_depends_on_code varchar;
    v_sort_order int;
    v_target_pb record;
    v_target_dept_id uuid;
    v_target_dep_step_id uuid;
    v_saved_id uuid;
BEGIN
    SELECT code, empresa_id INTO v_pb_code, v_empresa_id
    FROM core_operacoes.playbooks
    WHERE id = v_playbook_id;

    IF v_pb_code IS NULL THEN
        RAISE EXCEPTION 'Playbook não encontrado.';
    END IF;

    IF v_department_code IS NULL AND v_department_id IS NOT NULL THEN
        SELECT code INTO v_department_code
        FROM core_common.departments
        WHERE id = v_department_id;
    END IF;

    IF v_depends_on_step_id IS NOT NULL THEN
        SELECT code INTO v_depends_on_code
        FROM core_operacoes.playbook_steps
        WHERE id = v_depends_on_step_id;
    END IF;

    IF v_step_id IS NOT NULL THEN
        SELECT code, sort_order INTO v_step_code, v_sort_order
        FROM core_operacoes.playbook_steps
        WHERE id = v_step_id;
    END IF;

    IF v_step_code IS NULL OR v_step_code = '' THEN
        v_step_code := UPPER(SUBSTRING(v_pb_code FROM 1 FOR 3)) || '_' || UPPER(SUBSTRING(COALESCE(v_department_code, 'GEN') FROM 1 FOR 3)) || '_' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 4));
    END IF;

    IF v_sort_order IS NULL THEN
        SELECT COALESCE(MAX(sort_order), 0) + 10 INTO v_sort_order
        FROM core_operacoes.playbook_steps
        WHERE playbook_id = v_playbook_id AND status = 'active';
    END IF;

    FOR v_target_pb IN
        SELECT id, empresa_id
        FROM core_operacoes.playbooks
        WHERE code = v_pb_code
          AND (v_sync_all = true OR id = v_playbook_id)
    LOOP
        SELECT id INTO v_target_dept_id
        FROM core_common.departments
        WHERE empresa_id = v_target_pb.empresa_id
          AND code = v_department_code
        LIMIT 1;

        IF v_target_dept_id IS NULL THEN
            SELECT id INTO v_target_dept_id
            FROM core_common.departments
            WHERE empresa_id = v_target_pb.empresa_id
            LIMIT 1;
        END IF;

        v_target_dep_step_id := NULL;
        IF v_depends_on_code IS NOT NULL THEN
            SELECT id INTO v_target_dep_step_id
            FROM core_operacoes.playbook_steps
            WHERE playbook_id = v_target_pb.id
              AND code = v_depends_on_code
            LIMIT 1;
        END IF;

        INSERT INTO core_operacoes.playbook_steps (
            empresa_id, playbook_id, department_id, code, title, description,
            priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status
        ) VALUES (
            v_target_pb.empresa_id, v_target_pb.id, v_target_dept_id, v_step_code, v_title, v_description,
            v_priority, v_default_due_days, v_required, v_sort_order, v_blocking, v_target_dep_step_id, 'active'
        )
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            priority = EXCLUDED.priority,
            default_due_days = EXCLUDED.default_due_days,
            required = EXCLUDED.required,
            blocking = EXCLUDED.blocking,
            depends_on_step_id = EXCLUDED.depends_on_step_id,
            status = 'active',
            updated_at = NOW();
    END LOOP;

    SELECT id INTO v_saved_id
    FROM core_operacoes.playbook_steps
    WHERE playbook_id = v_playbook_id AND code = v_step_code
    LIMIT 1;

    RETURN jsonb_build_object('id', v_saved_id, 'code', v_step_code);
END;
$$;

-- 4. RPC: Remover / Desativar Passo do Playbook (com tratamento seguro de FK)
CREATE OR REPLACE FUNCTION core_operacoes.remover_playbook_step(p_step_id uuid, p_sync_all boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pb_code varchar;
    v_step_code varchar;
    v_playbook_id uuid;
    v_target_step record;
    v_has_tasks boolean;
BEGIN
    SELECT ps.code, ps.playbook_id, p.code
    INTO v_step_code, v_playbook_id, v_pb_code
    FROM core_operacoes.playbook_steps ps
    JOIN core_operacoes.playbooks p ON p.id = ps.playbook_id
    WHERE ps.id = p_step_id;

    IF v_step_code IS NULL THEN
        RETURN;
    END IF;

    FOR v_target_step IN
        SELECT ps.id, ps.playbook_id
        FROM core_operacoes.playbook_steps ps
        JOIN core_operacoes.playbooks p ON p.id = ps.playbook_id
        WHERE ps.code = v_step_code
          AND p.code = v_pb_code
          AND (p_sync_all = true OR ps.id = p_step_id)
    LOOP
        -- Limpar dependência em outros passos que apontem para este
        UPDATE core_operacoes.playbook_steps
        SET depends_on_step_id = NULL
        WHERE depends_on_step_id = v_target_step.id;

        -- Verificar se já existem tarefas geradas apontando para este passo
        SELECT EXISTS (
            SELECT 1 FROM core_operacoes.solicitud_tareas
            WHERE playbook_step_id = v_target_step.id
        ) INTO v_has_tasks;

        IF v_has_tasks THEN
            UPDATE core_operacoes.playbook_steps
            SET status = 'inactive', updated_at = NOW()
            WHERE id = v_target_step.id;
        ELSE
            DELETE FROM core_operacoes.playbook_steps
            WHERE id = v_target_step.id;
        END IF;
    END LOOP;
END;
$$;

-- 5. RPC: Reordenar Passos do Playbook
CREATE OR REPLACE FUNCTION core_operacoes.reordenar_playbook_steps(p_playbook_id uuid, p_ordered_step_codes text[], p_sync_all boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pb_code varchar;
    v_idx int;
    v_code text;
BEGIN
    SELECT code INTO v_pb_code
    FROM core_operacoes.playbooks
    WHERE id = p_playbook_id;

    IF v_pb_code IS NULL THEN
        RETURN;
    END IF;

    FOR v_idx IN 1.. COALESCE(array_length(p_ordered_step_codes, 1), 0) LOOP
        v_code := p_ordered_step_codes[v_idx];
        UPDATE core_operacoes.playbook_steps ps
        SET sort_order = v_idx * 10,
            updated_at = NOW()
        FROM core_operacoes.playbooks p
        WHERE ps.playbook_id = p.id
          AND p.code = v_pb_code
          AND ps.code = v_code
          AND (p_sync_all = true OR p.id = p_playbook_id);
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION core_operacoes.salvar_playbook(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION core_operacoes.salvar_playbook_step(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION core_operacoes.remover_playbook_step(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION core_operacoes.reordenar_playbook_steps(uuid, text[], boolean) TO authenticated;

-- 6. Garantir os 8 Departamentos Padrão e os 13 Playbooks Operacionais em TODAS as empresas
DO $$
DECLARE
    v_emp RECORD;
    v_dep_com UUID;
    v_dep_con UUID;
    v_dep_doc UUID;
    v_dep_fin UUID;
    v_dep_log UUID;
    v_dep_ope UUID;
    v_dep_rh  UUID;
    v_dep_ss  UUID;

    v_pb_id UUID;
    v_step_anchor UUID;
    v_step_anchor_2 UUID;
BEGIN
    FOR v_emp IN SELECT id, nome, codigo FROM core_common.empresas LOOP
        -- 6.1 Garantir Departamentos Padrão na empresa
        INSERT INTO core_common.departments (empresa_id, code, name, status)
        VALUES
            (v_emp.id, 'COMERCIAL',        'Comercial',                'active'),
            (v_emp.id, 'CONTRATOS',        'Gestão de Contratos',      'active'),
            (v_emp.id, 'DOCUMENTACION',    'Documentação',             'active'),
            (v_emp.id, 'FINANCEIRO',       'Financeiro / Faturamento', 'active'),
            (v_emp.id, 'LOGISTICA',        'Logística e Frota',        'active'),
            (v_emp.id, 'OPERACOES',        'Operações',                'active'),
            (v_emp.id, 'RH',               'Recursos Humanos',         'active'),
            (v_emp.id, 'SEGURIDAD_SOCIAL', 'Seguridad Social',         'active')
        ON CONFLICT (empresa_id, code) DO UPDATE SET status = 'active';

        SELECT id INTO v_dep_com FROM core_common.departments WHERE empresa_id = v_emp.id AND code = 'COMERCIAL';
        SELECT id INTO v_dep_con FROM core_common.departments WHERE empresa_id = v_emp.id AND code = 'CONTRATOS';
        SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = v_emp.id AND code = 'DOCUMENTACION';
        SELECT id INTO v_dep_fin FROM core_common.departments WHERE empresa_id = v_emp.id AND code = 'FINANCEIRO';
        SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = v_emp.id AND code = 'LOGISTICA';
        SELECT id INTO v_dep_ope FROM core_common.departments WHERE empresa_id = v_emp.id AND code = 'OPERACOES';
        SELECT id INTO v_dep_rh  FROM core_common.departments WHERE empresa_id = v_emp.id AND code = 'RH';
        SELECT id INTO v_dep_ss  FROM core_common.departments WHERE empresa_id = v_emp.id AND code = 'SEGURIDAD_SOCIAL';

        -- ============================================================================
        -- 1. NEW_ORDER (Novo Pedido / Mobilização Inicial)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'NEW_ORDER', 'Novo Pedido / Mobilização Inicial', 'new_order', 'Fluxo completo de mobilização entre Comercial, RH, Documentação, Logística, Financeiro e Operações ao aprovar um novo pedido.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_com, 'NO_COM_01', 'Validar condições finais e requisitos do pedido', 'Conferir tarifas, funções, jornada, alojamento e data de início acordada com o cliente.', 'normal', 1, true, 10, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'NO_RH_01',  'Selecionar e alocar trabalhadores nas vagas do pedido', 'Recrutar/selecionar os colaboradores adequados para cada função e confirmar disponibilidade para a data de início.', 'high', 3, true, 20, true, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        SELECT id INTO v_step_anchor FROM core_operacoes.playbook_steps WHERE playbook_id = v_pb_id AND code = 'NO_RH_01';

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_doc, 'NO_DOC_01', 'Emitir contratos, termos e enviar documentação CAE/Plataformas', 'Preparar contratos de trabalho, alta na Seguridad Social e subir documentação na plataforma do cliente (Obralia/Nalanda/etc).', 'high', 2, true, 30, true, v_step_anchor, 'active'),
            (v_emp.id, v_pb_id, v_dep_log, 'NO_LOG_01', 'Reservar alojamento, organizar transporte e separar EPIs', 'Garantir vaga em alojamento próximo à obra, programar deslocamento e entregar kit de EPIs/ferramentas.', 'high', 2, true, 40, true, v_step_anchor, 'active'),
            (v_emp.id, v_pb_id, v_dep_fin, 'NO_FIN_01', 'Registrar centro de custo e previsão de faturamento', 'Configurar parâmetros financeiros do pedido, validar adiantamentos e programar faturamento.', 'normal', 1, true, 50, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_ope, 'NO_OPE_01', 'Confirmar chegada e início efetivo dos trabalhadores na obra', 'Validar apresentação da equipe no cliente na data de início planejada.', 'high', 1, true, 60, false, v_step_anchor, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, depends_on_step_id = EXCLUDED.depends_on_step_id, status = 'active';

        -- ============================================================================
        -- 2. OFFBOARDING (Baja / Desligamento de Trabalhador)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'OFFBOARDING', 'Baja / Desligamento de Trabalhador', 'offboarding', 'Fluxo departamental de desligamento: aviso ao trabalhador, saída do alojamento e recolha de EPIs (Logística), baixa na Seguridad Social (Documentação/RH) e acerto financeiro.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_rh, 'OFF_RH_01', 'Comunicar formalmente o trabalhador sobre a baixa e confirmar data de saída', 'Avisar o colaborador sobre o encerramento/desligamento (especialmente quando solicitado pelo cliente) e alinhar saída da obra.', 'urgent', 0, true, 10, true, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        SELECT id INTO v_step_anchor FROM core_operacoes.playbook_steps WHERE playbook_id = v_pb_id AND code = 'OFF_RH_01';

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_log, 'OFF_LOG_01', 'Retirar trabalhador do alojamento (check-out), cancelar transporte e recolher EPIs', 'Liberar vaga no alojamento, recolher chaves, vistoriar quarto, suspender transporte e recolher EPIs/ferramentas da empresa.', 'high', 1, true, 20, false, v_step_anchor, 'active'),
            (v_emp.id, v_pb_id, v_dep_doc, 'OFF_DOC_01', 'Tramitar baixa na Seguridad Social e emitir documentos de desligamento', 'Processar baixa oficial na Seguridad Social dentro do prazo legal e arquivar carta/termo de baixa.', 'urgent', 1, true, 30, false, v_step_anchor, 'active'),
            (v_emp.id, v_pb_id, v_dep_fin, 'OFF_FIN_01', 'Apurar horas finais trabalhadas, descontos e calcular finiquito / faturamento', 'Conferir folha de horas até o último dia trabalhado, descontos de alojamento/adiantamentos e fechar acerto financeiro.', 'high', 2, true, 40, false, v_step_anchor, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, depends_on_step_id = EXCLUDED.depends_on_step_id, status = 'active';

        SELECT id INTO v_step_anchor_2 FROM core_operacoes.playbook_steps WHERE playbook_id = v_pb_id AND code = 'OFF_FIN_01';

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_rh, 'OFF_RH_02', 'Encerrar alocação (assignment) e atualizar status do trabalhador', 'Finalizar vínculo na vaga do pedido e atualizar disponibilidade/status no cadastro geral.', 'normal', 1, true, 50, false, v_step_anchor_2, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, depends_on_step_id = EXCLUDED.depends_on_step_id, status = 'active';

        -- ============================================================================
        -- 3. REPLACEMENT (Novo Reemplazo / Substituição)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'REPLACEMENT', 'Reemplazo / Substituição de Trabalhador', 'replacement', 'Fluxo completo para substituir um trabalhador em obra integrando Comercial, RH, Documentação, Logística e Operações.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_com, 'REP_COM_01', 'Registrar motivo da substituição e alinhar prazo com o cliente', 'Confirmar perfil exigido e data limite para apresentação do substituto na obra.', 'high', 1, true, 10, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'REP_RH_01',  'Selecionar e aprovar trabalhador substituto', 'Buscar colaborador disponível com a qualificação exigida para assumir a vaga.', 'urgent', 2, true, 20, true, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        SELECT id INTO v_step_anchor FROM core_operacoes.playbook_steps WHERE playbook_id = v_pb_id AND code = 'REP_RH_01';

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_doc, 'REP_DOC_01', 'Emitir contrato do substituto e liberar acesso documental à obra', 'Gerar contrato, alta na Seguridad Social e enviar documentação para liberação de entrada.', 'high', 1, true, 30, true, v_step_anchor, 'active'),
            (v_emp.id, v_pb_id, v_dep_log, 'REP_LOG_01', 'Transferir/reservar vaga no alojamento, transporte e entregar EPIs', 'Reaproveitar ou reservar cama no alojamento da equipe, organizar viagem e entregar EPIs ao substituto.', 'high', 1, true, 40, true, v_step_anchor, 'active'),
            (v_emp.id, v_pb_id, v_dep_ope, 'REP_OPE_01', 'Confirmar apresentação do substituto na obra', 'Validar chegada do novo colaborador e passagem de posto junto ao encarregado/cliente.', 'high', 1, true, 50, true, v_step_anchor, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, depends_on_step_id = EXCLUDED.depends_on_step_id, status = 'active';

        SELECT id INTO v_step_anchor_2 FROM core_operacoes.playbook_steps WHERE playbook_id = v_pb_id AND code = 'REP_OPE_01';

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_rh, 'REP_RH_02', 'Encerrar alocação anterior e ativar alocação do substituto', 'Garantir que o histórico de alocação reflita a data exata de saída do titular e entrada do substituto.', 'normal', 1, true, 60, false, v_step_anchor_2, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, depends_on_step_id = EXCLUDED.depends_on_step_id, status = 'active';

        -- ============================================================================
        -- 4. RELOCATION (Nova Reubicación / Realocação)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'RELOCATION', 'Reubicación / Realocação de Obra', 'relocation', 'Fluxo de transferência de trabalhador entre obras ou clientes com ajuste de contrato, alojamento e centro de custo.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_ope, 'REL_OPE_01', 'Validar nova obra/local de destino e data de transferência', 'Confirmar com o cliente de destino e encarregado a data de chegada e função do trabalhador realocado.', 'high', 1, true, 10, true, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        SELECT id INTO v_step_anchor FROM core_operacoes.playbook_steps WHERE playbook_id = v_pb_id AND code = 'REL_OPE_01';

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_doc, 'REL_DOC_01', 'Emitir aditivo/ajuste contratual e atualizar documentação da nova obra', 'Preparar anexo de mudança de centro de trabalho e submeter documentos na plataforma do novo cliente.', 'high', 2, true, 20, true, v_step_anchor, 'active'),
            (v_emp.id, v_pb_id, v_dep_log, 'REL_LOG_01', 'Transferir alojamento (check-out origem / check-in destino) e transporte', 'Baixar vaga no alojamento antigo, reservar alojamento na nova localidade e coordenar deslocamento.', 'high', 2, true, 30, true, v_step_anchor, 'active'),
            (v_emp.id, v_pb_id, v_dep_fin, 'REL_FIN_01', 'Atualizar centro de custo, tarifa e alocação de faturamento', 'Refletir a mudança de cliente/obra para o fechamento de horas e faturamento.', 'normal', 1, true, 40, false, v_step_anchor, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, depends_on_step_id = EXCLUDED.depends_on_step_id, status = 'active';

        SELECT id INTO v_step_anchor_2 FROM core_operacoes.playbook_steps WHERE playbook_id = v_pb_id AND code = 'REL_LOG_01';

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_rh, 'REL_RH_01', 'Comunicar trabalhador e atualizar registro de alocação na nova obra', 'Confirmar aceite do trabalhador, encerrar assignment anterior e ativar o novo assignment.', 'normal', 1, true, 50, false, v_step_anchor_2, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, depends_on_step_id = EXCLUDED.depends_on_step_id, status = 'active';

        -- ============================================================================
        -- 5. TECHNICAL_TEST (Nova Prueba / Teste Técnico)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'TECHNICAL_TEST', 'Prueba Técnica / Teste Técnico', 'technical_test', 'Fluxo de agendamento, convocação, logística e avaliação de teste técnico solicitado pelo cliente.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_com, 'TT_COM_01', 'Confirmar requisitos técnicos, data e local da prova com o cliente', 'Detalhar tipo de solda/montagem/teste exigido, endereço e responsável por avaliar no cliente.', 'normal', 1, true, 10, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'TT_RH_01',  'Selecionar e convocar candidatos para a prova técnica', 'Confirmar presença dos candidatos selecionados e orientar sobre horário e documentos.', 'high', 2, true, 20, true, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        SELECT id INTO v_step_anchor FROM core_operacoes.playbook_steps WHERE playbook_id = v_pb_id AND code = 'TT_RH_01';

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_ope, 'TT_OPE_01', 'Coordenar transporte/EPIs e acompanhar realização da prova técnica', 'Garantir que o candidato disponha de EPIs/transporte para o teste e acompanhar execução.', 'high', 2, true, 30, true, v_step_anchor, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, depends_on_step_id = EXCLUDED.depends_on_step_id, status = 'active';

        SELECT id INTO v_step_anchor_2 FROM core_operacoes.playbook_steps WHERE playbook_id = v_pb_id AND code = 'TT_OPE_01';

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_doc, 'TT_DOC_01', 'Registrar laudo/resultado oficial da prova técnica', 'Arquivar parecer técnico ou certificado de homologação emitido após o teste.', 'normal', 1, true, 40, true, v_step_anchor_2, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'TT_RH_02',  'Dar retorno ao candidato e iniciar contratação dos aprovados', 'Comunicar resultado e encaminhar candidatos aprovados para alocação no pedido.', 'high', 1, true, 50, false, v_step_anchor_2, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, depends_on_step_id = EXCLUDED.depends_on_step_id, status = 'active';

        -- ============================================================================
        -- 6. FIELD_TRIAL (Prueba en Obra / Teste Prático em Obra)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'FIELD_TRIAL', 'Prueba en Obra / Teste Prático em Obra', 'field_trial', 'Fluxo para período de avaliação prática em obra com documentação prévia, logística e validação de faturamento.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_ope, 'FT_OPE_01', 'Alinhar período e condições do teste prático em obra', 'Definir duração do teste em campo e responsável pela avaliação no cliente.', 'normal', 1, true, 10, true, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        SELECT id INTO v_step_anchor FROM core_operacoes.playbook_steps WHERE playbook_id = v_pb_id AND code = 'FT_OPE_01';

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_doc, 'FT_DOC_01', 'Garantir alta e documentação obrigatória para entrada em obra', 'Providenciar alta na Seguridad Social e documentos de prevenção exigidos para acesso.', 'high', 1, true, 20, true, v_step_anchor, 'active'),
            (v_emp.id, v_pb_id, v_dep_log, 'FT_LOG_01', 'Providenciar transporte e EPIs para o período de prova', 'Garantir deslocamento e equipamentos de proteção para os dias de avaliação.', 'normal', 1, true, 30, false, v_step_anchor, 'active'),
            (v_emp.id, v_pb_id, v_dep_fin, 'FT_FIN_01', 'Validar se o período de prova será faturado ao cliente', 'Confirmar acordo comercial sobre cobrança das horas realizadas no teste.', 'normal', 2, true, 40, false, v_step_anchor, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'FT_RH_02',  'Confirmar aprovação final e efetivar alocação do trabalhador', 'Validar feedback do cliente ao término do teste e confirmar continuidade.', 'high', 1, true, 50, false, v_step_anchor, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, depends_on_step_id = EXCLUDED.depends_on_step_id, status = 'active';

        -- ============================================================================
        -- 7. ORDER_POSTPONEMENT (Adiamento de Início de Obra)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'ORDER_POSTPONEMENT', 'Adiamento de Início de Obra', 'order_postponement', 'Fluxo de comunicação e reprogramação em cadeia (RH, Documentação, Logística e Financeiro) quando a data de início de um pedido ou substituição é adiada.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_rh,  'PST_RH_01',  'Comunicar trabalhadores alocados sobre a nova data de início', 'Avisar imediatamente todos os colaboradores vinculados para evitar deslocamento prematuro e confirmar disponibilidade.', 'urgent', 1, true, 10, true, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_log, 'PST_LOG_01', 'Remarcar reservas de alojamento e reprogramar transporte', 'Ajustar datas de check-in nos alojamentos e passagens para evitar diárias ociosas.', 'high', 1, true, 20, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_doc, 'PST_DOC_01', 'Reajustar data de início nos contratos e alta na Seguridad Social', 'Atualizar minutas contratuais, trâmite de alta na Seguridad Social e validade nas plataformas CAE.', 'high', 1, true, 30, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_log, 'PST_ALM_01', 'Reprogramar despacho de EPIs e ferramentas no armazém', 'Ajustar cronograma de entrega de materiais conforme a nova data de início.', 'normal', 2, true, 40, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'PST_RH_02',  'Formalizar aceite da nova data com toda a equipe mobilizada', 'Confirmar que nenhum trabalhador desistiu devido ao adiamento ou abrir reposição preventiva.', 'high', 1, true, 50, false, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        -- ============================================================================
        -- 8. ORDER_PAUSE (Pausa de Pedido)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'ORDER_PAUSE', 'Pausa de Pedido', 'order_pause', 'Fluxo para congelamento imediato de contratações, altas na Seguridad Social e reservas logísticas quando um pedido entra em pausa.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_rh,  'PAU_RH_01',  'Comunicar trabalhadores alocados sobre a pausa e suspensão do início', 'Notificar colaboradores já selecionados e avaliar realocação em outras obras ativas.', 'urgent', 1, true, 10, true, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_doc, 'PAU_DP_01',  'Suspender trâmite de envio de Alta na Seguridad Social e contratos', 'Travar emissões contratuais e altas pendentes até nova ordem.', 'urgent', 1, true, 20, true, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'PAU_REC_01', 'Congelar seleção e contratação para as vagas restantes deste pedido', 'Pausar divulgação e entrevistas exclusivas para este pedido.', 'high', 1, true, 30, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_log, 'PAU_LOG_01', 'Suspender reservas de alojamento, passagens e despachos de EPI', 'Cancelar ou congelar bloqueios de hospedagem e transporte para evitar custos.', 'high', 1, true, 40, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_com, 'PAU_COM_01', 'Acompanhar alinhamento com cliente para definição de retomada ou cancelamento', 'Manter follow-up comercial periódico sobre a previsão de reabertura da obra.', 'normal', 3, true, 50, false, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        -- ============================================================================
        -- 9. ORDER_EXTENSION (Prorrogação de Obra)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'ORDER_EXTENSION', 'Prorrogação de Obra', 'order_extension', 'Fluxo de renovação de prazo da obra: confirmação com trabalhadores, aditivos contratuais, extensão de alojamento e ajuste financeiro.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_com, 'EXT_COM_01', 'Confirmar condições e nova data final de prorrogação com o cliente', 'Validar novo prazo estimado de término e manutenção das tarifas.', 'high', 1, true, 10, true, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_con, 'EXT_CON_01', 'Emitir aditivo contratual de prorrogação', 'Formalizar extensão contratual e atualizar documentação de permanência em obra.', 'high', 2, true, 20, true, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_log, 'EXT_LOG_01', 'Prorrogar reservas de alojamento e transporte contratados', 'Renovar estadia nos alojamentos e locação de veículos pelo novo período da obra.', 'high', 2, true, 30, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'EXT_RH_01',  'Confirmar continuidade dos trabalhadores alocados ou programar substituições', 'Consultar equipe em obra sobre permanência até a nova data final.', 'high', 2, true, 40, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_fin, 'EXT_FIN_01', 'Ajustar previsão de faturamento e custos pelo período prorrogado', 'Atualizar projeção financeira do pedido.', 'normal', 1, true, 50, false, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        -- ============================================================================
        -- 10. ORDER_TERMINATION (Finalização de Obra)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'ORDER_TERMINATION', 'Finalização / Desmobilização de Obra', 'order_termination', 'Fluxo de encerramento de obra: desmobilização de trabalhadores (realocação ou baixa), entrega de alojamentos, fechamento de horas e faturamento final.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_ope, 'TRM_OPE_01', 'Confirmar data final e plano de desmobilização da obra', 'Validar término dos trabalhos em campo junto ao cliente.', 'high', 1, true, 10, true, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'TRM_RH_01',  'Definir destino dos colaboradores (realocação para outra obra ou baixa)', 'Programar transferência para novos pedidos ou iniciar desligamento (offboarding).', 'high', 2, true, 20, true, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_log, 'TRM_LOG_01', 'Encerrar alojamentos (check-out), devolver veículos e recolher EPIs/ferramentas', 'Fazer vistoria de entrega dos imóveis, encerrar contratos de aluguel e recolher equipamentos.', 'high', 2, true, 30, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_fin, 'TRM_FIN_01', 'Validar folha final de horas (Cierre de Horas) e processar faturamento final', 'Garantir apuração de todas as horas trabalhadas e emitir fatura de encerramento.', 'high', 2, true, 40, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_con, 'TRM_CON_01', 'Encerrar contrato comercial e arquivar pasta da obra', 'Concluir obrigações contratuais e arquivar documentação.', 'normal', 1, true, 50, false, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        -- ============================================================================
        -- 11. ORDER_CANCELLATION (Cancelamento de Pedido)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'ORDER_CANCELLATION', 'Cancelamento de Pedido', 'order_cancellation', 'Fluxo de desmobilização imediata por cancelamento de pedido: aviso aos trabalhadores, anulação de altas/contratos, cancelamento de alojamento e apuração de custos.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_com, 'CAN_COM_01', 'Registrar motivo formal do cancelamento e alinhar eventuais custos com cliente', 'Documentar cancelamento do pedido e verificar ressarcimento de despesas de mobilização.', 'high', 1, true, 10, true, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'CAN_RH_01',  'Comunicar trabalhadores alocados e redirecioná-los para outras vagas', 'Avisar imediatamente os colaboradores e priorizar alocação em outros pedidos abertos.', 'urgent', 1, true, 20, true, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_doc, 'CAN_DOC_01', 'Anular altas na Seguridad Social e cancelar contratos pendentes', 'Reverter trâmites de contratação e remover acessos em plataformas.', 'urgent', 1, true, 30, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_log, 'CAN_LOG_01', 'Cancelar reservas de alojamento, passagens e recolher EPIs entregues', 'Estornar reservas logísticas e recuperar materiais já disponibilizados.', 'high', 1, true, 40, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_fin, 'CAN_FIN_01', 'Baixar previsão de faturamento e apurar custos incorridos', 'Encerrar centro de custo do pedido cancelado.', 'normal', 2, true, 50, false, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        -- ============================================================================
        -- 12. SCOPE_CHANGE (Alteração de Escopo / Aditivo)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'SCOPE_CHANGE', 'Alteração de Escopo / Aditivo de Pedido', 'scope_change', 'Fluxo para alterações de escopo, vagas ou funções dentro de um pedido ativo.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_com, 'SCO_COM_01', 'Registrar alteração de escopo e aceite comercial do cliente', 'Formalizar novas quantidades, funções ou condições.', 'high', 1, true, 10, true, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_fin, 'SCO_FIN_01', 'Revisar impacto em faturamento e margem do pedido', 'Atualizar projeções financeiras conforme novo escopo.', 'normal', 2, true, 20, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_ope, 'SCO_OPE_01', 'Ajustar demanda operacional da obra', 'Alinhar cronograma de campo com a alteração solicitada.', 'normal', 1, true, 30, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'SCO_RH_01',  'Ajustar seleção e alocação de trabalhadores conforme novo escopo', 'Providenciar reforço de equipe ou remanejamento.', 'high', 2, true, 40, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_doc, 'SCO_DOC_01', 'Emitir aditivo contratual e atualizar documentação', 'Formalizar documentação complementar.', 'normal', 2, true, 50, false, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

        -- ============================================================================
        -- 13. INCIDENT (Incidência Operacional / Disciplinar)
        -- ============================================================================
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, description, status)
        VALUES (v_emp.id, 'INCIDENT', 'Incidência Operacional / Falta ou Conduta', 'incident', 'Fluxo para tratamento de ocorrências em obra (faltas injustificadas, conduta, segurança) articulado entre Operações, RH, Logística e Financeiro.', 'inactive')
        ON CONFLICT (empresa_id, code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'inactive'
        RETURNING id INTO v_pb_id;

        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, description, priority, default_due_days, required, sort_order, blocking, depends_on_step_id, status)
        VALUES
            (v_emp.id, v_pb_id, v_dep_ope, 'INC_OPE_01', 'Registrar ocorrência em obra e alinhar impacto imediato com o cliente', 'Levantar detalhes da falta/incidente junto ao encarregado e verificar se o cliente exige substituição.', 'urgent', 0, true, 10, true, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_rh,  'INC_RH_01',  'Contatar trabalhador envolvido, apurar justificativa e aplicar medida disciplinar', 'Notificar colaborador, registrar advertência/justificativa ou encaminhar para Baja (Desligamento).', 'urgent', 1, true, 20, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_log, 'INC_LOG_01', 'Verificar situação do trabalhador no alojamento e transporte', 'Checar presença no alojamento ou providenciar liberação da vaga em caso de afastamento.', 'high', 1, true, 30, false, NULL, 'active'),
            (v_emp.id, v_pb_id, v_dep_fin, 'INC_FIN_01', 'Registrar descontos de faltas ou avarias na apuração de horas', 'Garantir que dias não trabalhados ou danos sejam refletidos no fechamento financeiro.', 'normal', 2, true, 40, false, NULL, 'active')
        ON CONFLICT (playbook_id, code) DO UPDATE
        SET department_id = EXCLUDED.department_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, sort_order = EXCLUDED.sort_order, blocking = EXCLUDED.blocking, status = 'active';

    END LOOP;

    -- Desativar passos legados duplicados de FIELD_TRIAL para manter paridade em todas as empresas
    UPDATE core_operacoes.playbook_steps
    SET status = 'inactive'
    WHERE code IN ('FT_RH_01', 'FT_COM_01');
END $$;

COMMIT;
