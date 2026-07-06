-- Migration: 20260705120000_order_extension_and_termination.sql
-- Description: Add order_extension and order_termination check constraints, and seed playbooks.

-- 1. Atualizar check constraint de tipo em solicitudes_operativas
ALTER TABLE core_operacoes.solicitudes_operativas DROP CONSTRAINT IF EXISTS solicitudes_operativas_tipo_check;
ALTER TABLE core_operacoes.solicitudes_operativas ADD CONSTRAINT solicitudes_operativas_tipo_check 
CHECK (tipo IN ('new_order', 'replacement', 'relocation', 'technical_test', 'field_trial', 'offboarding', 'scope_change', 'cancellation', 'document_request', 'logistics_request', 'billing_request', 'incident', 'order_extension', 'order_termination'));

-- 2. Atualizar check constraint de action_type em solicitud_targets
ALTER TABLE core_operacoes.solicitud_targets DROP CONSTRAINT IF EXISTS solicitud_targets_action_type_check;
ALTER TABLE core_operacoes.solicitud_targets ADD CONSTRAINT solicitud_targets_action_type_check 
CHECK (action_type IN ('replace', 'relocate', 'test', 'offboard', 'extend'));

-- 3. Atualizar check constraint de event_type em notification_emails
ALTER TABLE core_comercial.notification_emails DROP CONSTRAINT IF EXISTS notification_emails_event_type_check;
ALTER TABLE core_comercial.notification_emails ADD CONSTRAINT notification_emails_event_type_check 
CHECK (event_type IN ('pedido', 'reemplazo', 'reubicacion', 'prueba', 'baja', 'prorrogacao', 'finalizacao'));

-- 4. Inserir Playbooks e Passos (Playbook Steps)
DO $$
DECLARE
    v_empresa_id UUID;
    v_dep_comercial UUID;
    v_dep_rh UUID;
    v_dep_doc UUID;
    v_dep_log UUID;
    v_dep_fin UUID;
    v_dep_op UUID;
    v_dep_cont UUID;
    
    v_pb_extension UUID;
    v_pb_termination UUID;
BEGIN
    -- Seleciona ID da empresa
    SELECT id INTO v_empresa_id FROM core_common.empresas WHERE nome = 'Kotrik & Rosas' LIMIT 1;
    
    IF v_empresa_id IS NOT NULL THEN
        -- Obter IDs dos Departamentos
        SELECT id INTO v_dep_comercial FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'COMERCIAL';
        SELECT id INTO v_dep_rh FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'RH';
        SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'DOCUMENTACION';
        SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'LOGISTICA';
        SELECT id INTO v_dep_fin FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'FINANCEIRO';
        SELECT id INTO v_dep_op FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'OPERACOES';
        SELECT id INTO v_dep_cont FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'CONTRATOS';

        -- Inserir Playbook de Prorrogação
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, status)
        VALUES (v_empresa_id, 'ORDER_EXTENSION', 'Prorrogação de Obra / Order Extension', 'order_extension', 'active')
        ON CONFLICT (empresa_id, code) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status
        RETURNING id INTO v_pb_extension;

        -- Inserir Passos de Prorrogação
        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, sort_order, required, blocking, default_due_days, status)
        VALUES
            (v_empresa_id, v_pb_extension, v_dep_comercial, 'EXT_COM_01', 'Confirmar prorrogação com o cliente', 10, true, true, 1, 'active'),
            (v_empresa_id, v_pb_extension, v_dep_cont,      'EXT_CON_01', 'Emitir aditivo contratual de prorrogação', 20, true, true, 2, 'active'),
            (v_empresa_id, v_pb_extension, v_dep_log,       'EXT_LOG_01', 'Prorrogar alojamento e transporte contratados', 30, true, false, 2, 'active'),
            (v_empresa_id, v_pb_extension, v_dep_rh,        'EXT_RH_01',  'Confirmar continuidade ou substituição de trabalhadores', 40, true, false, 2, 'active'),
            (v_empresa_id, v_pb_extension, v_dep_fin,       'EXT_FIN_01', 'Ajustar previsão de faturamento e custos', 50, true, false, 1, 'active')
        ON CONFLICT (playbook_id, code) DO NOTHING;

        -- Inserir Playbook de Finalização
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, status)
        VALUES (v_empresa_id, 'ORDER_TERMINATION', 'Finalização de Obra / Order Termination', 'order_termination', 'active')
        ON CONFLICT (empresa_id, code) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status
        RETURNING id INTO v_pb_termination;

        -- Inserir Passos de Finalização
        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, sort_order, required, blocking, default_due_days, status)
        VALUES
            (v_empresa_id, v_pb_termination, v_dep_op,  'TRM_OPE_01', 'Confirmar data final e plano de desmobilização', 10, true, true, 1, 'active'),
            (v_empresa_id, v_pb_termination, v_dep_rh,  'TRM_RH_01',  'Iniciar baixa (offboarding) dos colaboradores alocados', 20, true, true, 2, 'active'),
            (v_empresa_id, v_pb_termination, v_dep_log, 'TRM_LOG_01', 'Encerrar alojamentos, veículos e recolher EPIs/ferramentas', 30, true, false, 2, 'active'),
            (v_empresa_id, v_pb_termination, v_dep_fin, 'TRM_FIN_01', 'Validar folha de horas e processar faturamento final', 40, true, false, 2, 'active'),
            (v_empresa_id, v_pb_termination, v_dep_cont, 'TRM_CON_01', 'Encerrar contrato e arquivar pasta do cliente', 50, true, false, 1, 'active')
        ON CONFLICT (playbook_id, code) DO NOTHING;
    END IF;
END $$;
