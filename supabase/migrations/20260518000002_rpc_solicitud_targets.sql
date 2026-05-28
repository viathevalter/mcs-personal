-- ==============================================================================
-- Migração Evolutiva - RPC para Criar Solicitação Operativa com Múltiplos Alvos
-- ==============================================================================

-- Esta RPC cria uma solicitud_operativa (cabecalho) e, em seguida,
-- itera sobre um array de targets (alvos operacionais) e os insere 
-- na tabela core_operacoes.solicitud_targets. Tudo dentro da mesma transação.
-- Ao final, chama o iniciar_playbook para já engatilhar as tarefas.

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
    v_target jsonb;
    
    -- Variáveis auxiliares para os targets
    v_source_assignment_id uuid;
    v_source_worker_id uuid;
    v_source_pedido_id uuid;
    v_source_pedido_item_id uuid;
    v_source_client_id uuid;
    v_source_client_site_id uuid;
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

    IF v_empresa_id IS NULL OR v_type IS NULL OR v_title IS NULL THEN
        RAISE EXCEPTION 'Payload inválido: empresa_id, type e title são obrigatórios no cabeçalho.';
    END IF;

    -- 2. Criar a Solicitação Operativa (Cabeçalho) livre (sem pedido amarrado obrigatoriamente)
    INSERT INTO core_operacoes.solicitudes_operativas (
        empresa_id,
        type,
        title,
        description,
        priority,
        status,
        -- NOTA: O fluxo de aprovar_estimacion continua preenchendo origin_pedido_id.
        -- Para replacement, a solicitud pode ser "solta" e agrupar targets de pedidos distintos.
        origin_pedido_id 
    ) VALUES (
        v_empresa_id,
        v_type,
        v_title,
        v_description,
        v_priority,
        'draft',
        (payload->>'origin_pedido_id')::uuid
    ) RETURNING id INTO v_solicitud_id;

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
                v_action_type,
                v_reason,
                v_notes,
                'pending'
            );
        END LOOP;
    END IF;

    -- 4. Iniciar o Playbook para esta nova Solicitação (Gera as tarefas baseadas no tipo)
    -- Isso permite que RH e Operações recebam as tarefas para processar os targets (ex: buscar substitutos).
    PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);

    -- Atualiza o status do cabeçalho para 'pending' (Aguardando ação) após gerar as tarefas
    UPDATE core_operacoes.solicitudes_operativas
    SET status = 'pending'
    WHERE id = v_solicitud_id;

    RETURN v_solicitud_id;
END;
$$;
