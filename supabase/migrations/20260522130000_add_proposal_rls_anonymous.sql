-- Migration: 20260522130000_add_proposal_rls_anonymous.sql
-- Description: Add RLS policies for anonymous proposal preview

BEGIN;

-- Criar políticas RLS para consulta anônima na estimación
DROP POLICY IF EXISTS "Permitir leitura pública de estimaciones vinculadas a proposta" ON core_comercial.estimaciones;
CREATE POLICY "Permitir leitura pública de estimaciones vinculadas a proposta"
ON core_comercial.estimaciones FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM core_comercial.proposal_signatures ps
        WHERE ps.estimacion_id = core_comercial.estimaciones.id
    )
);

-- Criar políticas RLS para consulta anônima em leads
DROP POLICY IF EXISTS "Permitir leitura pública de leads vinculados a estimaciones de proposta" ON core_comercial.leads;
CREATE POLICY "Permitir leitura pública de leads vinculados a estimaciones de proposta"
ON core_comercial.leads FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM core_comercial.estimaciones est
        JOIN core_comercial.proposal_signatures ps ON ps.estimacion_id = est.id
        WHERE est.lead_id = core_comercial.leads.id
    )
);

-- Criar políticas RLS para consulta anônima em clients
DROP POLICY IF EXISTS "Permitir leitura pública de clients vinculados a estimaciones de proposta" ON core_common.clients;
CREATE POLICY "Permitir leitura pública de clients vinculados a estimaciones de proposta"
ON core_common.clients FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM core_comercial.estimaciones est
        JOIN core_comercial.proposal_signatures ps ON ps.estimacion_id = est.id
        WHERE est.client_id = core_common.clients.id
    )
);

-- Conceder USAGE no schema core_comercial para anon
GRANT USAGE ON SCHEMA core_comercial TO anon;

-- Conceder SELECT nas tabelas necessárias para consulta pública da proposta
GRANT SELECT ON core_comercial.estimaciones TO anon;
GRANT SELECT ON core_comercial.leads TO anon;

COMMIT;
