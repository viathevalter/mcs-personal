-- Migration: 20261118104500_freeze_paid_holerite_tariff_and_totals.sql
-- Description: Freeze tarifa_hora and financial totals on core_personal.holerites when marked as paid

DO $$
BEGIN
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS tarifa_hora NUMERIC(10, 2);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

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
    v_snapshots JSONB := COALESCE(payload->'worker_snapshots', '{}'::jsonb);
    v_worker_snap JSONB;
    v_snap_tarifa NUMERIC(10, 2);
    v_snap_horas NUMERIC(10, 2);
    v_snap_proventos NUMERIC(10, 2);
    v_snap_descontos NUMERIC(10, 2);
    v_snap_liquido NUMERIC(10, 2);
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
        v_worker_snap := v_snapshots->(v_worker_id::TEXT);

        v_snap_tarifa := NULLIF(v_worker_snap->>'tarifa_hora', '')::NUMERIC;
        v_snap_horas := NULLIF(v_worker_snap->>'horas_trabalhadas', '')::NUMERIC;
        v_snap_proventos := NULLIF(v_worker_snap->>'total_proventos', '')::NUMERIC;
        v_snap_descontos := NULLIF(v_worker_snap->>'total_descontos', '')::NUMERIC;
        v_snap_liquido := NULLIF(v_worker_snap->>'valor_liquido', '')::NUMERIC;

        -- Fallback to current worker_beneficios_settings.tarifa_hora if not in snapshot
        IF v_snap_tarifa IS NULL THEN
            SELECT wbs.tarifa_hora
            INTO v_snap_tarifa
            FROM core_personal.worker_beneficios_settings wbs
            WHERE wbs.worker_id = v_worker_id
            LIMIT 1;
        END IF;

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
                tarifa_hora,
                horas_trabalhadas,
                total_proventos,
                total_descontos,
                valor_liquido,
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
                v_snap_tarifa,
                COALESCE(v_snap_horas, 0),
                COALESCE(v_snap_proventos, 0),
                COALESCE(v_snap_descontos, 0),
                COALESCE(v_snap_liquido, 0),
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
                tarifa_hora = COALESCE(tarifa_hora, v_snap_tarifa),
                horas_trabalhadas = COALESCE(v_snap_horas, horas_trabalhadas),
                total_proventos = COALESCE(v_snap_proventos, total_proventos),
                total_descontos = COALESCE(v_snap_descontos, total_descontos),
                valor_liquido = COALESCE(v_snap_liquido, valor_liquido),
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
