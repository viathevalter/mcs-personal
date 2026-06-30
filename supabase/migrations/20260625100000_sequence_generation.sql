-- Criação da função para geração dinâmica do próximo código de colaborador
CREATE OR REPLACE FUNCTION core_personal.fn_generate_next_cod_colab()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_num int;
    v_next_code text;
BEGIN
    -- Seleciona a maior parte numérica dos códigos que começam com 'E' e têm apenas dígitos depois
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN cod_colab ~ '^E[0-9]+$' THEN substring(cod_colab from 2)::int
                ELSE 0
            END
        ), 
        0
    ) INTO v_max_num
    FROM core_personal.workers
    WHERE cod_colab ~ '^E[0-9]+$';

    -- O formato de saída é 'E' + número formatado com no mínimo 4 dígitos (ex: E2179)
    IF v_max_num < 9999 THEN
        v_next_code := 'E' || lpad((v_max_num + 1)::text, 4, '0');
    ELSE
        v_next_code := 'E' || (v_max_num + 1)::text;
    END IF;

    RETURN v_next_code;
END;
$$;

GRANT EXECUTE ON FUNCTION core_personal.fn_generate_next_cod_colab() TO authenticated;
GRANT EXECUTE ON FUNCTION core_personal.fn_generate_next_cod_colab() TO service_role;
