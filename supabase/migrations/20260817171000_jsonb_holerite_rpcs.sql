-- Migration: 20260817171000_jsonb_holerite_rpcs.sql
-- Description: Robust JSONB RPCs for saving and deleting holerite events with SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.salvar_evento_holerite(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_worker_id UUID := (payload->>'worker_id')::UUID;
    v_empresa_id UUID := (payload->>'empresa_id')::UUID;
    v_mes_referencia TEXT := COALESCE(payload->>'mes_referencia', '2026-07');
    v_tipo TEXT := COALESCE(payload->>'tipo', 'desconto');
    v_categoria TEXT := COALESCE(payload->>'categoria', 'Outros');
    v_valor NUMERIC := COALESCE((payload->>'valor')::NUMERIC, 0);
    v_descricao TEXT := payload->>'descricao';
    v_horas_referencia NUMERIC := (payload->>'horas_referencia')::NUMERIC;
    
    v_holerite_id UUID;
    v_month_date DATE := (SUBSTRING(v_mes_referencia FROM 1 FOR 7) || '-01')::DATE;
    v_new_event_id UUID := gen_random_uuid();
    v_tipo_enum core_personal.tipo_evento_holerite;
BEGIN
    IF v_empresa_id IS NULL THEN
        SELECT empresa_id INTO v_empresa_id FROM core_personal.workers WHERE id = v_worker_id;
    END IF;
    IF v_empresa_id IS NULL THEN
        v_empresa_id := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::UUID;
    END IF;

    IF LOWER(v_tipo) IN ('desconto', 'debito') THEN
        v_tipo_enum := 'desconto'::core_personal.tipo_evento_holerite;
    ELSE
        v_tipo_enum := 'provento'::core_personal.tipo_evento_holerite;
    END IF;

    -- 1. Find or create parent holerite
    SELECT id INTO v_holerite_id
    FROM core_personal.holerites
    WHERE worker_id = v_worker_id
      AND mes_referencia = v_month_date
    LIMIT 1;

    IF v_holerite_id IS NULL THEN
        INSERT INTO core_personal.holerites (empresa_id, worker_id, mes_referencia, status)
        VALUES (v_empresa_id, v_worker_id, v_month_date, 'rascunho')
        RETURNING id INTO v_holerite_id;
    END IF;

    -- 2. Insert the event
    INSERT INTO core_personal.holerite_eventos (
        id,
        holerite_id,
        tipo_evento,
        categoria,
        descricao,
        valor,
        referencia_dias_horas
    ) VALUES (
        v_new_event_id,
        v_holerite_id,
        v_tipo_enum,
        v_categoria,
        COALESCE(v_descricao, 'Lançamento Manual'),
        v_valor,
        v_horas_referencia
    );

    RETURN jsonb_build_object(
        'success', true,
        'evento_id', v_new_event_id,
        'holerite_id', v_holerite_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.salvar_evento_holerite(jsonb) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.remover_evento_holerite(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_evento_id UUID := (payload->>'evento_id')::UUID;
BEGIN
    DELETE FROM core_personal.holerite_eventos WHERE id = v_evento_id;
    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.remover_evento_holerite(jsonb) TO authenticated, anon, service_role;
