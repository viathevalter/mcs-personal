BEGIN;

-- 1. Campos de controle em core_comercial.leads
ALTER TABLE core_comercial.leads 
  ADD COLUMN IF NOT EXISTS do_not_call BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_call_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_attempts_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_leads_do_not_call ON core_comercial.leads(do_not_call);
CREATE INDEX IF NOT EXISTS idx_leads_last_called_at ON core_comercial.leads(last_called_at);

-- 2. Tabela de Scripts de Vendas
CREATE TABLE IF NOT EXISTS core_comercial.sales_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    sector VARCHAR(100) DEFAULT 'general',
    pitch_opening TEXT NOT NULL,
    qualifying_questions JSONB DEFAULT '[]'::jsonb,
    objections_guide JSONB DEFAULT '[]'::jsonb,
    closing_pitch TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_scripts_empresa_id ON core_comercial.sales_scripts(empresa_id);

-- 3. Tabela de Campanhas / Lotes de Discagem
CREATE TABLE IF NOT EXISTS core_comercial.dialer_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.mcs_users(id) ON DELETE SET NULL,
    script_id UUID REFERENCES core_comercial.sales_scripts(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    total_leads INT DEFAULT 0,
    completed_leads INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_dialer_campaigns_empresa_id ON core_comercial.dialer_campaigns(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dialer_campaigns_assigned_to ON core_comercial.dialer_campaigns(assigned_to);
CREATE INDEX IF NOT EXISTS idx_dialer_campaigns_status ON core_comercial.dialer_campaigns(status);

-- 4. Tabela de Itens da Fila de Discagem
CREATE TABLE IF NOT EXISTS core_comercial.dialer_queue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES core_comercial.dialer_campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES core_comercial.leads(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.mcs_users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    attempts_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    scheduled_for TIMESTAMPTZ,
    scheduled_notes TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_campaign_lead UNIQUE(campaign_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_dialer_queue_items_campaign_id ON core_comercial.dialer_queue_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dialer_queue_items_lead_id ON core_comercial.dialer_queue_items(lead_id);
CREATE INDEX IF NOT EXISTS idx_dialer_queue_items_status ON core_comercial.dialer_queue_items(status);
CREATE INDEX IF NOT EXISTS idx_dialer_queue_items_scheduled_for ON core_comercial.dialer_queue_items(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_dialer_queue_items_sort_order ON core_comercial.dialer_queue_items(sort_order);

-- 5. Tabela de Log de Chamadas
CREATE TABLE IF NOT EXISTS core_comercial.lead_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES core_comercial.leads(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES core_comercial.dialer_campaigns(id) ON DELETE SET NULL,
    queue_item_id UUID REFERENCES core_comercial.dialer_queue_items(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.mcs_users(id) ON DELETE SET NULL,
    outcome VARCHAR(50) NOT NULL,
    notes TEXT,
    duration_seconds INT DEFAULT 0,
    phone_called VARCHAR(50),
    contact_person VARCHAR(255),
    scheduled_callback_at TIMESTAMPTZ,
    rejection_reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_call_logs_empresa_id ON core_comercial.lead_call_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lead_call_logs_lead_id ON core_comercial.lead_call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_call_logs_user_id ON core_comercial.lead_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_call_logs_outcome ON core_comercial.lead_call_logs(outcome);
CREATE INDEX IF NOT EXISTS idx_lead_call_logs_created_at ON core_comercial.lead_call_logs(created_at);

-- 6. Habilitar RLS
ALTER TABLE core_comercial.sales_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.dialer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.dialer_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.lead_call_logs ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Acesso
DROP POLICY IF EXISTS "Permitir leitura de scripts da empresa" ON core_comercial.sales_scripts;
CREATE POLICY "Permitir leitura de scripts da empresa" ON core_comercial.sales_scripts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir gestao de scripts" ON core_comercial.sales_scripts;
CREATE POLICY "Permitir gestao de scripts" ON core_comercial.sales_scripts FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura de campanhas da empresa" ON core_comercial.dialer_campaigns;
CREATE POLICY "Permitir leitura de campanhas da empresa" ON core_comercial.dialer_campaigns FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir gestao de campanhas" ON core_comercial.dialer_campaigns;
CREATE POLICY "Permitir gestao de campanhas" ON core_comercial.dialer_campaigns FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura de itens de fila" ON core_comercial.dialer_queue_items;
CREATE POLICY "Permitir leitura de itens de fila" ON core_comercial.dialer_queue_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir gestao de itens de fila" ON core_comercial.dialer_queue_items;
CREATE POLICY "Permitir gestao de itens de fila" ON core_comercial.dialer_queue_items FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura de call logs" ON core_comercial.lead_call_logs;
CREATE POLICY "Permitir leitura de call logs" ON core_comercial.lead_call_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir gestao de call logs" ON core_comercial.lead_call_logs;
CREATE POLICY "Permitir gestao de call logs" ON core_comercial.lead_call_logs FOR ALL TO authenticated USING (true);

-- 8. Scripts Padrão MCS
DO $$
DECLARE
    emp_rec RECORD;
BEGIN
    FOR emp_rec IN SELECT id FROM core_common.empresas LOOP
        IF NOT EXISTS (SELECT 1 FROM core_comercial.sales_scripts WHERE empresa_id = emp_rec.id AND sector = 'metalurgico_es') THEN
            INSERT INTO core_comercial.sales_scripts (empresa_id, title, sector, pitch_opening, qualifying_questions, objections_guide, closing_pitch, is_default)
            VALUES (
                emp_rec.id,
                'Script Padrão - Calderería & Estructuras (Espanha)',
                'metalurgico_es',
                'Buenos días/tardes. Le llamo de MCS Servicios Industriales. Nos especializamos en refuerzo de mano de obra técnica cualificada (soldadores homologados TIG/MIG/MAG, tuberos y montadores industriales) para proyectos en España y Francia. Me gustaría comentar brevemente con el responsable de producción o compras sobre sus demandas actuales de personal técnico.',
                '[
                    {"question": "¿Tienen actualmente picos de producción o proyectos de montaje donde requieran reforzar equipo técnico?", "goal": "Identificar necesidad inmediata"},
                    {"question": "¿Qué perfiles suelen ser los más críticos para ustedes? (Soldadores TIG, tuberos, montadores mecánicos)", "goal": "Mapear demanda específica"},
                    {"question": "¿En qué localidades o talleres tienen previstas las próximas obras?", "goal": "Viabilidade logística"}
                ]'::jsonb,
                '[
                    {"objection": "Ya tenemos proveedores habituales de trabajo temporal / contratas", "response": "Perfecto, lo comprendemos. No buscamos sustituir a sus proveedores actuales, sino ser una alternativa especializada y ágil con homologaciones europeas cuando sus proveedores no tengan disponibilidad en plazos críticos."},
                    {"objection": "No contratamos personal externo", "response": "Entendido. La mayoría de nuestros clientes industriales trabajan con nosotros por la flexibilidad de cubrir picos de obra sin asumir pasivos laborales fijos, con gestión completa de desplazamientos y alojamiento."},
                    {"objection": "¿Cuál es la tarifa por hora?", "response": "Nuestras tarifas varían según la homologación del soldador/tubero y la duración de la obra, siempre con costes cerrados y transparentes (incluyendo seguridad social, EPIs y logística). ¿Podemos prepararles una estimación sin compromiso para su próximo proyecto?"}
                ]'::jsonb,
                '¿Le parece bien si le enviamos una propuesta / estimación personalizada con los perfiles exactos y coordinamos una breve videollamada esta semana?',
                true
            );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM core_comercial.sales_scripts WHERE empresa_id = emp_rec.id AND sector = 'industriel_fr') THEN
            INSERT INTO core_comercial.sales_scripts (empresa_id, title, sector, pitch_opening, qualifying_questions, objections_guide, closing_pitch, is_default)
            VALUES (
                emp_rec.id,
                'Script Standard - Chaudronnerie & Tuyauterie (France)',
                'industriel_fr',
                'Bonjour. Je vous contacte de la part de MCS Services Industriels. Nous accompagnons les industriels en France avec la mise à disposition d''équipes spécialisées (soudeurs certifiés, tuyauteurs et monteurs industriels) avec conformité légale complète et détachement européen.',
                '[
                    {"question": "Avez-vous actuellement des chantiers ou arrêts techniques nécessitant un renfort de monteurs ou soudeurs ?", "goal": "Identifier le besoin immédiat"},
                    {"question": "Quels sont vos procédés prioritaires (TIG, Arc, MIG) et normes requises ?", "goal": "Ciblage technique"}
                ]'::jsonb,
                '[
                    {"objection": "Nous avons déjà des sous-traitants locaux", "response": "C''est tout à fait normal. Nous intervenons en complément ou renfort d''urgence avec une grande réactivité et des professionnels expérimentés."},
                    {"objection": "Envoyez-moi un email d''abord", "response": "Avec plaisir. Quel est l''adresse directe du responsable travaux/achats pour que je puisse lui adresser nos références et certifications ?"}
                ]'::jsonb,
                'Pouvons-nous vous faire parvenir un devis estimatif sans engagement pour votre prochain chantier ?',
                false
            );
        END IF;
    END LOOP;
END $$;

COMMIT;