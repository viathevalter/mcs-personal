-- ========================================================================================
-- Migration: 20260527000000_compliance_cae_schema.sql
-- Description: Criação das tabelas do módulo de Conformidade e CAE (Compliance)
-- ========================================================================================

CREATE SCHEMA IF NOT EXISTS core_personal;

-- 1. Tabela: core_personal.client_compliance_configs
CREATE TABLE IF NOT EXISTS core_personal.client_compliance_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES core_common.clients(id) ON DELETE CASCADE,
    client_site_id UUID REFERENCES core_common.client_sites(id) ON DELETE CASCADE,
    uses_platform BOOLEAN NOT NULL DEFAULT false,
    platform_name VARCHAR(100),
    required_doc_types TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices e Constraints Únicas Parciais para tratar o client_site_id nulo
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_compliance_config_site 
ON core_personal.client_compliance_configs(empresa_id, client_id, client_site_id) 
WHERE client_site_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_client_compliance_config_no_site 
ON core_personal.client_compliance_configs(empresa_id, client_id) 
WHERE client_site_id IS NULL;


-- 2. Tabela: core_personal.worker_compliance_status
CREATE TABLE IF NOT EXISTS core_personal.worker_compliance_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    worker_id UUID NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES core_common.clients(id) ON DELETE CASCADE,
    client_site_id UUID NOT NULL REFERENCES core_common.client_sites(id) ON DELETE CASCADE,
    is_apto BOOLEAN NOT NULL DEFAULT false,
    overall_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (overall_status IN ('pending', 'submitted', 'partially_approved', 'approved', 'rejected')),
    notes TEXT,
    last_checked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(empresa_id, worker_id, client_id, client_site_id)
);


-- 3. Tabela: core_personal.worker_compliance_documents
CREATE TABLE IF NOT EXISTS core_personal.worker_compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    compliance_status_id UUID NOT NULL REFERENCES core_personal.worker_compliance_status(id) ON DELETE CASCADE,
    doc_type VARCHAR(100) NOT NULL,
    worker_document_id UUID REFERENCES core_personal.worker_documents(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'uploaded', 'pending_validation', 'approved', 'rejected')),
    expiry_date DATE,
    validation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(compliance_status_id, doc_type)
);


-- Triggers para atualização automática de modtime e auditoria
DROP TRIGGER IF EXISTS update_client_compliance_configs_modtime ON core_personal.client_compliance_configs;
CREATE TRIGGER update_client_compliance_configs_modtime BEFORE UPDATE ON core_personal.client_compliance_configs FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_worker_compliance_status_modtime ON core_personal.worker_compliance_status;
CREATE TRIGGER update_worker_compliance_status_modtime BEFORE UPDATE ON core_personal.worker_compliance_status FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_worker_compliance_documents_modtime ON core_personal.worker_compliance_documents;
CREATE TRIGGER update_worker_compliance_documents_modtime BEFORE UPDATE ON core_personal.worker_compliance_documents FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();


-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_compliance_configs_client ON core_personal.client_compliance_configs(client_id, client_site_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status_worker ON core_personal.worker_compliance_status(worker_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status_client ON core_personal.worker_compliance_status(client_id, client_site_id);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_status ON core_personal.worker_compliance_documents(compliance_status_id);


-- Permissões SQL para usuários autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON core_personal.client_compliance_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core_personal.worker_compliance_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core_personal.worker_compliance_documents TO authenticated;


-- Habilitar RLS nas tabelas
ALTER TABLE core_personal.client_compliance_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_compliance_documents ENABLE ROW LEVEL SECURITY;


-- 4. Políticas de RLS
-- Apenas super_admin global ou papel cae_compliance na empresa tem acesso total (SELECT, INSERT, UPDATE, DELETE)

CREATE POLICY "Acesso total compliance_configs se super_admin ou cae_compliance"
ON core_personal.client_compliance_configs FOR ALL TO authenticated
USING (
    core_common.has_role(empresa_id, 'cae_compliance')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'::app_role)
)
WITH CHECK (
    core_common.has_role(empresa_id, 'cae_compliance')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'::app_role)
);

CREATE POLICY "Acesso total compliance_status se super_admin ou cae_compliance"
ON core_personal.worker_compliance_status FOR ALL TO authenticated
USING (
    core_common.has_role(empresa_id, 'cae_compliance')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'::app_role)
)
WITH CHECK (
    core_common.has_role(empresa_id, 'cae_compliance')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'::app_role)
);

CREATE POLICY "Acesso total compliance_docs se super_admin ou cae_compliance"
ON core_personal.worker_compliance_documents FOR ALL TO authenticated
USING (
    core_common.has_role(empresa_id, 'cae_compliance')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'::app_role)
)
WITH CHECK (
    core_common.has_role(empresa_id, 'cae_compliance')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'::app_role)
);
