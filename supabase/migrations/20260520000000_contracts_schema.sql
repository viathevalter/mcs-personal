-- ========================================================================================
-- Migration: 20260520000000_contracts_schema.sql
-- Description: Criação das tabelas de contratos e logs de auditoria de assinaturas eletrônicas
-- ========================================================================================

-- 1. Criar tabela de contratos
CREATE TABLE IF NOT EXISTS core_personal.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES core_personal.worker_assignments(id) ON DELETE SET NULL,
    
    contratante VARCHAR(255) NOT NULL, -- ex: 'Wiseowe', 'Luminous', 'Triangulo', 'Stocco'
    contract_type VARCHAR(100) NOT NULL, -- ex: 'niss', 'trabalho_geral', 'termo_incerto', 'rescisao'
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'pending_signature', 'signed', 'cancelled', 'terminated'
    
    document_url TEXT, -- Link do DOCX/HTML/PDF inicial no Storage
    signed_document_url TEXT, -- Link do PDF final com a folha de assinatura no Storage
    
    signature_token UUID UNIQUE DEFAULT gen_random_uuid(), -- Token para a URL pública de assinatura
    otp_code VARCHAR(10), -- Código OTP atual enviado por e-mail
    otp_expires_at TIMESTAMP WITH TIME ZONE, -- Validade do OTP
    
    sent_at TIMESTAMP WITH TIME ZONE,
    signed_at TIMESTAMP WITH TIME ZONE,
    terminated_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Indexar campos mais comuns para performance
CREATE INDEX IF NOT EXISTS idx_contracts_worker_id ON core_personal.contracts(worker_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signature_token ON core_personal.contracts(signature_token);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON core_personal.contracts(status);

-- 2. Criar tabela de logs de auditoria de assinatura eletrônica
CREATE TABLE IF NOT EXISTS core_personal.contract_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES core_personal.contracts(id) ON DELETE CASCADE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    verification_code VARCHAR(10) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_or_phone_used VARCHAR(255) NOT NULL
);

-- Indexar chave estrangeira
CREATE INDEX IF NOT EXISTS idx_contract_audit_logs_contract_id ON core_personal.contract_audit_logs(contract_id);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE core_personal.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.contract_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Criar Políticas RLS para core_personal.contracts
CREATE POLICY "Permitir leitura pública por token de assinatura" 
ON core_personal.contracts 
FOR SELECT 
TO anon, authenticated 
USING (signature_token IS NOT NULL);

CREATE POLICY "Permitir membros visualizarem contratos de sua empresa"
ON core_personal.contracts
FOR SELECT
TO authenticated
USING (core_common.is_member(empresa_id));

CREATE POLICY "Permitir admin e rh gerenciarem contratos de sua empresa"
ON core_personal.contracts
FOR ALL
TO authenticated
USING (core_common.has_role(empresa_id, 'admin') OR core_common.has_role(empresa_id, 'rh'));

-- 5. Criar Políticas RLS para core_personal.contract_audit_logs
CREATE POLICY "Permitir inserção pública de logs de assinatura"
ON core_personal.contract_audit_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Permitir membros visualizarem logs de auditoria de sua empresa"
ON core_personal.contract_audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM core_personal.contracts c
        WHERE c.id = contract_audit_logs.contract_id
          AND core_common.is_member(c.empresa_id)
    )
);

-- 6. Garantir privilégios
GRANT ALL PRIVILEGES ON core_personal.contracts TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON core_personal.contract_audit_logs TO postgres, service_role, authenticated, anon;
