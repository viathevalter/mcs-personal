-- Migration: 20260623110000_add_housing_fields_to_solicitud_targets.sql
-- Description: Add columns for housing/accommodation logistics to core_operacoes.solicitud_targets and update the RPC to save target client/site and housing info.

-- 1. Add housing columns to core_operacoes.solicitud_targets if they do not exist
ALTER TABLE core_operacoes.solicitud_targets ADD COLUMN IF NOT EXISTS requires_housing BOOLEAN DEFAULT false;
ALTER TABLE core_operacoes.solicitud_targets ADD COLUMN IF NOT EXISTS housing_start_date DATE;
ALTER TABLE core_operacoes.solicitud_targets ADD COLUMN IF NOT EXISTS housing_end_date DATE;

-- 2. Drop and recreate the function with updated schema mapping
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
    v_target jsonb;
    v_solicitud_codigo varchar;
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
    v_requires_housing boolean;
    v_housing_start_date date;
    v_housing_end_date date;
    
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

    IF v_empresa_id IS NULL OR v_type IS NULL OR v_title IS NULL THEN
        RAISE EXCEPTION 'Payload inválido: empresa_id, type e title são obrigatórios no cabeçalho.';
    END IF;

    -- 1.5 Gerar código da Solicitud Operativa (SOL-YYYY-000001)
    SELECT COUNT(*) INTO v_solicitudes_count
    FROM core_operacoes.solicitudes_operativas
    WHERE empresa_id = v_empresa_id 
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
      
    v_solicitud_codigo := 'SOL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_solicitudes_count + 1)::TEXT, 6, '0');
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
        client_site_id
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
        v_client_site_id
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
            v_requires_housing := COALESCE((v_target->>'requires_housing')::boolean, false);
            v_housing_start_date := (v_target->>'housing_start_date')::date;
            v_housing_end_date := (v_target->>'housing_end_date')::date;
            
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
                requires_housing,
                housing_start_date,
                housing_end_date,
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
                v_requires_housing,
                v_housing_start_date,
                v_housing_end_date,
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
