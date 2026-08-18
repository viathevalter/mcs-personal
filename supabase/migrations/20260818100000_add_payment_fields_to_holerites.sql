-- Migration: 20260818100000_add_payment_fields_to_holerites.sql
-- Description: Add payment columns and batch/individual payment RPCs

DO $$ 
BEGIN
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS data_pagamento DATE;
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'Transferência Bancária';
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS pago_por UUID;
    ALTER TABLE core_personal.holerites ADD COLUMN IF NOT EXISTS observacao_pagamento TEXT;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- RPC to mark holerites as paid (in batch or individual)
CREATE OR REPLACE FUNCTION public.marcar_holerites_pagos(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_worker_ids UUID[];
    v_mes_referencia TEXT := COALESCE(payload->>'mes_referencia', '2026-07');
    v_month_date DATE := (SUBSTRING(v_mes_referencia FROM 1 FOR 7) || '-01')::DATE;
    v_data_pagamento DATE := COALESCE((payload->>'data_pagamento')::DATE, CURRENT_DATE);
    v_metodo_pagamento TEXT := COALESCE(payload->>'metodo_pagamento', 'Transferência Bancária');
    v_empresa_id UUID := (payload->>'empresa_id')::UUID;
    v_worker_id UUID;
    v_holerite_id UUID;
    v_count INT := 0;
BEGIN
    IF v_empresa_id IS NULL THEN
        v_empresa_id := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::UUID;
    END IF;

    -- Extract array of worker IDs
    SELECT ARRAY(SELECT jsonb_array_elements_text(payload->'worker_ids')::UUID) INTO v_worker_ids;

    IF v_worker_ids IS NULL OR array_length(v_worker_ids, 1) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nenhum trabalhador selecionado');
    END IF;

    FOREACH v_worker_id IN ARRAY v_worker_ids
    LOOP
        -- Find or create parent holerite
        SELECT id INTO v_holerite_id
        FROM core_personal.holerites
        WHERE worker_id = v_worker_id
          AND mes_referencia = v_month_date
        LIMIT 1;

        IF v_holerite_id IS NULL THEN
            INSERT INTO core_personal.holerites (empresa_id, worker_id, mes_referencia, status, data_pagamento, metodo_pagamento)
            VALUES (v_empresa_id, v_worker_id, v_month_date, 'pago', v_data_pagamento, v_metodo_pagamento)
            RETURNING id INTO v_holerite_id;
        ELSE
            UPDATE core_personal.holerites
            SET status = 'pago',
                data_pagamento = v_data_pagamento,
                metodo_pagamento = v_metodo_pagamento,
                updated_at = NOW()
            WHERE id = v_holerite_id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'count', v_count,
        'data_pagamento', v_data_pagamento
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_holerites_pagos(jsonb) TO authenticated, anon, service_role;

-- RPC to revert/unmark payment
CREATE OR REPLACE FUNCTION public.estornar_holerite_pagamento(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_worker_id UUID := (payload->>'worker_id')::UUID;
    v_mes_referencia TEXT := COALESCE(payload->>'mes_referencia', '2026-07');
    v_month_date DATE := (SUBSTRING(v_mes_referencia FROM 1 FOR 7) || '-01')::DATE;
    v_holerite_id UUID := (payload->>'holerite_id')::UUID;
BEGIN
    IF v_holerite_id IS NOT NULL THEN
        UPDATE core_personal.holerites
        SET status = 'rascunho',
            data_pagamento = NULL,
            updated_at = NOW()
        WHERE id = v_holerite_id;
    ELSIF v_worker_id IS NOT NULL THEN
        UPDATE core_personal.holerites
        SET status = 'rascunho',
            data_pagamento = NULL,
            updated_at = NOW()
        WHERE worker_id = v_worker_id
          AND mes_referencia = v_month_date;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.estornar_holerite_pagamento(jsonb) TO authenticated, anon, service_role;
