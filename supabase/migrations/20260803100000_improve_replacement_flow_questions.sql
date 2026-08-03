-- Migration: 20260803100000_improve_replacement_flow_questions.sql
-- Description: Add columns for target job function and questions, and update related functions.

BEGIN;

-- 1. Add pergunta_respuesta JSONB column to core_operacoes.solicitudes_operativas if not exists
ALTER TABLE core_operacoes.solicitudes_operativas 
ADD COLUMN IF NOT EXISTS pergunta_respuesta JSONB;

-- 2. Add target_job_function_id and target_job_function_name to core_operacoes.solicitud_targets if not exists
ALTER TABLE core_operacoes.solicitud_targets
ADD COLUMN IF NOT EXISTS target_job_function_id UUID REFERENCES core_comercial.job_functions(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS target_job_function_name VARCHAR;

-- 3. Redefine core_operacoes.criar_solicitud_operativa_com_targets to store pergunta_respuesta and target job function
CREATE OR REPLACE FUNCTION core_operacoes.criar_solicitud_operativa_com_targets(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_empresa_id uuid;
    v_solicitud_id uuid;
    v_type varchar;
    v_title varchar;
    v_description text;
    v_priority varchar;
    v_due_date timestamptz;
    v_client_id uuid;
    v_client_site_id uuid;
    v_pergunta_respuesta jsonb;
    v_target jsonb;
    v_solicitud_codigo varchar;
    v_max_seq int;
    v_solicitudes_count int;
    
    -- Aux variables for targets
    v_source_assignment_id uuid;
    v_source_worker_id uuid;
    v_source_pedido_id uuid;
    v_source_pedido_item_id uuid;
    v_source_client_id uuid;
    v_source_client_site_id uuid;
    
    -- Target variables
    v_target_client_id uuid;
    v_target_client_site_id uuid;
    v_target_job_function_id uuid;
    v_target_job_function_name varchar;
    v_requires_housing boolean;
    v_housing_start_date date;
    v_housing_end_date date;
    v_requires_replacement boolean;
    
    v_action_type varchar;
    v_reason text;
    v_notes text;
BEGIN
    -- 1. Extrair cabeçalho
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_type := payload->>'type';
    v_title := payload->>'title';
    v_description := payload->>'description';
    v_priority := COALESCE(payload->>'priority', 'normal');
    v_due_date := (payload->>'due_date')::timestamptz;
    v_client_id := (payload->>'client_id')::uuid;
    v_client_site_id := (payload->>'client_site_id')::uuid;
    v_pergunta_respuesta := payload->'pergunta_respuesta';

    IF v_empresa_id IS NULL OR v_type IS NULL OR v_title IS NULL THEN
        RAISE EXCEPTION 'Payload inválido: empresa_id, type e title são obrigatórios no cabeçalho.';
    END IF;

    -- 1.5 Gerar código da Solicitud Operativa (SOL-YYYY-000001 ou R-YYYY-000NNN) de forma GLOBAL
    IF v_type = 'replacement' THEN
        SELECT COALESCE(MAX(
            NULLIF(REGEXP_REPLACE(codigo, '^R-\d{4}-', ''), '')::integer
        ), 220) INTO v_max_seq
        FROM core_operacoes.solicitudes_operativas
        WHERE tipo = 'replacement'
          AND codigo ~ '^R-\d{4}-\d+$';
          
        v_solicitud_codigo := 'R-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_max_seq + 1)::TEXT, 6, '0');
    ELSE
        SELECT COUNT(*) INTO v_solicitudes_count
        FROM core_operacoes.solicitudes_operativas
        WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
          AND (tipo IS NULL OR tipo != 'replacement');
          
        v_solicitud_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');
    END IF;

    v_solicitud_id := gen_random_uuid();

    -- 2. Criar a Solicitação Operativa (Cabeçalho) livre
    INSERT INTO core_operacoes.solicitudes_operativas (
        id,
        empresa_id,
        codigo,
        source_module,
        source_entity_type,
        source_entity_id,
        tipo, 
        title,
        description,
        priority,
        status,
        pedido_id,
        due_date,
        client_id,
        client_site_id,
        pergunta_respuesta
    ) VALUES (
        v_solicitud_id,
        v_empresa_id,
        v_solicitud_codigo,
        'operacoes',
        'solicitud',
        v_solicitud_id,
        v_type,
        v_title,
        v_description,
        v_priority,
        'pending',
        (payload->>'origin_pedido_id')::uuid,
        v_due_date,
        v_client_id,
        v_client_site_id,
        v_pergunta_respuesta
    );

    -- 3. Inserir os Targets (Alvos)
    IF payload->'targets' IS NOT NULL AND jsonb_array_length(payload->'targets') > 0 THEN
        FOR v_target IN SELECT * FROM jsonb_array_elements(payload->'targets')
        LOOP
            v_source_assignment_id := (v_target->>'source_assignment_id')::uuid;
            v_source_worker_id := (v_target->>'source_worker_id')::uuid;
            v_source_pedido_id := (v_target->>'source_pedido_id')::uuid;
            v_source_pedido_item_id := (v_target->>'source_pedido_item_id')::uuid;
            v_source_client_id := (v_target->>'source_client_id')::uuid;
            v_source_client_site_id := (v_target->>'source_client_site_id')::uuid;
            
            -- target details
            v_target_client_id := (v_target->>'target_client_id')::uuid;
            v_target_client_site_id := (v_target->>'target_client_site_id')::uuid;
            v_target_job_function_id := (v_target->>'target_job_function_id')::uuid;
            v_target_job_function_name := v_target->>'target_job_function_name';
            v_requires_housing := COALESCE((v_target->>'requires_housing')::boolean, false);
            v_housing_start_date := (v_target->>'housing_start_date')::date;
            v_housing_end_date := (v_target->>'housing_end_date')::date;
            v_requires_replacement := COALESCE((v_target->>'requires_replacement')::boolean, true);
            
            v_action_type := v_target->>'action_type';
            v_reason := v_target->>'reason';
            v_notes := v_target->>'notes';

            IF v_action_type IS NULL THEN
                RAISE EXCEPTION 'action_type é obrigatório em todos os targets.';
            END IF;

            INSERT INTO core_operacoes.solicitud_targets (
                empresa_id,
                solicitud_id,
                source_assignment_id,
                source_worker_id,
                source_pedido_id,
                source_pedido_item_id,
                source_client_id,
                source_client_site_id,
                target_client_id,
                target_client_site_id,
                target_job_function_id,
                target_job_function_name,
                requires_housing,
                housing_start_date,
                housing_end_date,
                requires_replacement,
                action_type,
                reason,
                notes,
                status
            ) VALUES (
                v_empresa_id,
                v_solicitud_id,
                v_source_assignment_id,
                v_source_worker_id,
                v_source_pedido_id,
                v_source_pedido_item_id,
                v_source_client_id,
                v_source_client_site_id,
                v_target_client_id,
                v_target_client_site_id,
                v_target_job_function_id,
                v_target_job_function_name,
                v_requires_housing,
                v_housing_start_date,
                v_housing_end_date,
                v_requires_replacement,
                v_action_type,
                v_reason,
                v_notes,
                'pending'
            );
        END LOOP;
    END IF;

    -- 4. Iniciar o Playbook para esta nova Solicitação
    PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);

    -- Atualiza o status do cabeçalho para 'pending'
    UPDATE core_operacoes.solicitudes_operativas
    SET status = 'pending'
    WHERE id = v_solicitud_id;

    RETURN v_solicitud_id;
END;
$$;


-- 4. Redefine core_personal.alocar_trabalhador_em_vaga with standalone replacement support & target_job_function prioritization
CREATE OR REPLACE FUNCTION core_personal.alocar_trabalhador_em_vaga(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_pedido_item_id UUID;
    v_worker_id UUID;
    v_worker_name TEXT;
    v_worker_document TEXT;
    v_planned_start_date DATE;
    v_planned_end_date DATE;
    v_solicitud_id UUID;
    v_notes TEXT;
    
    -- Novos campos no payload
    v_camiseta TEXT;
    v_pantalones TEXT;
    v_licencia_conducir TEXT;
    v_movil TEXT;
    v_tarifa_acordada NUMERIC(10,2);
    
    v_has_access BOOLEAN;
    
    -- Dados do Item
    v_pedido_id UUID;
    v_job_function_id UUID;
    v_job_function_name VARCHAR;
    v_qty_requested INT;
    v_qty_fulfilled INT;
    v_item_status VARCHAR;
    
    -- Dados do Pedido Principal
    v_client_id UUID;
    v_client_site_id UUID;
    v_pedido_codigo VARCHAR;
    
    -- Alocação
    v_new_assignment_id UUID := gen_random_uuid();
    v_source_assignment_id UUID;
    v_assignment_status VARCHAR;
    v_start_date DATE;
    v_source_type VARCHAR;
    v_source_id UUID;
    
    -- Verificacao
    v_existing_active_assignment UUID;
    
    -- Recalculo de Pedido
    v_total_items INT;
    v_fulfilled_items INT;
    v_new_operational_status VARCHAR;

    -- Empresa/Contratante
    v_contratante_nome TEXT;
    
    -- Target job function variables
    v_target_jf_id UUID;
    v_target_jf_name VARCHAR;
BEGIN
    -- 1. Extração do payload
    v_empresa_id := (payload->>'empresa_id')::uuid;
    
    IF payload->>'pedido_item_id' IS NOT NULL AND payload->>'pedido_item_id' != '' THEN
        v_pedido_item_id := (payload->>'pedido_item_id')::uuid;
    END IF;
    
    IF payload->>'worker_id' IS NOT NULL AND payload->>'worker_id' != '' THEN
        v_worker_id := (payload->>'worker_id')::uuid;
    END IF;
    
    v_worker_name := payload->>'worker_name';
    v_worker_document := payload->>'worker_document';
    v_planned_start_date := (payload->>'planned_start_date')::date;
    v_planned_end_date := (payload->>'planned_end_date')::date;
    
    IF payload->>'solicitud_id' IS NOT NULL AND payload->>'solicitud_id' != '' THEN
        v_solicitud_id := (payload->>'solicitud_id')::uuid;
    END IF;
    
    v_notes := payload->>'notes';
    
    -- Novos campos opcionais
    v_camiseta := payload->>'camiseta';
    v_pantalones := payload->>'pantalones';
    v_licencia_conducir := payload->>'licencia_conducir';
    v_movil := payload->>'movil';
    
    IF payload->>'tarifa_acordada' IS NOT NULL AND payload->>'tarifa_acordada' != '' THEN
        v_tarifa_acordada := (payload->>'tarifa_acordada')::numeric;
    END IF;

    -- Validação Básica
    IF v_empresa_id IS NULL OR v_planned_start_date IS NULL THEN
        RAISE EXCEPTION 'empresa_id e planned_start_date são obrigatórios.';
    END IF;
    
    IF v_pedido_item_id IS NULL AND v_solicitud_id IS NULL THEN
        RAISE EXCEPTION 'pedido_item_id ou solicitud_id é obrigatório para realizar a alocação.';
    END IF;

    -- 2. Validação de Acesso (RH, Admin, etc)
    SELECT EXISTS (
        SELECT 1 FROM core_common.user_memberships
        WHERE user_id = v_user_id 
          AND empresa_id = v_empresa_id 
          AND is_active = true
          AND role IN ('admin', 'rh', 'super_admin', 'admin_rh', 'operador')
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Acesso negado. Apenas RH ou Operação (Admin) podem alocar trabalhadores.';
    END IF;

    -- 3. Buscar dados do Pedido e Item
    IF v_pedido_item_id IS NOT NULL THEN
        SELECT 
            pi.pedido_id, 
            pi.job_function_id, 
            COALESCE(NULLIF(TRIM(pi.job_function_name_snapshot), ''), NULLIF(TRIM(jf.name), ''), 'Desconhecida'),
            pi.quantity_requested, 
            pi.quantity_fulfilled,
            p.client_id,
            p.client_site_id,
            p.codigo
        INTO 
            v_pedido_id, 
            v_job_function_id, 
            v_job_function_name, 
            v_qty_requested, 
            v_qty_fulfilled,
            v_client_id,
            v_client_site_id,
            v_pedido_codigo
        FROM core_comercial.pedido_items pi
        JOIN core_comercial.pedidos p ON p.id = pi.pedido_id
        LEFT JOIN core_comercial.job_functions jf ON jf.id = pi.job_function_id
        WHERE pi.id = v_pedido_item_id AND pi.empresa_id = v_empresa_id;

        IF v_pedido_id IS NULL THEN
            RAISE EXCEPTION 'Pedido Item não encontrado.';
        END IF;

        -- 4. Validar saldo da vaga (SE FOR REEMPLAZO/SUBSTITUIÇÃO, BYPASSA A VALIDAÇÃO)
        IF v_qty_fulfilled >= v_qty_requested AND v_solicitud_id IS NULL THEN
            RAISE EXCEPTION 'Este item já teve todas as suas vagas preenchidas.';
        END IF;
    ELSE
        -- 3.1 Standalone replacement support
        SELECT 
            source_client_id,
            source_client_site_id,
            source_pedido_id,
            source_pedido_item_id,
            source_assignment_id,
            target_job_function_id,
            target_job_function_name
        INTO
            v_client_id,
            v_client_site_id,
            v_pedido_id,
            v_pedido_item_id,
            v_source_assignment_id,
            v_target_jf_id,
            v_target_jf_name
        FROM core_operacoes.solicitud_targets
        WHERE solicitud_id = v_solicitud_id
        LIMIT 1;

        IF v_client_id IS NULL THEN
            RAISE EXCEPTION 'Solicitação de substituição correspondente não encontrada ou sem cliente definido.';
        END IF;

        -- Check if target job function is specified on targets
        IF v_target_jf_id IS NOT NULL OR v_target_jf_name IS NOT NULL THEN
            v_job_function_id := v_target_jf_id;
            v_job_function_name := COALESCE(v_target_jf_name, (SELECT name FROM core_comercial.job_functions WHERE id = v_target_jf_id));
        ELSE
            -- Get job function from original worker function as fallback
            SELECT 
                w.funcion,
                jf.id
            INTO
                v_job_function_name,
                v_job_function_id
            FROM core_personal.workers w
            LEFT JOIN core_comercial.job_functions jf ON UPPER(TRIM(jf.name)) = UPPER(TRIM(w.funcion)) AND jf.empresa_id = v_empresa_id
            WHERE w.id = (
                SELECT source_worker_id 
                FROM core_operacoes.solicitud_targets 
                WHERE solicitud_id = v_solicitud_id 
                LIMIT 1
            );
        END IF;

        IF v_job_function_name IS NULL THEN
            v_job_function_name := 'Substituição Avulsa';
        END IF;

        -- If target actually has a source_pedido_item_id and no target function was specified, load job_function details from it
        IF v_pedido_item_id IS NOT NULL AND v_target_jf_id IS NULL THEN
            SELECT 
                job_function_id, 
                COALESCE(NULLIF(TRIM(pi.job_function_name_snapshot), ''), NULLIF(TRIM(jf.name), ''), 'Desconhecida')
            INTO 
                v_job_function_id, 
                v_job_function_name
            FROM core_comercial.pedido_items pi
            LEFT JOIN core_comercial.job_functions jf ON jf.id = pi.job_function_id
            WHERE pi.id = v_pedido_item_id;
        END IF;
    END IF;

    -- Buscar nome da empresa contratante
    SELECT nome INTO v_contratante_nome 
    FROM core_common.empresas 
    WHERE id = v_empresa_id;

    -- 5. Lidar com o Worker (Criar se não existir, atualizar se já existir)
    IF v_worker_id IS NULL THEN
        IF v_worker_name IS NULL OR v_worker_name = '' THEN
            RAISE EXCEPTION 'Se worker_id não for informado, worker_name é obrigatório para cadastro.';
        END IF;
        
        -- Validação de duplicidade por documento
        IF v_worker_document IS NOT NULL AND v_worker_document != '' THEN
            IF EXISTS (
                SELECT 1 FROM core_personal.workers
                WHERE UPPER(TRIM(nif)) = UPPER(TRIM(v_worker_document))
                   OR UPPER(TRIM(dni)) = UPPER(TRIM(v_worker_document))
                   OR UPPER(TRIM(nie)) = UPPER(TRIM(v_worker_document))
                   OR UPPER(TRIM(pasaporte)) = UPPER(TRIM(v_worker_document))
            ) THEN
                RAISE EXCEPTION 'Trabalhador com este documento já cadastrado no sistema.';
            END IF;
        END IF;
        
        v_worker_id := gen_random_uuid();
        
        INSERT INTO core_personal.workers (
            id, nome, nif, status_trabajador,
            camiseta, pantalones, licencia_conducir, movil, cod_colab,
            contratante, funcion
        )
        VALUES (
            v_worker_id, 
            v_worker_name, 
            v_worker_document, 
            'Pendente Ingresso',
            v_camiseta,
            v_pantalones,
            v_licencia_conducir,
            v_movil,
            core_personal.fn_generate_next_cod_colab(), -- código definitivo sequencial
            v_contratante_nome,
            v_job_function_name
        );
    ELSE
        -- Validar se o worker já não está ativamente alocado nesta mesma vaga
        -- Apenas se for uma vaga de pedido real
        IF v_pedido_item_id IS NOT NULL THEN
            SELECT id INTO v_existing_active_assignment
            FROM core_personal.worker_assignments
            WHERE worker_id = v_worker_id 
              AND pedido_item_id = v_pedido_item_id 
              AND status IN ('planned', 'active', 'paused');
              
            IF v_existing_active_assignment IS NOT NULL THEN
                RAISE EXCEPTION 'O trabalhador já possui uma alocação ativa neste pedido.';
            END IF;
        END IF;

        -- Atualizar os dados de tamanho/CNH/celular no cadastro do trabalhador
        UPDATE core_personal.workers
        SET camiseta = COALESCE(NULLIF(v_camiseta, ''), camiseta),
            pantalones = COALESCE(NULLIF(v_pantalones, ''), pantalones),
            licencia_conducir = COALESCE(NULLIF(v_licencia_conducir, ''), licencia_conducir),
            movil = COALESCE(NULLIF(v_movil, ''), movil),
            contratante = COALESCE(contratante, v_contratante_nome),
            funcion = COALESCE(funcion, v_job_function_name),
            status_trabajador = 'Pendente Ingresso'
        WHERE id = v_worker_id;
    END IF;

    -- 6. Calcular Status da Alocação e Source
    IF v_planned_start_date <= CURRENT_DATE THEN
        v_assignment_status := 'active';
        v_start_date := v_planned_start_date;
    ELSE
        v_assignment_status := 'planned';
        v_start_date := NULL;
    END IF;

    -- Determinar se é substituição ou alocação raiz
    IF v_solicitud_id IS NOT NULL THEN
        -- Se não conseguimos v_source_assignment_id anteriormente, buscamos agora
        IF v_source_assignment_id IS NULL THEN
            SELECT source_assignment_id
            INTO v_source_assignment_id
            FROM core_operacoes.solicitud_targets
            WHERE solicitud_id = v_solicitud_id
            LIMIT 1;
        END IF;

        -- Se a solicitude for de substituição, finalizamos a alocação de origem
        IF v_source_assignment_id IS NOT NULL THEN
            UPDATE core_personal.worker_assignments
            SET status = 'terminated',
                end_date = v_planned_start_date - 1
            WHERE id = v_source_assignment_id;
        END IF;
    END IF;

    -- 7. Criar registro de Alocação
    INSERT INTO core_personal.worker_assignments (
        id, empresa_id, worker_id, pedido_item_id, pedido_id, job_function_id, client_id, client_site_id,
        planned_start_date, planned_end_date, start_date, status, notes,
        job_function_name_snapshot, replacement_of_assignment_id, solicitud_id,
        tarifa_acordada
    )
    VALUES (
        v_new_assignment_id,
        v_empresa_id,
        v_worker_id,
        v_pedido_item_id,
        v_pedido_id,
        v_job_function_id,
        v_client_id,
        v_client_site_id,
        v_planned_start_date,
        v_planned_end_date,
        v_start_date,
        v_assignment_status,
        v_notes,
        v_job_function_name,
        v_source_assignment_id,
        v_solicitud_id,
        v_tarifa_acordada
    );

    -- 8. Atualizar quantidade preenchida no Pedido Item
    -- Nota: Alocações por solicitude de substituição não incrementam a capacidade
    IF v_solicitud_id IS NULL AND v_pedido_item_id IS NOT NULL THEN
        UPDATE core_comercial.pedido_items
        SET quantity_fulfilled = quantity_fulfilled + 1
        WHERE id = v_pedido_item_id;
    END IF;

    -- Se associado a uma solicitude, marcar o target como concluído e associar o worker_id/assignment_id
    IF v_solicitud_id IS NOT NULL THEN
        UPDATE core_operacoes.solicitud_targets
        SET status = 'completed',
            target_worker_id = v_worker_id,
            target_assignment_id = v_new_assignment_id,
            completed_at = now()
        WHERE solicitud_id = v_solicitud_id 
          AND (source_pedido_item_id = v_pedido_item_id OR source_pedido_item_id IS NULL OR v_pedido_item_id IS NULL);
        
        -- Atualizar status da solicitude mãe se todos os targets forem concluídos
        IF NOT EXISTS (
            SELECT 1 FROM core_operacoes.solicitud_targets
            WHERE solicitud_id = v_solicitud_id AND status != 'completed'
        ) THEN
            UPDATE core_operacoes.solicitudes_operativas
            SET status = 'completed',
                completed_at = now()
            WHERE id = v_solicitud_id;
        END IF;
    END IF;

    -- 9. Recalcular o status operacional do Pedido Principal se aplicável
    IF v_pedido_id IS NOT NULL THEN
        SELECT COUNT(*), COUNT(CASE WHEN quantity_fulfilled >= quantity_requested THEN 1 END)
        INTO v_total_items, v_fulfilled_items
        FROM core_comercial.pedido_items
        WHERE pedido_id = v_pedido_id;

        IF v_fulfilled_items = 0 THEN
            v_new_operational_status := 'pending_operations';
        ELSIF v_fulfilled_items < v_total_items THEN
            v_new_operational_status := 'partially_fulfilled';
        ELSE
            v_new_operational_status := 'fulfilled';
        END IF;

        UPDATE core_comercial.pedidos
        SET operational_status = v_new_operational_status
        WHERE id = v_pedido_id;
    END IF;

    -- 10. Retornar dados da alocação criada
    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', v_new_assignment_id,
        'worker_id', v_worker_id,
        'status', v_assignment_status
    );
END;
$$;

COMMIT;
