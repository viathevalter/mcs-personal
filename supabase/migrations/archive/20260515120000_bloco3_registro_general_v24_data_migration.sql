-- ==============================================================================
-- Migração Evolutiva - Carga de Dados Legados (Bloco 3)
-- ==============================================================================

-- NOTA IMPORTANTE: 
-- Como as tabelas legadas ("function", "epi", etc) podem ter nomenclaturas diferentes 
-- no seu schema public, este script serve como um gabarito para fazer o "De -> Para"
-- garantindo a integridade dos UUIDs e chaves estrangeiras.

DO $$
DECLARE
    -- Ajuste este ID para a empresa padrao onde os registros antigos serao inseridos
    default_empresa_id UUID := '00000000-0000-0000-0000-000000000000'; -- <- COLOCAR O ID DA EMPRESA AQUI
BEGIN

    -- Se você quiser descobrir o ID da sua empresa principal automaticamente, pode descomentar a linha abaixo:
    -- SELECT id INTO default_empresa_id FROM core_common.empresas LIMIT 1;

    --------------------------------------------------------------------------------
    -- 1. MIGRAÇÃO DE EPIs (Logística)
    --------------------------------------------------------------------------------
    -- Supondo que a tabela legada seja public.epi ou public.epis
    
    /* 
    INSERT INTO core_logistica.epis (id, empresa_id, code, name, description, status, created_at)
    SELECT 
        id, -- Preservamos o UUID original para nao quebrar relacoes!
        default_empresa_id,
        codigo, -- Substitua pelas colunas reais
        nome,
        descricao,
        'active',
        coalesce(created_at, now())
    FROM public.epi
    ON CONFLICT (id) DO NOTHING; -- Evita erro se ja foi inserido
    */


    --------------------------------------------------------------------------------
    -- 2. MIGRAÇÃO DE FUNÇÕES (Comercial)
    --------------------------------------------------------------------------------
    -- Supondo que a tabela legada seja public.function
    
    /*
    INSERT INTO core_comercial.job_functions (id, empresa_id, code, name, short_description, risk_level, status, created_at)
    SELECT 
        id,
        default_empresa_id,
        codigo,
        nome,
        descricao,
        'baixo', -- Ou mapeie a coluna de risco antigo
        'active',
        coalesce(created_at, now())
    FROM public."function"
    ON CONFLICT (id) DO NOTHING;
    */


    --------------------------------------------------------------------------------
    -- 3. MIGRAÇÃO DAS PERGUNTAS VINCULADAS
    --------------------------------------------------------------------------------
    -- O texto da pergunta que o vendedor preenchia ficava salvo onde?
    -- Se havia uma coluna "perguntas_triagem" na propria tabela function:
    
    /*
    INSERT INTO core_comercial.job_function_questions (empresa_id, job_function_id, question_text, question_type, is_required)
    SELECT 
        default_empresa_id,
        id, -- ID da funcao
        perguntas_triagem, -- A coluna legada que tinha o texto
        'long_text', -- Deixamos como long_text por padrao pra manter o legado
        false
    FROM public."function"
    WHERE perguntas_triagem IS NOT NULL AND perguntas_triagem <> '';
    */

END
$$;
