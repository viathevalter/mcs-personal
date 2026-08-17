-- Migration: 20260817170000_fix_holerites_rls_and_rpc.sql
-- Description: Fix RLS policies for holerites and holerite_eventos, allow text categories, and create salvar_evento_holerite RPC

-- 1. Alter categoria in holerite_eventos to TEXT to support all dynamic categories
DO $$ 
BEGIN
    ALTER TABLE core_personal.holerite_eventos ALTER COLUMN categoria TYPE TEXT;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Enable RLS and reset policies for holerites and holerite_eventos
ALTER TABLE core_personal.holerites ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.holerite_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable ALL for authenticated admins on holerites" ON core_personal.holerites;
DROP POLICY IF EXISTS "Enable ALL for authenticated admins on holerite_eventos" ON core_personal.holerite_eventos;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on holerites" ON core_personal.holerites;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on holerite_eventos" ON core_personal.holerite_eventos;

CREATE POLICY "Enable ALL for authenticated users on holerites" 
ON core_personal.holerites FOR ALL TO authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "Enable ALL for authenticated users on holerite_eventos" 
ON core_personal.holerite_eventos FOR ALL TO authenticated 
USING (true) WITH CHECK (true);

-- 3. Create or replace the salvar_evento_holerite RPC with SECURITY DEFINER
CREATE OR REPLACE FUNCTION core_personal.salvar_evento_holerite(
    p_worker_id UUID,
    p_empresa_id UUID DEFAULT NULL,
    p_mes_referencia TEXT DEFAULT '2026-07',
    p_tipo TEXT DEFAULT 'desconto',
    p_categoria TEXT DEFAULT 'Outros',
    p_valor NUMERIC DEFAULT 0,
    p_descricao TEXT DEFAULT NULL,
    p_horas_referencia NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_holerite_id UUID;
    v_month_date DATE := (SUBSTRING(p_mes_referencia FROM 1 FOR 7) || '-01')::DATE;
    v_empresa_id UUID := p_empresa_id;
    v_new_event_id UUID := gen_random_uuid();
    v_tipo core_personal.tipo_evento_holerite;
BEGIN
    IF v_empresa_id IS NULL THEN
        SELECT empresa_id INTO v_empresa_id FROM core_personal.workers WHERE id = p_worker_id;
    END IF;
    IF v_empresa_id IS NULL THEN
        v_empresa_id := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::UUID;
    END IF;

    IF LOWER(p_tipo) IN ('desconto', 'debito') THEN
        v_tipo := 'desconto'::core_personal.tipo_evento_holerite;
    ELSE
        v_tipo := 'provento'::core_personal.tipo_evento_holerite;
    END IF;

    -- 1. Find or create parent holerite
    SELECT id INTO v_holerite_id
    FROM core_personal.holerites
    WHERE worker_id = p_worker_id
      AND mes_referencia = v_month_date
    LIMIT 1;

    IF v_holerite_id IS NULL THEN
        INSERT INTO core_personal.holerites (empresa_id, worker_id, mes_referencia, status)
        VALUES (v_empresa_id, p_worker_id, v_month_date, 'rascunho')
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
        v_tipo,
        p_categoria,
        COALESCE(p_descricao, 'Lançamento Manual'),
        p_valor,
        p_horas_referencia
    );

    RETURN v_new_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core_personal.salvar_evento_holerite TO authenticated, anon;
