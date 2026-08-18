-- Migration: 20260818110000_seed_benefit_categories.sql
-- Description: Seed the 10 standard benefit/earning categories for all companies and holding

DO $$
DECLARE
    v_emp RECORD;
    v_cat TEXT;
    v_categories TEXT[] := ARRAY[
        'AUXILIO MORADIA',
        'HORAS EXTRAS',
        'TRABALHO NOTURNO',
        'SUBSÍDIO ALIMENTAÇÃO',
        'REEMBOLSO DE DESPESAS',
        'HORAS PENDENTES',
        'SUBSÍDIO TRANSPORTE',
        'AJUDA DE CUSTO',
        'FÉRIAS',
        'OUTROS'
    ];
BEGIN
    -- 1. Ensure table core_personal.benefit_categories exists and has no RLS blocking
    ALTER TABLE core_personal.benefit_categories DISABLE ROW LEVEL SECURITY;

    -- 2. Insert for holding and all active companies
    FOR v_emp IN (SELECT id FROM core_common.empresas)
    LOOP
        FOREACH v_cat IN ARRAY v_categories
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM core_personal.benefit_categories 
                WHERE empresa_id = v_emp.id AND UPPER(TRIM(name)) = v_cat
            ) THEN
                INSERT INTO core_personal.benefit_categories (empresa_id, name)
                VALUES (v_emp.id, v_cat);
            END IF;
        END LOOP;
    END LOOP;

    -- 3. Also insert for global holding UUID if not in loop
    FOREACH v_cat IN ARRAY v_categories
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM core_personal.benefit_categories 
            WHERE empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d' AND UPPER(TRIM(name)) = v_cat
        ) THEN
            INSERT INTO core_personal.benefit_categories (empresa_id, name)
            VALUES ('bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d', v_cat);
        END IF;
    END LOOP;
END $$;
