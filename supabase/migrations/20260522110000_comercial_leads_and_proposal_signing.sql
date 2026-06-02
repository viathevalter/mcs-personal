-- ========================================================================================
-- Migration: 20260522110000_comercial_leads_and_proposal_signing.sql
-- Description: Leads, Spain provinces lookup, and proposal signature auditing
-- ========================================================================================

BEGIN;

-- 1. Criar a tabela core_comercial.leads
CREATE TABLE IF NOT EXISTS core_comercial.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Indexar campos de busca em leads
CREATE INDEX IF NOT EXISTS idx_leads_empresa_id ON core_comercial.leads(empresa_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON core_comercial.leads(email);

-- 2. Alterar a tabela core_common.empresas para adicionar proposal_sender_email
ALTER TABLE core_common.empresas ADD COLUMN IF NOT EXISTS proposal_sender_email VARCHAR(255);

-- Atualizar empresas existentes com emails padrão de vendas
UPDATE core_common.empresas SET proposal_sender_email = 'vendas@stoco.es' WHERE trade_name ILIKE '%stocco%';
UPDATE core_common.empresas SET proposal_sender_email = 'vendas@luminous.pt' WHERE trade_name ILIKE '%luminous%';
UPDATE core_common.empresas SET proposal_sender_email = 'vendas@wiseowe.com' WHERE trade_name ILIKE '%wiseowe%';
UPDATE core_common.empresas SET proposal_sender_email = 'vendas@loginpro.pt' WHERE trade_name ILIKE '%login%pro%';
UPDATE core_common.empresas SET proposal_sender_email = 'vendas@kotrik.pt' WHERE trade_name ILIKE '%kotrik%';
UPDATE core_common.empresas SET proposal_sender_email = 'vendas@triangulo.es' WHERE trade_name ILIKE '%triangulo%';
-- Se houver outra empresa sem email definido, colocar um padrão genérico
UPDATE core_common.empresas SET proposal_sender_email = 'comercial@mastercorp.pt' WHERE proposal_sender_email IS NULL;

-- 3. Alterar core_comercial.estimaciones para nullable client_id e adicionar lead_id
ALTER TABLE core_comercial.estimaciones ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE core_comercial.estimaciones ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES core_comercial.leads(id) ON DELETE RESTRICT;

-- Adicionar check constraint chk_client_or_lead
ALTER TABLE core_comercial.estimaciones DROP CONSTRAINT IF EXISTS chk_client_or_lead;
ALTER TABLE core_comercial.estimaciones ADD CONSTRAINT chk_client_or_lead 
    CHECK ((client_id IS NOT NULL AND lead_id IS NULL) OR (client_id IS NULL AND lead_id IS NOT NULL));

-- 4. Criar a tabela de províncias da Espanha
CREATE TABLE IF NOT EXISTS core_comercial.spain_provinces (
    codigo VARCHAR(5) PRIMARY KEY, -- Prefixo de 2 dígitos do código postal (ex: '01')
    pais VARCHAR(100) DEFAULT 'España',
    provincia VARCHAR(255) NOT NULL,
    valor_dia NUMERIC(10,2) NOT NULL, -- Valor diário de alojamento
    coste_envio NUMERIC(10,2) NOT NULL -- Custo de envio de EPIs
);

-- Seed de províncias da Espanha (dados do Espana.csv)
INSERT INTO core_comercial.spain_provinces (codigo, pais, provincia, valor_dia, coste_envio)
VALUES
('01', 'España', 'Álava', 20, 10),
('02', 'España', 'Albacete', 17, 10),
('03', 'España', 'Alicante', 20, 10),
('04', 'España', 'Almería', 17, 10),
('05', 'España', 'Ávila', 17, 10),
('06', 'España', 'Badajoz', 17, 12),
('07', 'España', 'Balears', 27, 40),
('08', 'España', 'Barcelona', 24, 8),
('09', 'España', 'Burgos', 17, 10),
('10', 'España', 'Cáceres', 17, 12),
('11', 'España', 'Cádiz', 17, 12),
('12', 'España', 'Castellón', 17, 8),
('13', 'España', 'Ciudad Real', 17, 10),
('14', 'España', 'Córdoba', 17, 12),
('15', 'España', 'A Coruña', 20, 12),
('16', 'España', 'Cuenca', 17, 8),
('17', 'España', 'Gerona', 20, 8),
('18', 'España', 'Granada', 20, 12),
('19', 'España', 'Guadalajara', 17, 10),
('20', 'España', 'Gipuzkoa', 24, 10),
('21', 'España', 'Huelva', 17, 12),
('22', 'España', 'Huesca', 17, 8),
('23', 'España', 'Jaén', 17, 10),
('24', 'España', 'León', 17, 12),
('25', 'España', 'Lleida', 17, 8),
('26', 'España', 'La Rioja', 17, 10),
('27', 'España', 'Lugo', 17, 12),
('28', 'España', 'Madrid', 24, 10),
('29', 'España', 'Málaga', 24, 12),
('30', 'España', 'Murcia', 17, 10),
('31', 'España', 'Navarra', 20, 8),
('32', 'España', 'Ourense', 17, 12),
('33', 'España', 'Asturias', 17, 12),
('34', 'España', 'Palencia', 17, 10),
('35', 'España', 'Las Palmas', 27, 40),
('36', 'España', 'Pontevedra', 17, 12),
('37', 'España', 'Salamanca', 17, 12),
('38', 'España', 'Tenerife', 27, 40),
('39', 'España', 'Cantabria', 17, 10),
('40', 'España', 'Segovia', 17, 10),
('41', 'España', 'Sevilla', 17, 12),
('42', 'España', 'Soria', 17, 8),
('43', 'España', 'Tarragona', 17, 8),
('44', 'España', 'Teruel', 17, 8),
('45', 'España', 'Toledo', 17, 10),
('46', 'España', 'Valencia', 17, 8),
('47', 'España', 'Valladolid', 17, 10),
('48', 'España', 'Vizcaya', 24, 10),
('49', 'España', 'Zamora', 17, 10),
('50', 'España', 'Zaragoza', 17, 8),
('51', 'España', 'Ceuta', 27, 40),
('52', 'España', 'Melilla', 27, 40)
ON CONFLICT (codigo) DO UPDATE 
SET pais = EXCLUDED.pais, 
    provincia = EXCLUDED.provincia, 
    valor_dia = EXCLUDED.valor_dia, 
    coste_envio = EXCLUDED.coste_envio;

-- 5. Criar tabelas de assinatura de propostas
CREATE TABLE IF NOT EXISTS core_comercial.proposal_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    estimacion_id UUID NOT NULL REFERENCES core_comercial.estimaciones(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_signature', -- 'draft', 'pending_signature', 'signed', 'expired'
    document_url TEXT, -- Link do arquivo DOCX preenchido
    signed_document_url TEXT, -- PDF assinado
    signature_token UUID UNIQUE DEFAULT gen_random_uuid(),
    otp_code VARCHAR(10),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_proposal_signatures_estimacion_id ON core_comercial.proposal_signatures(estimacion_id);
CREATE INDEX IF NOT EXISTS idx_proposal_signatures_token ON core_comercial.proposal_signatures(signature_token);

CREATE TABLE IF NOT EXISTS core_comercial.proposal_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_signature_id UUID NOT NULL REFERENCES core_comercial.proposal_signatures(id) ON DELETE CASCADE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    verification_code VARCHAR(10) NOT NULL,
    signature_image TEXT, -- Armazena a imagem em Base64 do canvas desenhado
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_or_phone_used VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proposal_audit_logs_signature_id ON core_comercial.proposal_audit_logs(proposal_signature_id);

-- 6. Habilitar RLS nas novas tabelas
ALTER TABLE core_comercial.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.spain_provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.proposal_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.proposal_audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS para leads
CREATE POLICY "Permitir membros lerem leads de sua empresa"
ON core_comercial.leads FOR SELECT
TO authenticated
USING (core_common.is_member(empresa_id));

CREATE POLICY "Permitir gestores e admins gerenciarem leads"
ON core_comercial.leads FOR ALL
TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'operador'));

-- 8. Criar políticas RLS para spain_provinces (tabela pública de consulta)
CREATE POLICY "Permitir consulta pública de províncias da Espanha"
ON core_comercial.spain_provinces FOR SELECT
TO anon, authenticated
USING (true);

-- 9. Criar políticas RLS para proposal_signatures e proposal_audit_logs
CREATE POLICY "Permitir leitura pública por token de assinatura da proposta"
ON core_comercial.proposal_signatures FOR SELECT
TO anon, authenticated
USING (signature_token IS NOT NULL);

CREATE POLICY "Permitir membros lerem assinaturas de proposta de sua empresa"
ON core_comercial.proposal_signatures FOR SELECT
TO authenticated
USING (core_common.is_member(empresa_id));

CREATE POLICY "Permitir gestores gerenciarem assinaturas de proposta"
ON core_comercial.proposal_signatures FOR ALL
TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "Permitir inserção pública de logs de auditoria de propostas"
ON core_comercial.proposal_audit_logs FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Permitir membros verem logs de auditoria de propostas de sua empresa"
ON core_comercial.proposal_audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM core_comercial.proposal_signatures ps
        WHERE ps.id = proposal_audit_logs.proposal_signature_id
          AND core_common.is_member(ps.empresa_id)
    )
);

-- 10. Conceder permissões
GRANT ALL PRIVILEGES ON core_comercial.leads TO postgres, service_role, authenticated;
GRANT ALL PRIVILEGES ON core_comercial.spain_provinces TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON core_comercial.proposal_signatures TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON core_comercial.proposal_audit_logs TO postgres, service_role, authenticated, anon;

-- 11. Buckets do Supabase Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('proposal-templates', 'proposal-templates', false) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('proposal-signatures', 'proposal-signatures', false) 
ON CONFLICT (id) DO NOTHING;

-- Políticas de armazenamento para proposal-templates
CREATE POLICY "Admins e Operadores podem gerenciar templates de propostas"
ON storage.objects FOR ALL TO authenticated
USING (
    bucket_id = 'proposal-templates' AND
    EXISTS (SELECT 1 FROM core_common.user_memberships WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'operador') AND is_active = true)
)
WITH CHECK (
    bucket_id = 'proposal-templates' AND
    EXISTS (SELECT 1 FROM core_common.user_memberships WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'operador') AND is_active = true)
);

CREATE POLICY "Membros podem ler templates de propostas"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'proposal-templates');

-- Políticas de armazenamento para proposal-signatures
CREATE POLICY "Admins e Operadores podem gerenciar propostas geradas"
ON storage.objects FOR ALL TO authenticated
USING (
    bucket_id = 'proposal-signatures' AND
    EXISTS (SELECT 1 FROM core_common.user_memberships WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'operador') AND is_active = true)
)
WITH CHECK (
    bucket_id = 'proposal-signatures' AND
    EXISTS (SELECT 1 FROM core_common.user_memberships WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'operador') AND is_active = true)
);

CREATE POLICY "Permitir leitura pública de propostas assinadas/geradas"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
    bucket_id = 'proposal-signatures' AND
    (EXISTS (
        SELECT 1 FROM core_comercial.proposal_signatures ps
        WHERE ps.document_url = name OR ps.signed_document_url = name
    ))
);

-- 12. Atualizar RPC core_comercial.criar_estimacion_completa
CREATE OR REPLACE FUNCTION core_comercial.criar_estimacion_completa(p_payload jsonb)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' 
AS $$
DECLARE
    v_user_id UUID;
    v_empresa_id UUID;
    v_client_id UUID;
    v_lead_id UUID;
    v_client_site_id UUID;
    v_estimation_type TEXT;
    v_contact_name TEXT;
    v_contact_email TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_validity_date DATE;
    v_payment_terms TEXT;
    v_general_notes TEXT;
    v_status TEXT;
    v_items JSONB;
    v_item JSONB;
    
    v_estimacion_id UUID;
    v_codigo TEXT;
    v_version_id UUID;
    
    -- Totais e cálculos
    v_total_estimated_cost NUMERIC(15,2) := 0;
    v_total_estimated_revenue NUMERIC(15,2) := 0;
    v_margin_percent NUMERIC(5,2) := 0;
    
    -- Validação de array
    v_items_length INT;
BEGIN
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;
    
    -- 1. Extrair payload principal
    v_empresa_id := (p_payload->>'empresa_id')::uuid;
    v_client_id := (p_payload->>'client_id')::uuid;
    v_lead_id := (p_payload->>'lead_id')::uuid;
    v_client_site_id := (p_payload->>'client_site_id')::uuid;
    v_estimation_type := COALESCE(p_payload->>'estimation_type', 'new_allocation');
    v_contact_name := p_payload->>'contact_name';
    v_contact_email := p_payload->>'contact_email';
    v_start_date := (p_payload->>'expected_start_date')::date;
    v_end_date := (p_payload->>'expected_end_date')::date;
    v_validity_date := (p_payload->>'validity_date')::date;
    v_payment_terms := p_payload->>'payment_terms';
    v_general_notes := p_payload->>'general_notes';
    v_status := COALESCE(p_payload->>'status', 'draft');
    v_items := p_payload->'items';

    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'empresa_id é obrigatório.';
    END IF;

    IF v_client_id IS NULL AND v_lead_id IS NULL THEN
        RAISE EXCEPTION 'Deve informar ou um client_id ou um lead_id.';
    END IF;

    -- 2. Validar permissões
    IF NOT (
        core_common.has_role(v_empresa_id, 'super_admin') OR 
        core_common.has_role(v_empresa_id, 'operador')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para criar estimación na empresa %', v_empresa_id;
    END IF;

    -- 3. Validar array de itens
    v_items_length := jsonb_array_length(v_items);
    IF v_items_length IS NULL OR v_items_length = 0 THEN
        RAISE EXCEPTION 'A estimación deve conter pelo menos 1 item.';
    END IF;

    -- 3.5. Gerar código sequencial (Formato: EST-YYYYMMDD-XXXX)
    v_codigo := 'EST-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));

    -- 4. Inserir Estimación
    INSERT INTO core_comercial.estimaciones (
        empresa_id, codigo, client_id, lead_id, client_site_id, 
        estimation_type, contact_name, contact_email,
        expected_start_date, expected_end_date, validity_date, payment_terms, status,
        general_notes,
        created_by, updated_by
    ) VALUES (
        v_empresa_id, v_codigo, v_client_id, v_lead_id, v_client_site_id, 
        v_estimation_type, v_contact_name, v_contact_email,
        v_start_date, v_end_date, v_validity_date, v_payment_terms, v_status,
        v_general_notes,
        v_user_id, v_user_id
    )
    RETURNING id, codigo INTO v_estimacion_id, v_codigo;

    -- 5. Inserir Version (Version Number = 1)
    INSERT INTO core_comercial.estimacion_versions (
        empresa_id, estimacion_id, version_number, status,
        notes, created_by
    ) VALUES (
        v_empresa_id, v_estimacion_id, 1, 'active',
        'Versão inicial criada automaticamente', v_user_id
    )
    RETURNING id INTO v_version_id;

    -- 6. Atualizar a Estimación com a current_version_id
    UPDATE core_comercial.estimaciones
    SET current_version_id = v_version_id
    WHERE id = v_estimacion_id;

    -- 7. Loop de Inserção de Itens e Somatório
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        -- Validações de item
        IF (v_item->>'quantity')::int <= 0 THEN RAISE EXCEPTION 'Quantidade deve ser maior que 0.'; END IF;
        IF (v_item->>'planned_hours_per_day')::numeric < 0 THEN RAISE EXCEPTION 'Horas por dia não pode ser negativo.'; END IF;
        IF (v_item->>'planned_days_per_week')::numeric < 0 THEN RAISE EXCEPTION 'Dias por semana não pode ser negativo.'; END IF;
        IF (v_item->>'sell_rate_hour')::numeric < 0 THEN RAISE EXCEPTION 'Tarifa de venda não pode ser negativa.'; END IF;
        IF (v_item->>'base_cost_hour')::numeric < 0 THEN RAISE EXCEPTION 'Custo base não pode ser negativo.'; END IF;

        INSERT INTO core_comercial.estimacion_items (
            empresa_id, estimacion_id, estimacion_version_id, job_function_id,
            quantity, planned_hours_per_day, planned_days_per_week, planned_total_hours,
            includes_housing, includes_transport, includes_epi,
            base_cost_hour, recommended_sell_rate_hour, minimum_sell_rate_hour, sell_rate_hour,
            margin_percent, risk_level_snapshot, description,
            created_by, updated_by
        ) VALUES (
            v_empresa_id, v_estimacion_id, v_version_id, (v_item->>'job_function_id')::uuid,
            (v_item->>'quantity')::int, (v_item->>'planned_hours_per_day')::numeric, 
            (v_item->>'planned_days_per_week')::numeric, (v_item->>'total_hours')::numeric,
            (v_item->>'includes_accommodation')::boolean, (v_item->>'includes_transport')::boolean, 
            (v_item->>'includes_ppe')::boolean,
            (v_item->>'base_cost_hour')::numeric, (v_item->>'recommended_sell_rate')::numeric, 
            (v_item->>'minimum_sell_rate')::numeric, (v_item->>'sell_rate_hour')::numeric,
            (v_item->>'margin_percent')::numeric, v_item->>'risk_level', v_item->>'notes',
            v_user_id, v_user_id
        );
    END LOOP;

    v_total_estimated_cost := COALESCE((p_payload->>'total_estimated_cost')::numeric, 0);
    v_total_estimated_revenue := COALESCE((p_payload->>'total_estimated_revenue')::numeric, 0);
    v_margin_percent := COALESCE((p_payload->>'estimated_margin_percent')::numeric, 0);

    -- Atualizar totais na Versão
    UPDATE core_comercial.estimacion_versions
    SET 
        total_cost = v_total_estimated_cost,
        total_revenue = v_total_estimated_revenue,
        margin_percent = v_margin_percent
    WHERE id = v_version_id;

    -- 8. Custos adicionais
    IF p_payload->'costs' IS NOT NULL AND jsonb_array_length(p_payload->'costs') > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'costs')
        LOOP
            INSERT INTO core_comercial.estimacion_costs (
                empresa_id, estimacion_version_id,
                cost_category, description, amount, is_rechargeable, markup_percent,
                created_by, updated_by
            ) VALUES (
                v_empresa_id, v_version_id,
                v_item->>'cost_category', v_item->>'description', (v_item->>'amount')::numeric,
                (v_item->>'is_rechargeable')::boolean, (v_item->>'markup_percent')::numeric,
                v_user_id, v_user_id
            );
        END LOOP;
    END IF;

    -- 9. Retorno
    RETURN json_build_object(
        'status', 'success',
        'estimacion_id', v_estimacion_id,
        'codigo', v_codigo,
        'version_id', v_version_id,
        'total_cost', v_total_estimated_cost,
        'total_revenue', v_total_estimated_revenue,
        'margin_percent', v_margin_percent
    );
END;
$$;

-- 13. Atualizar RPC core_comercial.aprovar_estimacion com validação de lead_id
CREATE OR REPLACE FUNCTION core_comercial.aprovar_estimacion(p_estimacion_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' 
AS $$
DECLARE
    v_user_id UUID;
    v_est RECORD;
    v_items_count INT;
    v_pedido_count INT;
    v_pedido_id UUID;
    v_pedido_codigo VARCHAR;
    v_solicitudes_count INT;
    v_solicitud_id UUID;
    v_solicitud_codigo VARCHAR;
    v_tarefas_count INT;
BEGIN
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;

    -- 1. Buscar a estimación base
    SELECT * INTO v_est
    FROM core_comercial.estimaciones
    WHERE id = p_estimacion_id;

    IF v_est.id IS NULL THEN
        RAISE EXCEPTION 'Estimación % não encontrada', p_estimacion_id;
    END IF;

    -- 1.5. Validar se é lead
    IF v_est.client_id IS NULL THEN
        RAISE EXCEPTION 'Não é possível aprovar uma estimación criada para um Lead. Por favor, converta o Lead num Cliente antes de aprovar.';
    END IF;

    -- 2. Validar Permissões (super_admin ou operador)
    IF NOT (
        core_common.has_role(v_est.empresa_id, 'super_admin')
        OR core_common.has_role(v_est.empresa_id, 'operador')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para aprovar estimación na empresa %', v_est.empresa_id;
    END IF;

    -- 3. Validar estado da estimación
    IF v_est.status NOT IN ('sent', 'review', 'approved') THEN
        RAISE EXCEPTION 'A estimación está no status %, não pode ser convertida para pedido.', v_est.status;
    END IF;

    -- 4. Validar versão atual e local (client_site_id)
    IF v_est.current_version_id IS NULL THEN
        RAISE EXCEPTION 'A estimación não possui uma versão atual (current_version_id é nulo).';
    END IF;

    IF v_est.client_site_id IS NULL THEN
        RAISE EXCEPTION 'A estimación precisa ter uma obra/local antes de ser convertida em pedido.';
    END IF;

    -- 5. Validar itens
    SELECT COUNT(*) INTO v_items_count
    FROM core_comercial.estimacion_items
    WHERE estimacion_version_id = v_est.current_version_id;

    IF v_items_count = 0 THEN
        RAISE EXCEPTION 'A versão atual da estimación não possui nenhum item.';
    END IF;

    -- 6. Evitar duplicidade de Pedido
    SELECT id INTO v_pedido_id
    FROM core_comercial.pedidos
    WHERE source_estimacion_id = p_estimacion_id;

    IF v_pedido_id IS NOT NULL THEN
        RAISE EXCEPTION 'Esta estimación já foi convertida no pedido (ID: %).', v_pedido_id;
    END IF;

    -- 7. Gerar código do Pedido (PED-YYYY-000001)
    SELECT COUNT(*) INTO v_pedido_count
    FROM core_comercial.pedidos
    WHERE empresa_id = v_est.empresa_id 
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
      
    v_pedido_codigo := 'PED-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_pedido_count + 1)::TEXT, 6, '0');

    -- 8. Criar o Pedido
    INSERT INTO core_comercial.pedidos (
        empresa_id, codigo, source_estimacion_id, source_estimacion_version_id,
        client_id, client_site_id, order_type, commercial_status, operational_status,
        commercial_owner_id, responsible_id, approved_at, expected_start_date, expected_end_date,
        payment_terms, notes, total_cost_snapshot, total_revenue_snapshot, margin_percent_snapshot,
        created_by
    ) VALUES (
        v_est.empresa_id, 
        v_pedido_codigo, 
        p_estimacion_id, 
        v_est.current_version_id,
        v_est.client_id, 
        v_est.client_site_id, 
        CASE WHEN v_est.estimation_type IN ('new_allocation', 'expansion') THEN v_est.estimation_type ELSE 'new_allocation' END, 
        'active', 
        'pending_operations',
        v_est.commercial_owner_id, 
        v_est.commercial_owner_id, 
        NOW(), 
        v_est.expected_start_date, 
        v_est.expected_end_date,
        v_est.payment_terms, 
        v_est.general_notes, 
        v_est.total_estimated_cost, 
        v_est.total_estimated_revenue, 
        v_est.estimated_margin_percent,
        v_user_id
    ) RETURNING id INTO v_pedido_id;

    -- 9. Clonar os Itens para o Pedido
    INSERT INTO core_comercial.pedido_items (
        empresa_id, pedido_id, source_estimacion_item_id, job_function_id, job_function_name_snapshot,
        description_snapshot, risk_level_snapshot, quantity_requested, quantity_fulfilled,
        planned_hours_per_day, planned_days_per_week, planned_total_hours,
        sell_rate_hour_snapshot, base_cost_hour_snapshot, margin_percent_snapshot,
        includes_housing, includes_transport, includes_epi, status, created_by
    )
    SELECT
        v_est.empresa_id, 
        v_pedido_id, 
        id, 
        job_function_id, 
        job_function_name_snapshot,
        description, 
        risk_level_snapshot, 
        quantity, 
        0,
        planned_hours_per_day, 
        planned_days_per_week, 
        planned_total_hours,
        sell_rate_hour, 
        base_cost_hour, 
        margin_percent,
        includes_housing, 
        includes_transport, 
        includes_epi, 
        'pending', 
        v_user_id
    FROM core_comercial.estimacion_items
    WHERE estimacion_version_id = v_est.current_version_id;

    -- 10. Atualizar a Estimación para Approved
    UPDATE core_comercial.estimaciones
    SET status = 'approved', updated_at = NOW(), updated_by = v_user_id
    WHERE id = p_estimacion_id;

    -- 11. Registrar Evento do Pedido
    INSERT INTO core_comercial.pedido_events (
        empresa_id, pedido_id, event_type, title, description, new_values, created_by
    ) VALUES (
        v_est.empresa_id, 
        v_pedido_id, 
        'other', 
        'Pedido criado a partir de estimación', 
        'Convertido a partir da Estimación ' || COALESCE(v_est.codigo, p_estimacion_id::text), 
        jsonb_build_object('estimacion_id', p_estimacion_id, 'version_id', v_est.current_version_id), 
        v_user_id
    );

    -- 12. Registrar Histórico de Status
    INSERT INTO core_comercial.pedido_status_history (
        empresa_id, pedido_id, new_commercial_status, new_operational_status, reason, created_by
    ) VALUES (
        v_est.empresa_id, v_pedido_id, 'active', 'pending_operations', 'Pedido criado a partir de estimación aprovada', v_user_id
    );

    -- 13. Gerar código da Solicitud Operativa (SOL-YYYY-000001)
    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE empresa_id = v_est.empresa_id 
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
      
    v_solicitud_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');

    -- 14. Criar Solicitud Operativa apontando para o Pedido
    INSERT INTO core_operacoes.solicitudes_operativas (
        empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        pedido_id, tipo, title, description, priority, status,
        client_id, client_site_id, requested_by, requested_at, created_by
    ) VALUES (
        v_est.empresa_id, 
        v_solicitud_codigo, 
        'comercial', 
        'pedido', 
        v_pedido_id,
        v_pedido_id, 
        'new_order', 
        'Nuevo pedido / Mobilización inicial', 
        'Solicitud generada automáticamente a partir del pedido ' || v_pedido_codigo, 
        'normal', 
        'pending',
        v_est.client_id, 
        v_est.client_site_id, 
        v_user_id, 
        NOW(), 
        v_user_id
    ) RETURNING id INTO v_solicitud_id;

    -- 15. Iniciar a Malha Operacional (Playbook)
    PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);

    -- Conta as tarefas geradas
    SELECT COUNT(*) INTO v_tarefas_count
    FROM core_operacoes.solicitud_tareas
    WHERE solicitud_id = v_solicitud_id;

    -- 16. Retornar Resultado Estruturado
    RETURN json_build_object(
        'status', 'success',
        'pedido_id', v_pedido_id,
        'pedido_codigo', v_pedido_codigo,
        'solicitud_id', v_solicitud_id,
        'solicitud_codigo', v_solicitud_codigo,
        'tarefas_geradas', v_tarefas_count
    );
END;
$$;

-- Permissões
REVOKE ALL ON FUNCTION core_comercial.criar_estimacion_completa(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core_comercial.criar_estimacion_completa(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION core_comercial.aprovar_estimacion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core_comercial.aprovar_estimacion(UUID) TO authenticated;

COMMIT;
