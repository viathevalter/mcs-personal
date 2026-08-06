-- Migration: Tariff Authorization Requests & Worker Tariff Audit Logs
-- Schema: core_personal

CREATE TABLE IF NOT EXISTS core_personal.tariff_authorization_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_termo TEXT NOT NULL UNIQUE,
    solicitante_id UUID,
    solicitante_nome TEXT NOT NULL,
    gerente_nome TEXT NOT NULL,
    gerente_email TEXT,
    gerente_phone TEXT,
    motivo_alteracao TEXT,
    status TEXT NOT NULL DEFAULT 'PENDENTE',
    token_assinatura TEXT NOT NULL UNIQUE,
    itens_solicitacao JSONB NOT NULL DEFAULT '[]'::jsonb,
    assinatura_base64 TEXT,
    assinado_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_personal.worker_tariff_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL,
    request_id UUID REFERENCES core_personal.tariff_authorization_requests(id) ON DELETE SET NULL,
    tarifa_anterior NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tarifa_nova NUMERIC(10, 2) NOT NULL DEFAULT 0,
    alterado_por_nome TEXT NOT NULL,
    autorizado_por_nome TEXT NOT NULL,
    documento_autorizacao_url TEXT,
    motivo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_tariff_auth_token ON core_personal.tariff_authorization_requests(token_assinatura);
CREATE INDEX IF NOT EXISTS idx_tariff_auth_status ON core_personal.tariff_authorization_requests(status);
CREATE INDEX IF NOT EXISTS idx_tariff_audit_worker ON core_personal.worker_tariff_audit_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_tariff_audit_created ON core_personal.worker_tariff_audit_logs(created_at DESC);

-- Grants
GRANT ALL ON TABLE core_personal.tariff_authorization_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE core_personal.worker_tariff_audit_logs TO anon, authenticated, service_role;

-- Disable RLS to allow seamless manager public signing and system logging
ALTER TABLE core_personal.tariff_authorization_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_tariff_audit_logs DISABLE ROW LEVEL SECURITY;
