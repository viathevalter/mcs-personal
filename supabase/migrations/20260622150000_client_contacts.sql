-- Migration: 20260622150000_client_contacts.sql
-- Description: Client contacts table, trigger, and RLS policies.

BEGIN;

CREATE TABLE IF NOT EXISTS core_common.client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES core_common.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT, -- e.g., 'financeiro', 'diretor', 'comercial', 'encarregado' or custom
    phone VARCHAR(50),
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Trigger set_client_contacts_updated_at
CREATE OR REPLACE TRIGGER set_client_contacts_updated_at 
BEFORE UPDATE ON core_common.client_contacts 
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Indexar FK de busca
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON core_common.client_contacts(client_id);

-- RLS
ALTER TABLE core_common.client_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de contatos de clientes por empresa" ON core_common.client_contacts;
CREATE POLICY "Leitura de contatos de clientes por empresa" ON core_common.client_contacts
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM core_common.clients c 
        WHERE c.id = client_contacts.client_id AND core_common.is_member(c.empresa_id)
    )
);

DROP POLICY IF EXISTS "Escrita de contatos de clientes por empresa" ON core_common.client_contacts;
CREATE POLICY "Escrita de contatos de clientes por empresa" ON core_common.client_contacts
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM core_common.clients c 
        WHERE c.id = client_contacts.client_id AND core_common.is_member(c.empresa_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM core_common.clients c 
        WHERE c.id = client_contacts.client_id AND core_common.is_member(c.empresa_id)
    )
);

GRANT ALL PRIVILEGES ON core_common.client_contacts TO postgres, service_role, authenticated;

COMMIT;
