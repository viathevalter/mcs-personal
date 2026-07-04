-- ========================================================================================
-- Migration: 20260701161500_comercial_marketing_and_crm.sql
-- Description: Kanban stages for leads, marketing templates, campaign queues, and RLS policies
-- ========================================================================================

BEGIN;

-- 1. Criar a tabela core_comercial.kanban_stages
CREATE TABLE IF NOT EXISTS core_comercial.kanban_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#64748b', -- Hex code (ex: '#3b82f6')
    order_index INT NOT NULL DEFAULT 0,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexar para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_kanban_stages_empresa_id ON core_comercial.kanban_stages(empresa_id);

-- 2. Adicionar o stage_id e outros campos de CRM na tabela core_comercial.leads
ALTER TABLE core_comercial.leads ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES core_comercial.kanban_stages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON core_comercial.leads(stage_id);

-- 3. Criar a tabela core_comercial.marketing_templates
CREATE TABLE IF NOT EXISTS core_comercial.marketing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_marketing_templates_empresa_id ON core_comercial.marketing_templates(empresa_id);

-- 4. Criar a tabela core_comercial.marketing_campaigns
CREATE TABLE IF NOT EXISTS core_comercial.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    template_id UUID REFERENCES core_comercial.marketing_templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'completed', 'paused'
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_empresa_id ON core_comercial.marketing_campaigns(empresa_id);

-- 5. Criar a tabela core_comercial.marketing_campaign_queue
CREATE TABLE IF NOT EXISTS core_comercial.marketing_campaign_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES core_comercial.marketing_campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES core_comercial.leads(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced', 'clicked'
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaign_queue_campaign_id ON core_comercial.marketing_campaign_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaign_queue_lead_id ON core_comercial.marketing_campaign_queue(lead_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaign_queue_status ON core_comercial.marketing_campaign_queue(status);

-- 6. Habilitar RLS nas novas tabelas
ALTER TABLE core_comercial.kanban_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.marketing_campaign_queue ENABLE ROW LEVEL SECURITY;

-- 7. RLS Políticas para kanban_stages
CREATE POLICY "Permitir membros lerem estagios de sua empresa"
ON core_comercial.kanban_stages FOR SELECT
TO authenticated
USING (core_common.is_member(empresa_id));

CREATE POLICY "Permitir gestores e admins gerenciarem estagios"
ON core_comercial.kanban_stages FOR ALL
TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'operador'));

-- 8. RLS Políticas para marketing_templates
CREATE POLICY "Permitir membros lerem templates de sua empresa"
ON core_comercial.marketing_templates FOR SELECT
TO authenticated
USING (core_common.is_member(empresa_id));

CREATE POLICY "Permitir gestores gerenciarem templates"
ON core_comercial.marketing_templates FOR ALL
TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'operador'));

-- 9. RLS Políticas para marketing_campaigns
CREATE POLICY "Permitir membros lerem campanhas de sua empresa"
ON core_comercial.marketing_campaigns FOR SELECT
TO authenticated
USING (core_common.is_member(empresa_id));

CREATE POLICY "Permitir gestores gerenciarem campanhas"
ON core_comercial.marketing_campaigns FOR ALL
TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'operador'));

-- 10. RLS Políticas para marketing_campaign_queue
CREATE POLICY "Permitir membros lerem fila de sua empresa"
ON core_comercial.marketing_campaign_queue FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM core_comercial.marketing_campaigns mc
        WHERE mc.id = marketing_campaign_queue.campaign_id
          AND core_common.is_member(mc.empresa_id)
    )
);

CREATE POLICY "Permitir gestores gerenciarem fila de sua empresa"
ON core_comercial.marketing_campaign_queue FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM core_comercial.marketing_campaigns mc
        WHERE mc.id = marketing_campaign_queue.campaign_id
          AND (core_common.has_role(mc.empresa_id, 'admin') OR core_common.has_role(mc.empresa_id, 'operador'))
    )
);

-- 11. Conceder Permissões
GRANT ALL PRIVILEGES ON core_comercial.kanban_stages TO postgres, service_role, authenticated;
GRANT ALL PRIVILEGES ON core_comercial.marketing_templates TO postgres, service_role, authenticated;
GRANT ALL PRIVILEGES ON core_comercial.marketing_campaigns TO postgres, service_role, authenticated;
GRANT ALL PRIVILEGES ON core_comercial.marketing_campaign_queue TO postgres, service_role, authenticated;

-- 12. Função para criar estágios padrão para novas empresas
CREATE OR REPLACE FUNCTION core_comercial.criar_estagios_padrao_empresa()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO core_comercial.kanban_stages (empresa_id, name, color, order_index, is_system)
    VALUES 
    (NEW.id, 'Novo', '#3b82f6', 1, true),
    (NEW.id, 'E-mail Enviado', '#f59e0b', 2, true),
    (NEW.id, 'Interessado', '#10b981', 3, true),
    (NEW.id, 'Proposta', '#8b5cf6', 4, true),
    (NEW.id, 'Convertido', '#22c55e', 5, true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para novas empresas
CREATE TRIGGER tr_criar_estagios_padrao_empresa
AFTER INSERT ON core_common.empresas
FOR EACH ROW
EXECUTE FUNCTION core_comercial.criar_estagios_padrao_empresa();

-- 13. Criar estágios padrão para as empresas existentes
DO $$
DECLARE
    emp_record RECORD;
    v_stage_id UUID;
BEGIN
    FOR emp_record IN SELECT id FROM core_common.empresas LOOP
        -- Verificar se já existem estágios cadastrados para a empresa
        IF NOT EXISTS (SELECT 1 FROM core_comercial.kanban_stages WHERE empresa_id = emp_record.id) THEN
            -- Inserir os estágios padrão e salvar o ID do estágio 'Novo'
            INSERT INTO core_comercial.kanban_stages (empresa_id, name, color, order_index, is_system)
            VALUES 
            (emp_record.id, 'Novo', '#3b82f6', 1, true)
            RETURNING id INTO v_stage_id;

            INSERT INTO core_comercial.kanban_stages (empresa_id, name, color, order_index, is_system)
            VALUES 
            (emp_record.id, 'E-mail Enviado', '#f59e0b', 2, true),
            (emp_record.id, 'Interessado', '#10b981', 3, true),
            (emp_record.id, 'Proposta', '#8b5cf6', 4, true),
            (emp_record.id, 'Convertido', '#22c55e', 5, true);

            -- Associar os leads existentes dessa empresa ao estágio 'Novo'
            UPDATE core_comercial.leads 
            SET stage_id = v_stage_id 
            WHERE empresa_id = emp_record.id AND stage_id IS NULL;
        END IF;
    END LOOP;
END;
$$;

COMMIT;
