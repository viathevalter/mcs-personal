-- Migration: 20260705130000_order_postponement_and_notifications.sql
-- Description: Add order_postponement constraint, create notifications table and seed playbook.

BEGIN;

-- 1. Atualizar check constraint de tipo em solicitudes_operativas
ALTER TABLE core_operacoes.solicitudes_operativas DROP CONSTRAINT IF EXISTS solicitudes_operativas_tipo_check;
ALTER TABLE core_operacoes.solicitudes_operativas ADD CONSTRAINT solicitudes_operativas_tipo_check 
CHECK (tipo IN ('new_order', 'replacement', 'relocation', 'technical_test', 'field_trial', 'offboarding', 'scope_change', 'cancellation', 'document_request', 'logistics_request', 'billing_request', 'incident', 'order_extension', 'order_termination', 'order_postponement'));

-- 2. Atualizar check constraint de action_type em solicitud_targets
ALTER TABLE core_operacoes.solicitud_targets DROP CONSTRAINT IF EXISTS solicitud_targets_action_type_check;
ALTER TABLE core_operacoes.solicitud_targets ADD CONSTRAINT solicitud_targets_action_type_check 
CHECK (action_type IN ('replace', 'relocate', 'test', 'offboard', 'extend', 'postpone'));

-- 3. Atualizar check constraint de event_type em notification_emails
ALTER TABLE core_comercial.notification_emails DROP CONSTRAINT IF EXISTS notification_emails_event_type_check;
ALTER TABLE core_comercial.notification_emails ADD CONSTRAINT notification_emails_event_type_check 
CHECK (event_type IN ('pedido', 'reemplazo', 'reubicacion', 'prueba', 'baja', 'prorrogacao', 'finalizacao', 'adiamento'));

-- 4. Criar tabela de notificações (Torre de Controle)
CREATE TABLE IF NOT EXISTS core_common.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES core_common.departments(id) ON DELETE SET NULL,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR NOT NULL CHECK (type IN ('date_change', 'new_order', 'task_blocked', 'incident')),
    severity VARCHAR DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    link_url VARCHAR,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS nas notificações
ALTER TABLE core_common.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de notificacoes" ON core_common.notifications;
CREATE POLICY "Leitura de notificacoes" ON core_common.notifications 
    FOR SELECT TO authenticated 
    USING (core_common.is_member(empresa_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Atualizacao de notificacoes" ON core_common.notifications;
CREATE POLICY "Atualizacao de notificacoes" ON core_common.notifications 
    FOR UPDATE TO authenticated 
    USING (core_common.is_member(empresa_id) AND user_id = auth.uid())
    WITH CHECK (core_common.is_member(empresa_id) AND user_id = auth.uid());

-- Triggers de modtime
DROP TRIGGER IF EXISTS update_notifications_modtime ON core_common.notifications;
CREATE TRIGGER update_notifications_modtime BEFORE UPDATE ON core_common.notifications FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

-- Index para otimização
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON core_common.notifications(user_id) WHERE read_at IS NULL;

-- 5. Helper Function para criar notificações por usuário, departamento ou geral
CREATE OR REPLACE FUNCTION core_common.create_notification(
    p_empresa_id UUID,
    p_department_id UUID,
    p_user_id UUID,
    p_title VARCHAR,
    p_message TEXT,
    p_type VARCHAR,
    p_severity VARCHAR,
    p_link_url VARCHAR
) RETURNS VOID AS $$
DECLARE
    r_member RECORD;
BEGIN
    IF p_user_id IS NOT NULL THEN
        -- Usuário específico
        INSERT INTO core_common.notifications (empresa_id, user_id, department_id, title, message, type, severity, link_url)
        VALUES (p_empresa_id, p_user_id, p_department_id, p_title, p_message, p_type, p_severity, p_link_url);
    ELSIF p_department_id IS NOT NULL THEN
        -- Todos os membros do departamento
        FOR r_member IN 
            SELECT user_id 
            FROM core_common.department_members 
            WHERE department_id = p_department_id AND status = 'active'
        LOOP
            INSERT INTO core_common.notifications (empresa_id, user_id, department_id, title, message, type, severity, link_url)
            VALUES (p_empresa_id, r_member.user_id, p_department_id, p_title, p_message, p_type, p_severity, p_link_url);
        END LOOP;
    ELSE
        -- Geral da empresa
        FOR r_member IN 
            SELECT DISTINCT user_id 
            FROM core_common.user_memberships 
            WHERE empresa_id = p_empresa_id AND is_active = true
        LOOP
            INSERT INTO core_common.notifications (empresa_id, user_id, department_id, title, message, type, severity, link_url)
            VALUES (p_empresa_id, r_member.user_id, NULL, p_title, p_message, p_type, p_severity, p_link_url);
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Inserir Playbook de Adiamento de Início (ORDER_POSTPONEMENT)
DO $$
DECLARE
    v_empresa_id UUID;
    v_dep_rh UUID;
    v_dep_doc UUID;
    v_dep_log UUID;
    v_dep_op UUID;
    
    v_pb_postponement UUID;
BEGIN
    SELECT id INTO v_empresa_id FROM core_common.empresas WHERE nome = 'Kotrik & Rosas' LIMIT 1;
    
    IF v_empresa_id IS NOT NULL THEN
        -- Obter IDs dos Departamentos
        SELECT id INTO v_dep_rh FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'RH';
        SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'DOCUMENTACION';
        SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'LOGISTICA';
        SELECT id INTO v_dep_op FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'OPERACOES';

        -- Playbook
        INSERT INTO core_operacoes.playbooks (empresa_id, code, name, solicitud_type, status)
        VALUES (v_empresa_id, 'ORDER_POSTPONEMENT', 'Adiamento de Início / Order Postponement', 'order_postponement', 'active')
        ON CONFLICT (empresa_id, code) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status
        RETURNING id INTO v_pb_postponement;

        -- Passos do Playbook
        INSERT INTO core_operacoes.playbook_steps (empresa_id, playbook_id, department_id, code, title, sort_order, required, blocking, default_due_days, status)
        VALUES
            (v_empresa_id, v_pb_postponement, v_dep_rh,  'PST_RH_01',  'Confirmar nova data com trabalhadores alocados e remarcar contratos', 10, true, true, 2, 'active'),
            (v_empresa_id, v_pb_postponement, v_dep_log, 'PST_LOG_01', 'Remarcar reservas de alojamento e transporte', 20, true, false, 2, 'active'),
            (v_empresa_id, v_pb_postponement, v_dep_doc, 'PST_DOC_01', 'Reajustar cronograma de upload nas plataformas (Nalanda/Obralia)', 30, true, false, 2, 'active'),
            (v_empresa_id, v_pb_postponement, v_dep_log, 'PST_ALM_01', 'Reprogramar despacho de EPI no armazém', 40, true, false, 2, 'active'),
            (v_empresa_id, v_pb_postponement, v_dep_rh,  'PST_RH_02',  'Ligar para trabalhadores e formalizar aviso do adiamento do início', 50, true, false, 1, 'active')
        ON CONFLICT (playbook_id, code) DO NOTHING;
    END IF;
END $$;

-- 7. Trigger para enviar notificações quando a data do pedido muda via Solicitud concluída
CREATE OR REPLACE FUNCTION core_operacoes.trigger_notificar_alteracao_data()
RETURNS TRIGGER AS $$
DECLARE
    v_dep_rh UUID;
    v_dep_doc UUID;
    v_dep_log UUID;
    v_dep_com UUID;
    
    v_msg TEXT;
    v_link VARCHAR;
BEGIN
    -- Obter IDs dos departamentos
    SELECT id INTO v_dep_rh FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'RH';
    SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'DOCUMENTACION';
    SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'LOGISTICA';
    SELECT id INTO v_dep_com FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'COMERCIAL';

    v_link := '/operacoes/pedidos/' || NEW.pedido_id;

    -- Se a solicitud é de adiamento de início e acabou de ser concluída
    IF NEW.tipo = 'order_postponement' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        v_msg := 'O Pedido ' || NEW.codigo || ' teve o início adiado pelo cliente. Verifique as novas datas operacionais.';
        
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_rh,  NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_doc, NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_log, NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_com, NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
    
    -- Se a solicitud é de prorrogação e acabou de ser concluída
    ELSIF NEW.tipo = 'order_extension' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        v_msg := 'O Pedido ' || NEW.codigo || ' teve o prazo estendido. Verifique a necessidade de aditivos e alojamentos.';
        
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_rh,  NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_doc, NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_log, NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_com, NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tgr_solicitudes_operativas_notificar ON core_operacoes.solicitudes_operativas;
CREATE TRIGGER tgr_solicitudes_operativas_notificar
    AFTER UPDATE ON core_operacoes.solicitudes_operativas
    FOR EACH ROW
    EXECUTE FUNCTION core_operacoes.trigger_notificar_alteracao_data();

COMMIT;
