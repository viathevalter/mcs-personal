-- Structured Technical Questions Migration
DO $$
DECLARE
    v_empresa_id UUID;
    v_jf_id UUID;
BEGIN
    -- Seleciona a primeira empresa disponível para vincular as perguntas
    SELECT id INTO v_empresa_id FROM core_common.empresas LIMIT 1;
    
    IF v_empresa_id IS NULL THEN
        RAISE NOTICE 'Nenhuma empresa encontrada para vincular as perguntas.';
        RETURN;
    END IF;

    ---------------------------------------------------------------------------
    -- 1. SOLDADORES
    ---------------------------------------------------------------------------
    -- Remove perguntas antigas dos perfis de soldador
    DELETE FROM core_comercial.job_function_questions 
    WHERE job_function_id IN (
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'SOLDADOR%' OR name LIKE 'Soldador%'
    );

    FOR v_jf_id IN 
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'SOLDADOR%' OR name LIKE 'Soldador%'
    LOOP
        INSERT INTO core_comercial.job_function_questions (empresa_id, job_function_id, question_text, question_type, options, is_required, sort_order)
        VALUES 
        (v_empresa_id, v_jf_id, 'Proceso de soldadura requerido', 'multi_choice', ARRAY['MIG/MAG (GMAW)', 'TIG (GTAW)', 'Electrodo Revestido (SMAW)', 'Arco Sumergido (SAW)', 'Orbital'], true, 1),
        (v_empresa_id, v_jf_id, 'Materiales principales a soldar', 'multi_choice', ARRAY['Acero al Carbono', 'Acero Inoxidable', 'Aluminio', 'Cobre', 'Aleaciones Especiales'], true, 2),
        (v_empresa_id, v_jf_id, 'Posiciones de soldadura requeridas', 'multi_choice', ARRAY['Plana (1G/1F)', 'Horizontal (2G/2F)', 'Vertical (3G/3F)', 'Bajo techo (4G/4F)', 'Tubo inclinado (6G)'], true, 3),
        (v_empresa_id, v_jf_id, 'Requiere homologación del proceso por el cliente', 'boolean', null, true, 4),
        (v_empresa_id, v_jf_id, 'Se solicita lectura de planos técnicos', 'boolean', null, true, 5);
    END LOOP;

    ---------------------------------------------------------------------------
    -- 2. MONTADORES / TUBEROS / CALDEREROS
    ---------------------------------------------------------------------------
    DELETE FROM core_comercial.job_function_questions 
    WHERE job_function_id IN (
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'MONTADOR%' OR name LIKE 'TUBERO%' OR name LIKE 'CALDERERO%'
    );

    FOR v_jf_id IN 
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'MONTADOR%' OR name LIKE 'TUBERO%' OR name LIKE 'CALDERERO%'
    LOOP
        INSERT INTO core_comercial.job_function_questions (empresa_id, job_function_id, question_text, question_type, options, is_required, sort_order)
        VALUES 
        (v_empresa_id, v_jf_id, 'Tipo de trabajo principal', 'multi_choice', ARRAY['Montaje de estructuras', 'Desmontaje/Demolición', 'Fabricación en taller', 'Instalación en campo'], true, 1),
        (v_empresa_id, v_jf_id, 'Materiales principales de la estructura', 'multi_choice', ARRAY['Acero al Carbono', 'Acero Inoxidable', 'Aluminio'], true, 2),
        (v_empresa_id, v_jf_id, 'Método principal de unión', 'multi_choice', ARRAY['Soldadura', 'Atornillado', 'Remachado', 'Corte y Doblado'], true, 3),
        (v_empresa_id, v_jf_id, 'Tipo de equipos o estructuras a fabricar', 'multi_choice', ARRAY['Depósitos a presión', 'Intercambiadores de calor', 'Tuberías de proceso', 'Soportes metálicos', 'Estructuras ligeras', 'Estructuras pesadas'], true, 4),
        (v_empresa_id, v_jf_id, 'Se solicita lectura de planos técnicos', 'boolean', null, true, 5);
    END LOOP;

    ---------------------------------------------------------------------------
    -- 3. TORNEROS / FRESADORES
    ---------------------------------------------------------------------------
    DELETE FROM core_comercial.job_function_questions 
    WHERE job_function_id IN (
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'TORNERO%' OR name LIKE 'FRESADOR%'
    );

    FOR v_jf_id IN 
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'TORNERO%' OR name LIKE 'FRESADOR%'
    LOOP
        INSERT INTO core_comercial.job_function_questions (empresa_id, job_function_id, question_text, question_type, options, is_required, sort_order)
        VALUES 
        (v_empresa_id, v_jf_id, 'Tipo de máquina a operar', 'single_choice', ARRAY['Torno CNC', 'Torno Convencional/Paralelo', 'Fresadora CNC', 'Fresadora Convencional', 'Centro de Mecanizado'], true, 1),
        (v_empresa_id, v_jf_id, 'Sistema de Control Numérico (CNC) utilizado', 'multi_choice', ARRAY['Fanuc', 'Siemens', 'Mazak', 'Heidenhain', 'Fagor', 'Otro/No Aplica'], true, 2),
        (v_empresa_id, v_jf_id, 'Materiales principales a mecanizar', 'multi_choice', ARRAY['Acero común', 'Acero Inoxidable', 'Aluminio', 'Bronce/Latón', 'Plásticos Técnicos'], true, 3),
        (v_empresa_id, v_jf_id, 'Se requiere programación a pie de máquina', 'boolean', null, true, 4);
    END LOOP;

    ---------------------------------------------------------------------------
    -- 4. PINTORES
    ---------------------------------------------------------------------------
    DELETE FROM core_comercial.job_function_questions 
    WHERE job_function_id IN (
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'PINTOR%'
    );

    FOR v_jf_id IN 
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'PINTOR%'
    LOOP
        INSERT INTO core_comercial.job_function_questions (empresa_id, job_function_id, question_text, question_type, options, is_required, sort_order)
        VALUES 
        (v_empresa_id, v_jf_id, 'Método de aplicación requerido', 'multi_choice', ARRAY['Pistola Airless', 'Pistola Convencional', 'Brocha/Rodillo', 'Inmersión', 'Pintura en Polvo'], true, 1),
        (v_empresa_id, v_jf_id, 'Tipo de pintura/recubrimiento a aplicar', 'multi_choice', ARRAY['Epoxi', 'Poliuretano', 'Esmalte Sintético', 'Pintura Ignífuga', 'Antifouling'], true, 2),
        (v_empresa_id, v_jf_id, 'Tipo de preparación de superficie necesaria', 'multi_choice', ARRAY['Chorro de arena (Sandblasting)', 'Granallado', 'Limpieza química/desengrase', 'Lijado manual'], true, 3);
    END LOOP;

    ---------------------------------------------------------------------------
    -- 5. ELECTRICISTAS
    ---------------------------------------------------------------------------
    DELETE FROM core_comercial.job_function_questions 
    WHERE job_function_id IN (
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'ELECTRICISTA%' OR name LIKE 'Electricista%' OR name LIKE 'ENCARGADO ELECTRICISTA%'
    );

    FOR v_jf_id IN 
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'ELECTRICISTA%' OR name LIKE 'Electricista%' OR name LIKE 'ENCARGADO ELECTRICISTA%'
    LOOP
        INSERT INTO core_comercial.job_function_questions (empresa_id, job_function_id, question_text, question_type, options, is_required, sort_order)
        VALUES 
        (v_empresa_id, v_jf_id, 'Nivel de tensión de trabajo', 'multi_choice', ARRAY['Baja Tensión (<1kV)', 'Media Tensión (1-36kV)', 'Alta Tensión (>36kV)'], true, 1),
        (v_empresa_id, v_jf_id, 'Ámbito de trabajo principal', 'multi_choice', ARRAY['Cableado de Potencia', 'Control e Instrumentación', 'Montaje de bandejas/canalizaciones', 'Conexión de motores', 'Cuadros eléctricos', 'Automatización/PLC'], true, 2);
    END LOOP;

    ---------------------------------------------------------------------------
    -- 6. MECÁNICOS Y ELECTROMECÁNICOS
    ---------------------------------------------------------------------------
    DELETE FROM core_comercial.job_function_questions 
    WHERE job_function_id IN (
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'MECÁNICO%' OR name LIKE 'Mecanico%' OR name LIKE 'ELECTROMECÁNICO%'
    );

    FOR v_jf_id IN 
        SELECT id FROM core_comercial.job_functions WHERE name LIKE 'MECÁNICO%' OR name LIKE 'Mecanico%' OR name LIKE 'ELECTROMECÁNICO%'
    LOOP
        INSERT INTO core_comercial.job_function_questions (empresa_id, job_function_id, question_text, question_type, options, is_required, sort_order)
        VALUES 
        (v_empresa_id, v_jf_id, 'Tipo de maquinaria a intervenir', 'multi_choice', ARRAY['Bombas industriales', 'Reductores de velocidad', 'Turbinas/Compresores', 'Cintas transportadoras', 'Prensas hidráulicas/neumáticas', 'Motores eléctricos'], true, 1),
        (v_empresa_id, v_jf_id, 'Tareas mecánicas requeridas', 'multi_choice', ARRAY['Montaje y alineación láser', 'Desmontaje y reparación', 'Mantenimiento preventivo', 'Equilibrado dinámico'], true, 2);
    END LOOP;

    RAISE NOTICE 'Perguntas técnicas estruturadas importadas com sucesso!';
END;
$$;
