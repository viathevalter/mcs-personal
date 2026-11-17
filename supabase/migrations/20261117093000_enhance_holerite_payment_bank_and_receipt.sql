-- Migration: 20261117093000_enhance_holerite_payment_bank_and_receipt.sql
-- Description: Add bank selection and payment receipt attachment to holerite payments and auto-archive in worker_documents

DO $$
BEGIN
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS banco_id UUID;
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS banco_pagamento TEXT;
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS comprovante_url TEXT;
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS comprovante_nome TEXT;
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS worker_document_id UUID;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Ensure storage bucket comprovantes-financeiro is public and allows uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-financeiro', 'comprovantes-financeiro', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read comprovantes_financeiro storage" ON storage.objects;
CREATE POLICY "Public read comprovantes_financeiro storage"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comprovantes-financeiro');

DROP POLICY IF EXISTS "Public upload comprovantes_financeiro storage" ON storage.objects;
CREATE POLICY "Public upload comprovantes_financeiro storage"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'comprovantes-financeiro');

DROP POLICY IF EXISTS "Public update comprovantes_financeiro storage" ON storage.objects;
CREATE POLICY "Public update comprovantes_financeiro storage"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'comprovantes-financeiro');

-- Updated RPC to mark holerites as paid with bank and receipt attachment + worker_documents archiving
CREATE OR REPLACE FUNCTION public.marcar_holerites_pagos(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core_personal, core_common
AS $$
DECLARE
    v_worker_ids UUID[];
    v_mes_referencia TEXT := COALESCE(NULLIF(payload->>'mes_referencia', ''), '2026-07');
    v_month_date DATE := (SUBSTRING(v_mes_referencia FROM 1 FOR 7) || '-01')::DATE;
    v_data_pagamento DATE := COALESCE(NULLIF(payload->>'data_pagamento', '')::DATE, CURRENT_DATE);
    v_metodo_pagamento TEXT := COALESCE(NULLIF(payload->>'metodo_pagamento', ''), 'Transferência Bancária');
    v_banco_id UUID := NULLIF(payload->>'banco_id', '')::UUID;
    v_banco_pagamento TEXT := NULLIF(payload->>'banco_pagamento', '');
    v_comprovante_url TEXT := NULLIF(payload->>'comprovante_url', '');
    v_comprovante_nome TEXT := NULLIF(payload->>'comprovante_nome', '');
    v_comprovante_size BIGINT := COALESCE(NULLIF(payload->>'comprovante_size', '')::BIGINT, 102400);
    v_comprovante_mime TEXT := COALESCE(NULLIF(payload->>'comprovante_mime', ''), 'application/pdf');
    v_observacao_pagamento TEXT := NULLIF(payload->>'observacao_pagamento', '');
    v_empresa_id UUID := NULLIF(payload->>'empresa_id', '')::UUID;
    v_worker_empresa_id UUID;
    v_worker_id UUID;
    v_holerite_id UUID;
    v_existing_doc_id UUID;
    v_doc_id UUID;
    v_doc_file_name TEXT;
    v_count INT := 0;
BEGIN
    IF v_empresa_id IS NULL THEN
        v_empresa_id := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::UUID;
    END IF;

    SELECT ARRAY(SELECT jsonb_array_elements_text(payload->'worker_ids')::UUID) INTO v_worker_ids;

    IF v_worker_ids IS NULL OR array_length(v_worker_ids, 1) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nenhum trabalhador selecionado');
    END IF;

    FOREACH v_worker_id IN ARRAY v_worker_ids
    LOOP
        v_doc_id := NULL;

        -- Resolve worker's empresa_id for worker_documents
        SELECT COALESCE(w.empresa_id, v_empresa_id)
        INTO v_worker_empresa_id
        FROM core_personal.workers w
        WHERE w.id = v_worker_id
        LIMIT 1;

        IF v_worker_empresa_id IS NULL THEN
            v_worker_empresa_id := v_empresa_id;
        END IF;

        -- Find existing holerite for this worker and month
        SELECT id, worker_document_id
        INTO v_holerite_id, v_existing_doc_id
        FROM core_personal.holerites
        WHERE worker_id = v_worker_id
          AND mes_referencia = v_month_date
        LIMIT 1;

        -- If a payment receipt was uploaded, store/update it in core_personal.worker_documents
        IF v_comprovante_url IS NOT NULL THEN
            v_doc_file_name := 'Comprovante_Folha_' || SUBSTRING(v_mes_referencia FROM 1 FOR 7) || '_' || COALESCE(v_comprovante_nome, 'pagamento.pdf');

            IF v_existing_doc_id IS NOT NULL THEN
                UPDATE core_personal.worker_documents
                SET file_path = v_comprovante_url,
                    file_name = v_doc_file_name,
                    file_size = v_comprovante_size,
                    mime_type = v_comprovante_mime
                WHERE id = v_existing_doc_id
                RETURNING id INTO v_doc_id;
            END IF;

            IF v_doc_id IS NULL THEN
                INSERT INTO core_personal.worker_documents (
                    empresa_id,
                    worker_id,
                    doc_type,
                    file_path,
                    file_name,
                    file_size,
                    mime_type
                ) VALUES (
                    v_worker_empresa_id,
                    v_worker_id,
                    'comprovante_pagamento',
                    v_comprovante_url,
                    v_doc_file_name,
                    v_comprovante_size,
                    v_comprovante_mime
                )
                RETURNING id INTO v_doc_id;
            END IF;
        END IF;

        IF v_holerite_id IS NULL THEN
            INSERT INTO core_personal.holerites (
                empresa_id,
                worker_id,
                mes_referencia,
                status,
                data_pagamento,
                metodo_pagamento,
                banco_id,
                banco_pagamento,
                comprovante_url,
                comprovante_nome,
                worker_document_id,
                observacao_pagamento
            )
            VALUES (
                v_worker_empresa_id,
                v_worker_id,
                v_month_date,
                'pago',
                v_data_pagamento,
                v_metodo_pagamento,
                v_banco_id,
                v_banco_pagamento,
                v_comprovante_url,
                v_comprovante_nome,
                v_doc_id,
                v_observacao_pagamento
            )
            RETURNING id INTO v_holerite_id;
        ELSE
            UPDATE core_personal.holerites
            SET status = 'pago',
                data_pagamento = v_data_pagamento,
                metodo_pagamento = v_metodo_pagamento,
                banco_id = v_banco_id,
                banco_pagamento = v_banco_pagamento,
                comprovante_url = COALESCE(v_comprovante_url, comprovante_url),
                comprovante_nome = COALESCE(v_comprovante_nome, comprovante_nome),
                worker_document_id = COALESCE(v_doc_id, worker_document_id),
                observacao_pagamento = COALESCE(v_observacao_pagamento, observacao_pagamento),
                updated_at = NOW()
            WHERE id = v_holerite_id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'count', v_count,
        'data_pagamento', v_data_pagamento,
        'metodo_pagamento', v_metodo_pagamento,
        'banco_pagamento', v_banco_pagamento,
        'comprovante_url', v_comprovante_url
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_holerites_pagos(jsonb) TO authenticated, anon, service_role;
