-- ========================================================================================
-- Migration: 20260525180000_commercial_contracts.sql
-- Description: Add commercial contract document URLs to proposal signatures
-- ========================================================================================

BEGIN;

-- 1. Adicionar as colunas para o contrato comercial na tabela proposal_signatures
ALTER TABLE core_comercial.proposal_signatures 
ADD COLUMN IF NOT EXISTS contract_document_url TEXT,
ADD COLUMN IF NOT EXISTS contract_signed_document_url TEXT;

-- 2. Garantir que as políticas de RLS no storage.objects cobrem os novos caminhos
-- Nota: A política "Permitir leitura pública de propostas assinadas/geradas" no storage.objects já lê da tabela
-- core_comercial.proposal_signatures, então vamos atualizá-la ou recriá-la para incluir as novas colunas.
DROP POLICY IF EXISTS "Permitir leitura pública de propostas assinadas/geradas" ON storage.objects;

CREATE POLICY "Permitir leitura pública de propostas assinadas/geradas"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
    bucket_id = 'proposal-signatures' AND
    (EXISTS (
        SELECT 1 FROM core_comercial.proposal_signatures ps
        WHERE ps.document_url = name 
           OR ps.signed_document_url = name
           OR ps.contract_document_url = name
           OR ps.contract_signed_document_url = name
    ))
);

COMMIT;
