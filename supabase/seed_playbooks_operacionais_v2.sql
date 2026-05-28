-- ========================================================================================
-- SEED SCRIPT: DEPARTAMENTOS E PLAYBOOKS (V2)
-- Objetivo: Inicializar os dados base da Engine de Playbooks do Bloco 4 (MCS Comercial).
-- Regras de Execução:
-- 1. Este script é IDEMPOTENTE. Pode ser executado múltiplas vezes.
-- 2. Ele NÃO DELETA dados e não recria usuários.
-- 3. Para rodar para uma empresa específica, altere a variável `v_empresa_codigo` no INÍCIO.
-- ========================================================================================

DO $$ 
DECLARE
    -- ==========================================
    -- CONFIGURAÇÃO INICIAL (AJUSTE AQUI)
    -- ==========================================
    v_empresa_codigo VARCHAR := 'Kotrik & Rosas'; -- Substitua pelo nome exato da empresa (ex: 'Kotrik & Rosas')
    
    v_empresa_id UUID;

    -- Variáveis de Departament IDs
    v_dep_comercial UUID;
    v_dep_rh UUID;
    v_dep_doc UUID;
    v_dep_log UUID;
    v_dep_fin UUID;
    v_dep_op UUID;
    v_dep_cont UUID;
    v_dep_seg UUID;

    -- Variáveis de Playbook IDs
    v_pb_new_order UUID;
    v_pb_technical_test UUID;
    v_pb_field_trial UUID;
    v_pb_replacement UUID;
    v_pb_relocation UUID;
    v_pb_offboarding UUID;
    v_pb_scope_change UUID;

BEGIN
    -- ====================================================================================
    -- 1. IDENTIFICA A EMPRESA ALVO
    -- ====================================================================================
    -- Buscando apenas pelo 'nome', já que a coluna 'trade_name' ainda não existe no seu DEV
    SELECT id INTO v_empresa_id FROM core_common.empresas WHERE nome = v_empresa_codigo LIMIT 1;
    
    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Empresa com nome "%" não encontrada.', v_empresa_codigo;
    END IF;

    -- ====================================================================================
    -- 2. SEED DEPARTMENTS
    -- ====================================================================================
    INSERT INTO core_common.departments (empresa_id, code, name, status)
    VALUES 
        (v_empresa_id, 'COMERCIAL', 'Comercial', 'active'),
        (v_empresa_id, 'RH', 'Recursos Humanos', 'active'),
        (v_empresa_id, 'DOCUMENTACION', 'Documentação', 'active'),
        (v_empresa_id, 'LOGISTICA', 'Logística e Frota', 'active'),
        (v_empresa_id, 'FINANCEIRO', 'Financeiro / Faturamento', 'active'),
        (v_empresa_id, 'OPERACOES', 'Operações', 'active'),
        (v_empresa_id, 'CONTRATOS', 'Gestão de Contratos', 'active'),
        (v_empresa_id, 'SEGURIDAD_SOCIAL', 'Seguridad Social', 'active')
    ON CONFLICT (empresa_id, code) DO UPDATE 
    SET name = EXCLUDED.name, status = EXCLUDED.status;

    -- Captura os IDs gerados/existentes
    SELECT id INTO v_dep_comercial FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'COMERCIAL';
    SELECT id INTO v_dep_rh FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'RH';
    SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'DOCUMENTACION';
    SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'LOGISTICA';
    SELECT id INTO v_dep_fin FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'FINANCEIRO';
    SELECT id INTO v_dep_op FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'OPERACOES';
    SELECT id INTO v_dep_cont FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'CONTRATOS';
    SELECT id INTO v_dep_seg FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'SEGURIDAD_SOCIAL';

    -- ====================================================================================
    -- 3. SEED PLAYBOOKS
    -- ====================================================================================
    INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, status)
    VALUES
        (v_empresa_id, 'NEW_ORDER', 'Nuevo Pedido / New Order', 'new_order', 'active'),
        (v_empresa_id, 'TECHNICAL_TEST', 'Prueba Técnica / Technical Test', 'technical_test', 'active'),
        (v_empresa_id, 'FIELD_TRIAL', 'Prueba en Obra / Field Trial', 'field_trial', 'active'),
        (v_empresa_id, 'REPLACEMENT', 'Reemplazo / Replacement', 'replacement', 'active'),
        (v_empresa_id, 'RELOCATION', 'Reubicación / Relocation', 'relocation', 'active'),
        (v_empresa_id, 'OFFBOARDING', 'Baja / Offboarding', 'offboarding', 'active'),
        (v_empresa_id, 'SCOPE_CHANGE', 'Cambio de Alcance / Scope Change', 'scope_change', 'active')
    ON CONFLICT (empresa_id, code) DO UPDATE 
    SET name = EXCLUDED.name, solicitud_type = EXCLUDED.solicitud_type, status = EXCLUDED.status;

    -- Captura os IDs dos Playbooks
    SELECT id INTO v_pb_new_order FROM core_operacoes.playbooks WHERE empresa_id = v_empresa_id AND code = 'NEW_ORDER';
    SELECT id INTO v_pb_technical_test FROM core_operacoes.playbooks WHERE empresa_id = v_empresa_id AND code = 'TECHNICAL_TEST';
    SELECT id INTO v_pb_field_trial FROM core_operacoes.playbooks WHERE empresa_id = v_empresa_id AND code = 'FIELD_TRIAL';
    SELECT id INTO v_pb_replacement FROM core_operacoes.playbooks WHERE empresa_id = v_empresa_id AND code = 'REPLACEMENT';
    SELECT id INTO v_pb_relocation FROM core_operacoes.playbooks WHERE empresa_id = v_empresa_id AND code = 'RELOCATION';
    SELECT id INTO v_pb_offboarding FROM core_operacoes.playbooks WHERE empresa_id = v_empresa_id AND code = 'OFFBOARDING';
    SELECT id INTO v_pb_scope_change FROM core_operacoes.playbooks WHERE empresa_id = v_empresa_id AND code = 'SCOPE_CHANGE';

    -- ====================================================================================
    -- 4. SEED PLAYBOOK STEPS (FASE 1: SEM DEPENDÊNCIAS DE PASSOS)
    -- ====================================================================================

    -- 4.1. NEW ORDER (Nuevo Pedido)
    INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, sort_order, required, blocking, default_due_days, status)
    VALUES
        (v_empresa_id, v_pb_new_order, v_dep_comercial, 'NO_COM_01', 'Validar condições finais do pedido', 10, true, false, 1, 'active'),
        (v_empresa_id, v_pb_new_order, v_dep_rh,        'NO_RH_01',  'Selecionar trabalhadores para as vagas', 20, true, true,  3, 'active'),
        (v_empresa_id, v_pb_new_order, v_dep_doc,       'NO_DOC_01', 'Preparar documentação de contratação', 30, true, true,  2, 'active'),
        (v_empresa_id, v_pb_new_order, v_dep_cont,      'NO_CON_01', 'Emitir contratos dos trabalhadores',   40, true, true,  2, 'active'),
        (v_empresa_id, v_pb_new_order, v_dep_log,       'NO_LOG_01', 'Preparar alojamento/transporte/EPIs',  50, true, true,  2, 'active'),
        (v_empresa_id, v_pb_new_order, v_dep_fin,       'NO_FIN_01', 'Registrar previsão de faturamento',    60, true, false, 1, 'active'),
        (v_empresa_id, v_pb_new_order, v_dep_op,        'NO_OPE_01', 'Confirmar início na obra',             70, true, false, 1, 'active')
    ON CONFLICT (playbook_id, code) DO UPDATE SET 
        title = EXCLUDED.title, department_id = EXCLUDED.department_id, sort_order = EXCLUDED.sort_order,
        priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, required = EXCLUDED.required,
        blocking = EXCLUDED.blocking, status = EXCLUDED.status;

    -- 4.2. TECHNICAL TEST (Prueba Técnica)
    INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, sort_order, required, blocking, default_due_days, status)
    VALUES
        (v_empresa_id, v_pb_technical_test, v_dep_comercial, 'TT_COM_01', 'Confirmar necessidade da prova com o cliente', 10, true, false, 1, 'active'),
        (v_empresa_id, v_pb_technical_test, v_dep_rh,        'TT_RH_01',  'Selecionar candidato para prova',              20, true, true,  3, 'active'),
        (v_empresa_id, v_pb_technical_test, v_dep_op,        'TT_OPE_01', 'Agendar/aplicar prova técnica',                30, true, true,  2, 'active'),
        (v_empresa_id, v_pb_technical_test, v_dep_doc,       'TT_DOC_01', 'Registrar resultado da prova',                 40, true, true,  1, 'active'),
        (v_empresa_id, v_pb_technical_test, v_dep_rh,        'TT_RH_02',  'Aprovar ou reprovar candidato',                50, true, false, 1, 'active')
    ON CONFLICT (playbook_id, code) DO UPDATE SET 
        title = EXCLUDED.title, department_id = EXCLUDED.department_id, sort_order = EXCLUDED.sort_order,
        priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, required = EXCLUDED.required,
        blocking = EXCLUDED.blocking, status = EXCLUDED.status;

    -- 4.3. FIELD TRIAL (Prueba en Obra)
    INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, sort_order, required, blocking, default_due_days, status)
    VALUES
        (v_empresa_id, v_pb_field_trial, v_dep_op,        'FT_OPE_01', 'Acompanhar teste em obra',             10, true, true,  5, 'active'),
        (v_empresa_id, v_pb_field_trial, v_dep_rh,        'FT_RH_01',  'Validar continuidade do trabalhador',  20, true, true,  1, 'active'),
        (v_empresa_id, v_pb_field_trial, v_dep_comercial, 'FT_COM_01', 'Confirmar aceite do cliente',          30, true, false, 1, 'active'),
        (v_empresa_id, v_pb_field_trial, v_dep_fin,       'FT_FIN_01', 'Validar se período será faturado',     40, true, false, 2, 'active'),
        (v_empresa_id, v_pb_field_trial, v_dep_rh,        'FT_RH_02',  'Confirmar status final do trabalhador',50, true, false, 1, 'active')
    ON CONFLICT (playbook_id, code) DO UPDATE SET 
        title = EXCLUDED.title, department_id = EXCLUDED.department_id, sort_order = EXCLUDED.sort_order,
        priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, required = EXCLUDED.required,
        blocking = EXCLUDED.blocking, status = EXCLUDED.status;

    -- 4.4. REPLACEMENT (Reemplazo)
    INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, sort_order, required, blocking, default_due_days, status)
    VALUES
        (v_empresa_id, v_pb_replacement, v_dep_comercial, 'REP_COM_01', 'Registrar motivo e comunicar cliente',      10, true, false, 1, 'active'),
        (v_empresa_id, v_pb_replacement, v_dep_rh,        'REP_RH_01',  'Selecionar trabalhador substituto',         20, true, true,  3, 'active'),
        (v_empresa_id, v_pb_replacement, v_dep_doc,       'REP_DOC_01', 'Preparar ajuste documental',                30, true, true,  2, 'active'),
        (v_empresa_id, v_pb_replacement, v_dep_cont,      'REP_CON_01', 'Emitir contrato/aditivo do substituto',     40, true, true,  2, 'active'),
        (v_empresa_id, v_pb_replacement, v_dep_log,       'REP_LOG_01', 'Ajustar alojamento/transporte/EPIs',        50, true, true,  2, 'active'),
        (v_empresa_id, v_pb_replacement, v_dep_op,        'REP_OPE_01', 'Confirmar troca na obra',                   60, true, true,  1, 'active'),
        (v_empresa_id, v_pb_replacement, v_dep_rh,        'REP_RH_02',  'Encerrar assignment antigo e criar novo',   70, true, false, 1, 'active')
    ON CONFLICT (playbook_id, code) DO UPDATE SET 
        title = EXCLUDED.title, department_id = EXCLUDED.department_id, sort_order = EXCLUDED.sort_order,
        priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, required = EXCLUDED.required,
        blocking = EXCLUDED.blocking, status = EXCLUDED.status;

    -- 4.5. RELOCATION (Reubicación)
    INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, sort_order, required, blocking, default_due_days, status)
    VALUES
        (v_empresa_id, v_pb_relocation, v_dep_op,  'REL_OPE_01', 'Validar nova obra/local',                   10, true, true,  1, 'active'),
        (v_empresa_id, v_pb_relocation, v_dep_doc, 'REL_DOC_01', 'Preparar aditivo/ajuste contratual',        20, true, true,  2, 'active'),
        (v_empresa_id, v_pb_relocation, v_dep_log, 'REL_LOG_01', 'Ajustar transporte, alojamento e EPIs',     30, true, true,  2, 'active'),
        (v_empresa_id, v_pb_relocation, v_dep_fin, 'REL_FIN_01', 'Ajustar centro de custo/faturamento',       40, true, false, 1, 'active'),
        (v_empresa_id, v_pb_relocation, v_dep_rh,  'REL_RH_01',  'Encerrar assignment antigo e criar novo',   50, true, false, 1, 'active')
    ON CONFLICT (playbook_id, code) DO UPDATE SET 
        title = EXCLUDED.title, department_id = EXCLUDED.department_id, sort_order = EXCLUDED.sort_order,
        priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, required = EXCLUDED.required,
        blocking = EXCLUDED.blocking, status = EXCLUDED.status;

    -- 4.6. OFFBOARDING (Baja)
    INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, sort_order, required, blocking, default_due_days, status)
    VALUES
        (v_empresa_id, v_pb_offboarding, v_dep_rh,  'OFF_RH_01',  'Confirmar saída',                         10, true, true,  1, 'active'),
        (v_empresa_id, v_pb_offboarding, v_dep_doc, 'OFF_DOC_01', 'Emitir/arquivar documentos de baixa',     20, true, false, 2, 'active'),
        (v_empresa_id, v_pb_offboarding, v_dep_log, 'OFF_LOG_01', 'Recolher EPIs/ferramentas',               30, true, false, 2, 'active'),
        (v_empresa_id, v_pb_offboarding, v_dep_fin, 'OFF_FIN_01', 'Validar horas finais/faturamento',        40, true, false, 2, 'active'),
        (v_empresa_id, v_pb_offboarding, v_dep_rh,  'OFF_RH_02',  'Encerrar worker_assignment',              50, true, false, 1, 'active')
    ON CONFLICT (playbook_id, code) DO UPDATE SET 
        title = EXCLUDED.title, department_id = EXCLUDED.department_id, sort_order = EXCLUDED.sort_order,
        priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, required = EXCLUDED.required,
        blocking = EXCLUDED.blocking, status = EXCLUDED.status;

    -- 4.7. SCOPE CHANGE (Cambio de Alcance)
    INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, sort_order, required, blocking, default_due_days, status)
    VALUES
        (v_empresa_id, v_pb_scope_change, v_dep_comercial, 'SCO_COM_01', 'Registrar alteração e aceite do cliente', 10, true, true,  1, 'active'),
        (v_empresa_id, v_pb_scope_change, v_dep_fin,       'SCO_FIN_01', 'Revisar impacto em faturamento/margem',   20, true, false, 2, 'active'),
        (v_empresa_id, v_pb_scope_change, v_dep_op,        'SCO_OPE_01', 'Ajustar demanda operacional',             30, true, false, 1, 'active'),
        (v_empresa_id, v_pb_scope_change, v_dep_rh,        'SCO_RH_01',  'Ajustar necessidade de trabalhadores',    40, true, false, 2, 'active'),
        (v_empresa_id, v_pb_scope_change, v_dep_doc,       'SCO_DOC_01', 'Gerar aditivo, se necessário',            50, false,false, 2, 'active')
    ON CONFLICT (playbook_id, code) DO UPDATE SET 
        title = EXCLUDED.title, department_id = EXCLUDED.department_id, sort_order = EXCLUDED.sort_order,
        priority = EXCLUDED.priority, default_due_days = EXCLUDED.default_due_days, required = EXCLUDED.required,
        blocking = EXCLUDED.blocking, status = EXCLUDED.status;

    -- ====================================================================================
    -- 5. LIGAÇÃO DE DEPENDÊNCIAS (FASE 2)
    -- ====================================================================================
    
    -- Limpa as dependências antes de regravar, caso o seed tenha sofrido alterações futuras
    UPDATE core_operacoes.playbook_steps
    SET depends_on_step_id = NULL
    WHERE empresa_id = v_empresa_id
    AND playbook_id IN (
      v_pb_new_order, v_pb_technical_test, v_pb_field_trial, 
      v_pb_replacement, v_pb_relocation, v_pb_offboarding, v_pb_scope_change
    );

    -- 5.1. NEW ORDER
    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_new_order AND s.code IN ('NO_DOC_01', 'NO_CON_01', 'NO_LOG_01', 'NO_OPE_01') AND p.playbook_id = v_pb_new_order AND p.code = 'NO_RH_01';

    -- 5.2. TECHNICAL TEST
    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_technical_test AND s.code = 'TT_OPE_01' AND p.playbook_id = v_pb_technical_test AND p.code = 'TT_RH_01';
    
    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_technical_test AND s.code = 'TT_DOC_01' AND p.playbook_id = v_pb_technical_test AND p.code = 'TT_OPE_01';
    
    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_technical_test AND s.code = 'TT_RH_02' AND p.playbook_id = v_pb_technical_test AND p.code = 'TT_DOC_01';

    -- 5.3. FIELD TRIAL
    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_field_trial AND s.code = 'FT_RH_01' AND p.playbook_id = v_pb_field_trial AND p.code = 'FT_OPE_01';

    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_field_trial AND s.code = 'FT_COM_01' AND p.playbook_id = v_pb_field_trial AND p.code = 'FT_RH_01';

    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_field_trial AND s.code = 'FT_FIN_01' AND p.playbook_id = v_pb_field_trial AND p.code = 'FT_COM_01';

    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_field_trial AND s.code = 'FT_RH_02' AND p.playbook_id = v_pb_field_trial AND p.code = 'FT_FIN_01';

    -- 5.4. REPLACEMENT
    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_replacement AND s.code IN ('REP_DOC_01', 'REP_CON_01', 'REP_LOG_01', 'REP_OPE_01') AND p.playbook_id = v_pb_replacement AND p.code = 'REP_RH_01';

    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_replacement AND s.code = 'REP_RH_02' AND p.playbook_id = v_pb_replacement AND p.code = 'REP_OPE_01';

    -- 5.5. RELOCATION
    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_relocation AND s.code IN ('REL_DOC_01', 'REL_LOG_01', 'REL_FIN_01') AND p.playbook_id = v_pb_relocation AND p.code = 'REL_OPE_01';

    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_relocation AND s.code = 'REL_RH_01' AND p.playbook_id = v_pb_relocation AND p.code = 'REL_DOC_01';

    -- 5.6. OFFBOARDING
    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_offboarding AND s.code IN ('OFF_DOC_01', 'OFF_LOG_01', 'OFF_FIN_01') AND p.playbook_id = v_pb_offboarding AND p.code = 'OFF_RH_01';

    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_offboarding AND s.code = 'OFF_RH_02' AND p.playbook_id = v_pb_offboarding AND p.code = 'OFF_FIN_01';

    -- 5.7. SCOPE CHANGE
    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_scope_change AND s.code = 'SCO_FIN_01' AND p.playbook_id = v_pb_scope_change AND p.code = 'SCO_COM_01';

    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_scope_change AND s.code = 'SCO_OPE_01' AND p.playbook_id = v_pb_scope_change AND p.code = 'SCO_FIN_01';

    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_scope_change AND s.code = 'SCO_RH_01' AND p.playbook_id = v_pb_scope_change AND p.code = 'SCO_OPE_01';

    UPDATE core_operacoes.playbook_steps s SET depends_on_step_id = p.id FROM core_operacoes.playbook_steps p
    WHERE s.playbook_id = v_pb_scope_change AND s.code = 'SCO_DOC_01' AND p.playbook_id = v_pb_scope_change AND p.code = 'SCO_COM_01';

END $$;
