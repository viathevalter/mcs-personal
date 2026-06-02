-- ========================================================================================
-- Migration: 20260520000002_public_contracts_storage_policy.sql
-- Description: Adiciona política para permitir que o trabalhador (anon) leia seu próprio contrato do storage
-- ========================================================================================

CREATE POLICY "Permitir leitura pública de contratos registrados"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'worker-contracts' AND
    (EXISTS (
        SELECT 1 FROM core_personal.contracts c
        WHERE c.document_url = name
    ))
);
