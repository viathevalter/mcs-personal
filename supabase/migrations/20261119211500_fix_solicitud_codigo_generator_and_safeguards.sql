-- =====================================================================================
-- MIGRAÇÃO: Blindagem Definitiva de Geração de Código e Proteção de Solicitações Operativas
-- Data: 2026-11-19
-- Descrição:
-- 1. Cria `core_operacoes.gerar_proximo_codigo_solicitud(p_tipo, p_empresa_id)` usando
--    `pg_advisory_xact_lock` + `MAX(...)` + `LOOP NOT EXISTS` (substituindo `COUNT(*) + 1`,
--    que colidia quando registros eram revertidos ou coexistiam com códigos `new_order`).
-- 2. Cria trigger `BEFORE INSERT` (`tgr_00_blindar_codigo_solicitud`) em
--    `core_operacoes.solicitudes_operativas` para garantir que nenhum INSERT falhe por
--    `solicitudes_operativas_empresa_id_codigo_key`, mesmo vindo de chamadores legados.
-- 3. Cria trigger `BEFORE DELETE` (`tgr_00_proteger_delete_solicitud`) bloqueando exclusão
--    física acidental na tabela `core_operacoes.solicitudes_operativas`.
-- 4. Atualiza todas as RPCs que inserem em `core_operacoes.solicitudes_operativas` para
--    usar o gerador centralizado e capturar `RETURNING codigo`.
-- =====================================================================================

-- 1. Função centralizada e atômica para geração de códigos SOL-YYYY-NNNNNN e R-YYYY-NNNNNN
CREATE OR REPLACE FUNCTION core_operacoes.gerar_proximo_codigo_solicitud(
    p_tipo varchar DEFAULT 'other',
    p_empresa_id uuid DEFAULT NULL
)
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
    v_year text := pg_catalog.to_char(pg_catalog.now(), 'YYYY');
    v_seq bigint;
    v_codigo varchar;
BEGIN
    -- Trava transacional para impedir concorrência simultânea entre dois usuários
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtext('core_operacoes.solicitudes_operativas.codigo')
    );

    IF pg_catalog.lower(COALESCE(p_tipo, '')) = 'replacement' THEN
        SELECT GREATEST(
            220::bigint,
            COALESCE(MAX(
                NULLIF(pg_catalog.regexp_replace(s.codigo, '^R-' || v_year || '-', ''), '')::bigint
            ), 0::bigint)
        )
        INTO v_seq
        FROM core_operacoes.solicitudes_operativas s
        WHERE s.codigo ~ ('^R-' || v_year || '-\d{1,12}$');

        LOOP
            v_seq := v_seq + 1;
            v_codigo := 'R-' || v_year || '-' || pg_catalog.lpad(v_seq::text, 6, '0');
            EXIT WHEN NOT EXISTS (
                SELECT 1
                FROM core_operacoes.solicitudes_operativas s
                WHERE s.codigo = v_codigo
            );
        END LOOP;
    ELSE
        SELECT GREATEST(
            COALESCE(MAX(
                NULLIF(pg_catalog.regexp_replace(s.codigo, '^SOL-' || v_year || '-', ''), '')::bigint
            ), 0::bigint),
            (
                SELECT COUNT(*)::bigint
                FROM core_operacoes.solicitudes_operativas s2
                WHERE EXTRACT(YEAR FROM s2.created_at) = EXTRACT(YEAR FROM pg_catalog.now())
                  AND COALESCE(s2.tipo, '') != 'replacement'
            )
        )
        INTO v_seq
        FROM core_operacoes.solicitudes_operativas s
        WHERE s.codigo ~ ('^SOL-' || v_year || '-\d{1,12}$')
          AND COALESCE(s.tipo, '') NOT IN ('replacement', 'new_order');

        LOOP
            v_seq := v_seq + 1;
            v_codigo := 'SOL-' || v_year || '-' || pg_catalog.lpad(v_seq::text, 6, '0');
            EXIT WHEN NOT EXISTS (
                SELECT 1
                FROM core_operacoes.solicitudes_operativas s
                WHERE s.codigo = v_codigo
            );
        END LOOP;
    END IF;

    RETURN v_codigo;
END;
$function$;

GRANT EXECUTE ON FUNCTION core_operacoes.gerar_proximo_codigo_solicitud(varchar, uuid) TO authenticated;

-- 2. Trigger BEFORE INSERT: blindagem automática contra código nulo ou duplicado
CREATE OR REPLACE FUNCTION core_operacoes.trigger_blindar_codigo_solicitud()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
    v_base_codigo varchar;
    v_suffix int := 2;
    v_candidate varchar;
BEGIN
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtext('core_operacoes.solicitudes_operativas.codigo')
    );

    IF NEW.codigo IS NULL OR pg_catalog.btrim(NEW.codigo) = '' THEN
        NEW.codigo := core_operacoes.gerar_proximo_codigo_solicitud(NEW.tipo, NEW.empresa_id);
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM core_operacoes.solicitudes_operativas s
        WHERE s.empresa_id = NEW.empresa_id
          AND s.codigo = NEW.codigo
    ) THEN
        IF COALESCE(NEW.tipo, '') = 'new_order' THEN
            -- Preservar vínculo visual com o código da Estimación/Pedido adicionando sufixo livre
            v_base_codigo := NEW.codigo;
            LOOP
                v_candidate := v_base_codigo || '-' || v_suffix::text;
                EXIT WHEN NOT EXISTS (
                    SELECT 1
                    FROM core_operacoes.solicitudes_operativas s
                    WHERE s.empresa_id = NEW.empresa_id
                      AND s.codigo = v_candidate
                );
                v_suffix := v_suffix + 1;
            END LOOP;
            NEW.codigo := v_candidate;
        ELSE
            NEW.codigo := core_operacoes.gerar_proximo_codigo_solicitud(NEW.tipo, NEW.empresa_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tgr_00_blindar_codigo_solicitud ON core_operacoes.solicitudes_operativas;
CREATE TRIGGER tgr_00_blindar_codigo_solicitud
BEFORE INSERT ON core_operacoes.solicitudes_operativas
FOR EACH ROW
EXECUTE FUNCTION core_operacoes.trigger_blindar_codigo_solicitud();

-- 3. Trigger BEFORE DELETE: bloqueia exclusão física acidental de solicitações operativas
CREATE OR REPLACE FUNCTION core_operacoes.trigger_proteger_delete_solicitud()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public, pg_catalog
AS $function$
BEGIN
    IF COALESCE(pg_catalog.current_setting('app.allow_solicitud_hard_delete', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Exclusão física de Solicitações Operativas (%) bloqueada por trava de auditoria. Utilize o cancelamento lógico (status = cancelled).', OLD.codigo;
    END IF;
    RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS tgr_00_proteger_delete_solicitud ON core_operacoes.solicitudes_operativas;
CREATE TRIGGER tgr_00_proteger_delete_solicitud
BEFORE DELETE ON core_operacoes.solicitudes_operativas
FOR EACH ROW
EXECUTE FUNCTION core_operacoes.trigger_proteger_delete_solicitud();

-- 4. Atualizar trigger_notificar_alteracao_data para também sincronizar o Pedido se pedido_id for vinculado em UPDATE subsequente
CREATE OR REPLACE FUNCTION core_operacoes.trigger_notificar_alteracao_data()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_dep_rh UUID;
    v_dep_doc UUID;
    v_dep_log UUID;
    v_dep_com UUID;
    
    v_msg TEXT;
    v_link VARCHAR;
    v_should_process BOOLEAN;
BEGIN
    SELECT id INTO v_dep_rh FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'RH';
    SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'DOCUMENTACION';
    SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'LOGISTICA';
    SELECT id INTO v_dep_com FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'COMERCIAL';

    v_link := '/operacoes/pedidos/' || NEW.pedido_id;

    IF NEW.status = 'completed' AND NEW.tipo IN ('order_postponement', 'order_extension', 'order_termination') THEN
        UPDATE core_operacoes.solicitud_tareas
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE solicitud_id = NEW.id AND status != 'completed';
    END IF;

    v_should_process := (
        NEW.status = 'completed'
        AND NEW.pedido_id IS NOT NULL
        AND (
            TG_OP = 'INSERT'
            OR OLD.status IS DISTINCT FROM 'completed'
            OR (OLD.pedido_id IS NULL AND NEW.pedido_id IS NOT NULL)
        )
    );

    IF NEW.tipo = 'order_postponement' AND v_should_process THEN
        v_msg := 'O Pedido ' || NEW.codigo || ' teve o início adiado pelo cliente. Novas datas operacionais foram aplicadas.';
        
        UPDATE core_comercial.pedidos
        SET expected_start_date = COALESCE(NEW.due_date::date, expected_start_date), updated_at = NOW()
        WHERE id = NEW.pedido_id;
        
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_rh,  NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_doc, NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_log, NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_com, NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
    
    ELSIF NEW.tipo = 'order_extension' AND v_should_process THEN
        v_msg := 'O Pedido ' || NEW.codigo || ' teve o prazo estendido. Novas datas operacionais foram aplicadas.';
        
        UPDATE core_comercial.pedidos
        SET expected_end_date = COALESCE(NEW.due_date::date, expected_end_date), updated_at = NOW()
        WHERE id = NEW.pedido_id;
        
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_rh,  NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_doc, NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_log, NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_com, NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);

    ELSIF NEW.tipo = 'order_termination' AND v_should_process THEN
        v_msg := 'O Pedido ' || NEW.codigo || ' foi finalizado/encerrado. As alocações foram concluídas.';
        
        UPDATE core_comercial.pedidos
        SET expected_end_date = COALESCE(NEW.due_date::date, expected_end_date),
            commercial_status = 'completed',
            operational_status = 'completed',
            updated_at = NOW()
        WHERE id = NEW.pedido_id;

        UPDATE core_comercial.pedido_items
        SET status = 'fulfilled',
            updated_at = NOW()
        WHERE pedido_id = NEW.pedido_id
          AND status = 'pending';
        
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_rh,  NULL, 'Pedido Finalizado - ' || NEW.codigo, v_msg, 'status_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_doc, NULL, 'Pedido Finalizado - ' || NEW.codigo, v_msg, 'status_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_log, NULL, 'Pedido Finalizado - ' || NEW.codigo, v_msg, 'status_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_com, NULL, 'Pedido Finalizado - ' || NEW.codigo, v_msg, 'status_change', 'info', v_link);
    END IF;

    RETURN NEW;
END;
$function$;

-- 5. Atualizar RPCs para usar core_operacoes.gerar_proximo_codigo_solicitud

-- 5.1 core_operacoes.criar_solicitud_operativa_com_targets
CREATE OR REPLACE FUNCTION core_operacoes.criar_solicitud_operativa_com_targets(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_empresa_id uuid;
    v_solicitud_id uuid;
    v_origin_pedido_id uuid;
    v_type varchar;
    v_title varchar;
    v_description text;
    v_reason_header text;
    v_priority varchar;
    v_due_date timestamptz;
    v_client_id uuid;
    v_client_site_id uuid;
    v_pergunta_respuesta jsonb;
    v_target jsonb;
    v_solicitud_codigo varchar;
    v_existing_sol_codigo varchar;
    v_worker_name text;
    
    v_source_assignment_id uuid;
    v_source_worker_id uuid;
    v_source_pedido_id uuid;
    v_source_pedido_item_id uuid;
    v_source_client_id uuid;
    v_source_client_site_id uuid;
    v_source_end_date date;
    v_effective_client_id uuid;
    v_seg_note text;
    
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
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_origin_pedido_id := (payload->>'origin_pedido_id')::uuid;
    v_type := payload->>'type';
    v_title := payload->>'title';
    v_description := payload->>'description';
    v_reason_header := payload->>'reason';
    v_priority := COALESCE(payload->>'priority', 'normal');
    v_due_date := (payload->>'due_date')::timestamptz;
    v_client_id := (payload->>'client_id')::uuid;
    v_client_site_id := (payload->>'client_site_id')::uuid;
    v_pergunta_respuesta := payload->'pergunta_respuesta';

    IF v_empresa_id IS NULL OR v_type IS NULL OR v_title IS NULL THEN
        RAISE EXCEPTION 'Payload inválido: empresa_id, type e title são obrigatórios no cabeçalho.';
    END IF;

    v_solicitud_codigo := core_operacoes.gerar_proximo_codigo_solicitud(v_type, v_empresa_id);
    v_solicitud_id := gen_random_uuid();

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
        reason,
        priority,
        status,
        pedido_id,
        due_date,
        client_id,
        client_site_id,
        pergunta_respuesta,
        created_by
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
        v_reason_header,
        v_priority,
        'pending',
        v_origin_pedido_id,
        v_due_date,
        v_client_id,
        v_client_site_id,
        v_pergunta_respuesta,
        v_user_id
    ) RETURNING codigo INTO v_solicitud_codigo;

    IF payload->'targets' IS NOT NULL AND jsonb_array_length(payload->'targets') > 0 THEN
        FOR v_target IN SELECT * FROM jsonb_array_elements(payload->'targets')
        LOOP
            v_source_assignment_id := (v_target->>'source_assignment_id')::uuid;
            v_source_worker_id := (v_target->>'source_worker_id')::uuid;
            v_source_pedido_id := (v_target->>'source_pedido_id')::uuid;
            v_source_pedido_item_id := (v_target->>'source_pedido_item_id')::uuid;
            v_source_client_id := (v_target->>'source_client_id')::uuid;
            v_source_client_site_id := (v_target->>'source_client_site_id')::uuid;
            v_source_end_date := NULLIF(TRIM(COALESCE(v_target->>'source_end_date', '')), '')::date;
            
            v_target_client_id := (v_target->>'target_client_id')::uuid;
            v_target_client_site_id := (v_target->>'target_client_site_id')::uuid;
            v_target_job_function_id := (v_target->>'target_job_function_id')::uuid;
            v_target_job_function_name := v_target->>'target_job_function_name';
            v_requires_housing := COALESCE((v_target->>'requires_housing')::boolean, false);
            v_housing_start_date := (v_target->>'housing_start_date')::date;
            v_housing_end_date := (v_target->>'housing_end_date')::date;
            v_requires_replacement := CASE
                WHEN v_type IN ('order_termination', 'order_extension', 'order_cancellation', 'order_postponement', 'order_pause') THEN false
                ELSE COALESCE((v_target->>'requires_replacement')::boolean, v_type = 'replacement')
            END;
            
            v_action_type := v_target->>'action_type';
            v_reason := v_target->>'reason';
            v_notes := v_target->>'notes';

            IF v_action_type IS NULL THEN
                RAISE EXCEPTION 'action_type é obrigatório em todos os targets.';
            END IF;

            IF v_type = 'replacement' AND v_action_type = 'replace' AND v_source_end_date IS NULL THEN
                RAISE EXCEPTION 'Informe a data de encerramento de trabalho (até quando vai trabalhar) para todos os trabalhadores substituídos.';
            END IF;

            v_effective_client_id := COALESCE(v_source_client_id, v_client_id);

            IF v_source_worker_id IS NOT NULL
               AND (v_source_pedido_id IS NULL OR v_source_pedido_item_id IS NULL)
               AND v_effective_client_id IS NOT NULL
            THEN
                SELECT
                    COALESCE(v_source_assignment_id, wa.id),
                    COALESCE(v_source_pedido_id, wa.pedido_id),
                    COALESCE(v_source_pedido_item_id, wa.pedido_item_id),
                    COALESCE(v_source_client_site_id, wa.client_site_id)
                INTO
                    v_source_assignment_id,
                    v_source_pedido_id,
                    v_source_pedido_item_id,
                    v_source_client_site_id
                FROM core_personal.worker_assignments wa
                JOIN core_comercial.pedidos p ON p.id = wa.pedido_id
                WHERE wa.worker_id = v_source_worker_id
                  AND wa.pedido_id IS NOT NULL
                  AND (wa.client_id = v_effective_client_id OR p.client_id = v_effective_client_id)
                ORDER BY
                    CASE WHEN wa.status IN ('active', 'planned', 'paused') THEN 0 ELSE 1 END,
                    wa.created_at DESC
                LIMIT 1;

                IF v_source_pedido_id IS NOT NULL AND v_origin_pedido_id IS NULL THEN
                    v_origin_pedido_id := v_source_pedido_id;
                    UPDATE core_operacoes.solicitudes_operativas
                    SET pedido_id = COALESCE(pedido_id, v_source_pedido_id),
                        client_site_id = COALESCE(client_site_id, v_source_client_site_id)
                    WHERE id = v_solicitud_id;
                END IF;
            END IF;

            IF v_type = 'replacement' AND v_action_type = 'replace' AND v_source_worker_id IS NOT NULL THEN
                SELECT s.codigo, w.nome
                INTO v_existing_sol_codigo, v_worker_name
                FROM core_operacoes.solicitud_targets st
                JOIN core_operacoes.solicitudes_operativas s ON s.id = st.solicitud_id
                LEFT JOIN core_personal.workers w ON w.id = st.source_worker_id
                WHERE st.solicitud_id != v_solicitud_id
                  AND st.source_worker_id = v_source_worker_id
                  AND st.action_type = 'replace'
                  AND st.status IN ('pending', 'in_progress')
                  AND s.status NOT IN ('cancelled', 'completed')
                  AND (
                      (v_source_pedido_id IS NOT NULL AND st.source_pedido_id = v_source_pedido_id)
                      OR (v_source_pedido_id IS NULL AND v_effective_client_id IS NOT NULL AND COALESCE(st.source_client_id, s.client_id) = v_effective_client_id)
                  )
                LIMIT 1;

                IF v_existing_sol_codigo IS NOT NULL THEN
                    RAISE EXCEPTION 'Já existe um Reemplazo em aberto (%) para o trabalhador % neste cliente/pedido.', v_existing_sol_codigo, COALESCE(v_worker_name, '');
                END IF;

                UPDATE core_operacoes.solicitud_targets st
                SET requires_replacement = false,
                    updated_at = NOW()
                FROM core_operacoes.solicitudes_operativas s
                WHERE s.id = st.solicitud_id
                  AND st.source_worker_id = v_source_worker_id
                  AND st.action_type = 'offboard'
                  AND st.requires_replacement = true
                  AND st.status IN ('pending', 'in_progress')
                  AND s.status != 'cancelled'
                  AND (
                      (v_source_pedido_id IS NOT NULL AND st.source_pedido_id = v_source_pedido_id)
                      OR (v_effective_client_id IS NOT NULL AND COALESCE(st.source_client_id, s.client_id) = v_effective_client_id)
                  );
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
                source_end_date,
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
                status,
                created_by
            ) VALUES (
                v_empresa_id,
                v_solicitud_id,
                v_source_assignment_id,
                v_source_worker_id,
                v_source_pedido_id,
                v_source_pedido_item_id,
                v_source_client_id,
                v_source_client_site_id,
                v_source_end_date,
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
                CASE WHEN v_type IN ('order_termination', 'order_extension') THEN 'completed' ELSE 'pending' END,
                v_user_id
            );

            IF v_type = 'replacement' AND v_action_type = 'replace' AND v_source_end_date IS NOT NULL THEN
                v_seg_note := '⚠️ REEMPLAZO (' || v_solicitud_codigo || '): Trabalha até ' || TO_CHAR(v_source_end_date, 'DD/MM/YYYY');

                IF v_source_assignment_id IS NOT NULL THEN
                    UPDATE core_personal.worker_assignments
                    SET end_date = v_source_end_date,
                        planned_end_date = v_source_end_date,
                        notes = CASE
                            WHEN COALESCE(notes, '') ILIKE '%' || v_solicitud_codigo || '%' THEN notes
                            ELSE COALESCE(NULLIF(notes, '') || E'\n', '') || v_seg_note
                        END,
                        updated_at = NOW()
                    WHERE id = v_source_assignment_id
                      AND status IN ('planned', 'active', 'paused');
                END IF;

                IF v_source_worker_id IS NOT NULL THEN
                    UPDATE core_personal.seguridade_status
                    SET lembrete_postit = CASE
                            WHEN COALESCE(lembrete_postit, '') ILIKE '%' || v_solicitud_codigo || '%' THEN lembrete_postit
                            ELSE COALESCE(NULLIF(lembrete_postit, '') || ' | ', '') || v_seg_note
                        END,
                        data_efetiva = CASE
                            WHEN tipo_evento::text = 'baixa' AND data_efetiva IS NULL THEN v_source_end_date
                            ELSE data_efetiva
                        END,
                        updated_at = NOW()
                    WHERE worker_id = v_source_worker_id
                      AND status = 'pendente';
                END IF;
            END IF;
        END LOOP;
    END IF;

    PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);

    UPDATE core_operacoes.solicitudes_operativas
    SET status = CASE WHEN tipo IN ('order_postponement', 'order_extension', 'order_termination') THEN 'completed' ELSE 'pending' END
    WHERE id = v_solicitud_id;

    RETURN v_solicitud_id;
END;
$function$;

-- 5.2 core_operacoes.iniciar_baixa_trabalhador_chat
CREATE OR REPLACE FUNCTION core_operacoes.iniciar_baixa_trabalhador_chat(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_worker_id UUID;
    v_worker_nome TEXT;
    v_conversation_id UUID;
    v_empresa_id UUID;
    v_assignment_id UUID;
    v_pedido_id UUID;
    v_pedido_item_id UUID;
    v_client_id UUID;
    v_client_site_id UUID;
    v_job_function_id UUID;
    v_job_function_name VARCHAR;
    v_cumpre_15_dias BOOLEAN;
    v_ultimo_dia DATE;
    v_desconto_horas BOOLEAN;
    v_motivo TEXT;
    v_observacoes TEXT;
    v_solicitud_id UUID := gen_random_uuid();
    v_solicitud_codigo VARCHAR;
    v_meta JSONB;
BEGIN
    v_worker_id := (payload->>'worker_id')::uuid;
    v_conversation_id := NULLIF(payload->>'conversation_id', '')::uuid;
    v_empresa_id := NULLIF(payload->>'empresa_id', '')::uuid;
    v_cumpre_15_dias := COALESCE((payload->>'cumpre_15_dias')::boolean, true);
    v_ultimo_dia := COALESCE(NULLIF(payload->>'ultimo_dia_trabalhado', '')::date, CURRENT_DATE + CASE WHEN v_cumpre_15_dias THEN 15 ELSE 0 END);
    v_desconto_horas := COALESCE((payload->>'aplicar_desconto_horas')::boolean, NOT v_cumpre_15_dias);
    v_motivo := COALESCE(NULLIF(TRIM(payload->>'motivo'), ''), 'Solicitação de saída pelo trabalhador (Carta de Renúncia)');
    v_observacoes := COALESCE(NULLIF(TRIM(payload->>'observacoes'), ''), '');

    IF v_worker_id IS NULL THEN
        RAISE EXCEPTION 'O campo worker_id é obrigatório.';
    END IF;

    SELECT nome INTO v_worker_nome FROM core_personal.workers WHERE id = v_worker_id;

    SELECT wa.id, wa.empresa_id, wa.pedido_id, wa.pedido_item_id, wa.client_id, wa.client_site_id, wa.job_function_id, wa.job_function_name_snapshot
    INTO v_assignment_id, v_empresa_id, v_pedido_id, v_pedido_item_id, v_client_id, v_client_site_id, v_job_function_id, v_job_function_name
    FROM core_personal.worker_assignments wa
    WHERE wa.worker_id = v_worker_id
      AND wa.status IN ('active', 'planned')
    ORDER BY wa.created_at DESC
    LIMIT 1;

    IF v_empresa_id IS NULL THEN
        SELECT id INTO v_empresa_id FROM core_common.empresas ORDER BY created_at ASC LIMIT 1;
    END IF;

    v_meta := jsonb_build_object(
        'cumpre_15_dias', v_cumpre_15_dias,
        'ultimo_dia_trabalhado', v_ultimo_dia,
        'aplicar_desconto_horas', v_desconto_horas,
        'conversation_id', v_conversation_id,
        'decisao_cliente_pendente', true
    );

    v_solicitud_codigo := core_operacoes.gerar_proximo_codigo_solicitud('worker_resignation', v_empresa_id);

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        pedido_id, pedido_item_id, client_id, client_site_id, target_worker_id, target_assignment_id,
        tipo, title, description, priority, status, reason, due_date, pergunta_respuesta, created_by
    ) VALUES (
        v_solicitud_id,
        v_empresa_id,
        v_solicitud_codigo,
        'mcs_chat',
        'worker',
        v_worker_id,
        v_pedido_id,
        v_pedido_item_id,
        v_client_id,
        v_client_site_id,
        v_worker_id,
        v_assignment_id,
        'worker_resignation',
        'Pedido de Saída / Aviso Prévio - ' || COALESCE(v_worker_nome, 'Trabalhador'),
        'Saída solicitada pelo trabalhador. Cumpre 15 dias: ' || CASE WHEN v_cumpre_15_dias THEN 'SIM' ELSE 'NÃO (Aplicar desconto)' END ||
        ' | Último dia: ' || TO_CHAR(v_ultimo_dia, 'DD/MM/YYYY') || ' | Motivo: ' || v_motivo,
        'urgent',
        'pending',
        v_motivo,
        v_ultimo_dia,
        v_meta,
        v_user_id
    ) RETURNING codigo INTO v_solicitud_codigo;

    INSERT INTO core_operacoes.solicitud_targets (
        empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id, source_pedido_item_id,
        source_client_id, source_client_site_id, target_job_function_id, target_job_function_name,
        action_type, status, reason, notes
    ) VALUES (
        v_empresa_id, v_solicitud_id, v_assignment_id, v_worker_id, v_pedido_id, v_pedido_item_id,
        v_client_id, v_client_site_id, v_job_function_id, v_job_function_name,
        'offboard', 'pending', v_motivo, v_observacoes
    );

    PERFORM core_operacoes.iniciar_playbook(v_solicitud_id);

    UPDATE core_operacoes.solicitud_tareas
    SET conversation_id = v_conversation_id,
        metadata = v_meta
    WHERE solicitud_id = v_solicitud_id;

    RETURN jsonb_build_object(
        'success', true,
        'solicitud_id', v_solicitud_id,
        'solicitud_codigo', v_solicitud_codigo,
        'ultimo_dia_trabalhado', v_ultimo_dia
    );
END;
$function$;

-- 5.3 core_operacoes.processar_adiamento_inicio
CREATE OR REPLACE FUNCTION core_operacoes.processar_adiamento_inicio(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_origem_tipo VARCHAR;
    v_origem_id UUID;
    v_nova_data_inicio DATE;
    v_motivo TEXT;
    v_observacoes TEXT;
    
    v_solicitud_id UUID;
    v_solicitud_codigo VARCHAR;
    v_new_postpone_solicitud_id UUID := gen_random_uuid();
    v_new_postpone_codigo VARCHAR;
    v_pedido_id UUID;
    v_pedido_codigo VARCHAR;
    v_client_id UUID;
    v_client_site_id UUID;
    v_client_name TEXT;
    v_codigo_ref VARCHAR;
    
    v_workers_updated INT := 0;
    v_cpp_updated INT := 0;
    
    v_dep_rh UUID;
    v_dep_doc UUID;
    v_dep_log UUID;
    v_dep_com UUID;
    v_msg TEXT;
    v_link VARCHAR;
    v_source_assignment_id UUID;
BEGIN
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_origem_tipo := LOWER(TRIM(payload->>'origem_tipo'));
    v_origem_id := (payload->>'origem_id')::uuid;
    v_nova_data_inicio := (payload->>'nova_data_inicio')::date;
    v_motivo := payload->>'motivo';
    v_observacoes := payload->>'observacoes';

    IF v_empresa_id IS NULL OR v_origem_id IS NULL OR v_nova_data_inicio IS NULL THEN
        RAISE EXCEPTION 'empresa_id, origem_id e nova_data_inicio são obrigatórios.';
    END IF;

    IF v_origem_tipo = 'pedido' THEN
        v_pedido_id := v_origem_id;

        SELECT p.codigo, p.client_id, p.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
        INTO v_pedido_codigo, v_client_id, v_client_site_id, v_client_name
        FROM core_comercial.pedidos p
        LEFT JOIN core_common.clients c ON c.id = p.client_id
        WHERE p.id = v_pedido_id;

        IF v_pedido_codigo IS NULL THEN
            RAISE EXCEPTION 'Pedido com ID % não encontrado.', v_pedido_id;
        END IF;

        v_codigo_ref := v_pedido_codigo;

        UPDATE core_comercial.pedidos
        SET expected_start_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE id = v_pedido_id;

        UPDATE core_personal.worker_assignments
        SET planned_start_date = v_nova_data_inicio,
            start_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE pedido_id = v_pedido_id
          AND status != 'terminated';
        
        GET DIAGNOSTICS v_workers_updated = ROW_COUNT;

        UPDATE public.colaborador_por_pedido
        SET fechainiciopedido = v_nova_data_inicio,
            updated_at = NOW()
        WHERE codpedido = v_pedido_codigo;

        GET DIAGNOSTICS v_cpp_updated = ROW_COUNT;
        v_link := '/operacoes/pedidos/' || v_pedido_id;

    ELSIF v_origem_tipo IN ('reemplazo', 'relocation', 'reubicacion') THEN
        v_solicitud_id := v_origem_id;

        SELECT s.codigo, s.pedido_id, s.client_id, s.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
        INTO v_solicitud_codigo, v_pedido_id, v_client_id, v_client_site_id, v_client_name
        FROM core_operacoes.solicitudes_operativas s
        LEFT JOIN core_common.clients c ON c.id = s.client_id
        WHERE s.id = v_solicitud_id;

        IF v_solicitud_codigo IS NULL THEN
            RAISE EXCEPTION 'Solicitação com ID % não encontrada.', v_solicitud_id;
        END IF;

        v_codigo_ref := v_solicitud_codigo;

        UPDATE core_operacoes.solicitudes_operativas
        SET due_date = (v_nova_data_inicio::TEXT || 'T12:00:00.000Z')::TIMESTAMPTZ,
            updated_at = NOW()
        WHERE id = v_solicitud_id;

        IF v_origem_tipo IN ('relocation', 'reubicacion') THEN
            UPDATE core_operacoes.solicitud_targets
            SET housing_start_date = CASE WHEN requires_housing THEN v_nova_data_inicio ELSE housing_start_date END,
                updated_at = NOW()
            WHERE solicitud_id = v_solicitud_id;
        END IF;

        UPDATE core_personal.worker_assignments
        SET planned_start_date = v_nova_data_inicio,
            start_date = v_nova_data_inicio,
            updated_at = NOW()
        WHERE (
            solicitud_id = v_solicitud_id 
            OR id IN (
                SELECT target_assignment_id 
                FROM core_operacoes.solicitud_targets 
                WHERE solicitud_id = v_solicitud_id AND target_assignment_id IS NOT NULL
            )
        )
        AND status != 'terminated';

        GET DIAGNOSTICS v_workers_updated = ROW_COUNT;

        IF v_origem_tipo = 'reemplazo' THEN
            SELECT source_assignment_id INTO v_source_assignment_id
            FROM core_operacoes.solicitud_targets
            WHERE solicitud_id = v_solicitud_id AND source_assignment_id IS NOT NULL
            LIMIT 1;

            IF v_source_assignment_id IS NOT NULL THEN
                UPDATE core_personal.worker_assignments
                SET end_date = (v_nova_data_inicio - 1),
                    updated_at = NOW()
                WHERE id = v_source_assignment_id;
            END IF;
        END IF;

        UPDATE public.colaborador_por_pedido
        SET fechainiciopedido = v_nova_data_inicio,
            updated_at = NOW()
        WHERE codpedido = v_solicitud_codigo;

        GET DIAGNOSTICS v_cpp_updated = ROW_COUNT;
        v_link := '/operacoes/solicitudes/' || v_solicitud_id;

        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id, solicitud_id, event_type, title, description, created_by
        ) VALUES (
            v_empresa_id,
            v_solicitud_id,
            'other',
            'Início Adiado',
            'Data prorrogada/adiada para ' || TO_CHAR(v_nova_data_inicio, 'DD/MM/YYYY') || '. Motivo: ' || COALESCE(v_motivo, 'Não informado'),
            v_user_id
        );
    END IF;

    v_new_postpone_codigo := core_operacoes.gerar_proximo_codigo_solicitud('order_postponement', v_empresa_id);

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        pedido_id, client_id, client_site_id, tipo, title, description, priority, status, reason, due_date, created_by
    ) VALUES (
        v_new_postpone_solicitud_id,
        v_empresa_id,
        v_new_postpone_codigo,
        'operacoes',
        v_origem_tipo,
        v_origem_id,
        v_pedido_id,
        v_client_id,
        v_client_site_id,
        'order_postponement',
        'Prorrogação de Início - ' || v_codigo_ref || ' (' || COALESCE(v_client_name, 'Cliente') || ') -> ' || TO_CHAR(v_nova_data_inicio, 'DD/MM/YYYY'),
        COALESCE(v_motivo, '') || CASE WHEN COALESCE(v_observacoes, '') != '' THEN ' | Obs: ' || v_observacoes ELSE '' END,
        'high',
        'pending',
        v_motivo,
        v_nova_data_inicio,
        v_user_id
    ) RETURNING codigo INTO v_new_postpone_codigo;

    IF v_solicitud_id IS NOT NULL THEN
        INSERT INTO core_operacoes.solicitud_targets (
            empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id,
            source_client_id, source_client_site_id, target_client_id, target_client_site_id,
            action_type, requires_replacement, status, reason, notes
        )
        SELECT v_empresa_id, v_new_postpone_solicitud_id, st.source_assignment_id, st.source_worker_id, st.source_pedido_id,
               st.source_client_id, st.source_client_site_id, st.target_client_id, st.target_client_site_id,
               'postpone', false, 'completed', v_motivo, v_observacoes
        FROM core_operacoes.solicitud_targets st
        WHERE st.solicitud_id = v_solicitud_id;
    ELSIF v_pedido_id IS NOT NULL THEN
        INSERT INTO core_operacoes.solicitud_targets (
            empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id,
            source_client_id, source_client_site_id, action_type, requires_replacement, status, reason, notes
        )
        SELECT v_empresa_id, v_new_postpone_solicitud_id, wa.id, wa.worker_id, wa.pedido_id,
               wa.client_id, wa.client_site_id, 'postpone', false, 'completed', v_motivo, v_observacoes
        FROM core_personal.worker_assignments wa
        WHERE wa.pedido_id = v_pedido_id AND wa.status NOT IN ('cancelled', 'terminated');
    END IF;

    PERFORM core_operacoes.iniciar_playbook(v_new_postpone_solicitud_id);

    SELECT id INTO v_dep_rh FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'RH';
    SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'DOCUMENTACION';
    SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'LOGISTICA';
    SELECT id INTO v_dep_com FROM core_common.departments WHERE empresa_id = v_empresa_id AND code = 'COMERCIAL';

    v_msg := 'O início de ' || v_codigo_ref || ' (' || COALESCE(v_client_name, 'Cliente') || ') foi adiado para ' || TO_CHAR(v_nova_data_inicio, 'DD/MM/YYYY') || '. Tarefas operacionais foram geradas para os setores.';

    PERFORM core_common.create_notification(v_empresa_id, v_dep_rh,  NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_doc, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_log, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);
    PERFORM core_common.create_notification(v_empresa_id, v_dep_com, NULL, 'Início Adiado - ' || v_codigo_ref, v_msg, 'date_change', 'warning', v_link);

    RETURN jsonb_build_object(
        'success', true,
        'origem_tipo', v_origem_tipo,
        'codigo_ref', v_codigo_ref,
        'nova_data_inicio', v_nova_data_inicio,
        'solicitud_id', COALESCE(v_solicitud_id, v_new_postpone_solicitud_id),
        'postpone_solicitud_id', v_new_postpone_solicitud_id,
        'postpone_solicitud_codigo', v_new_postpone_codigo,
        'pedido_id', v_pedido_id,
        'workers_assignments_updated', v_workers_updated,
        'cpp_records_updated', v_cpp_updated
    );
END;
$function$;

-- 5.4 core_operacoes.processar_cancelamento_pedido
CREATE OR REPLACE FUNCTION core_operacoes.processar_cancelamento_pedido(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_pedido_id UUID;
    v_motivo TEXT;
    v_observacoes TEXT;
    v_cancel_assignments BOOLEAN;
    v_worker_destination_status VARCHAR;

    v_pedido_codigo VARCHAR;
    v_client_id UUID;
    v_client_site_id UUID;
    v_client_name TEXT;
    v_current_status VARCHAR;

    v_initial_solicitud_id UUID;
    v_initial_solicitud_codigo VARCHAR;
    v_new_solicitud_id UUID := gen_random_uuid();
    v_new_solicitud_codigo VARCHAR;

    v_workers_cancelled INT := 0;
    v_tasks_cancelled INT := 0;
    v_items_cancelled INT := 0;
    v_target_assignment_ids UUID[] := ARRAY[]::UUID[];

    v_msg TEXT;
    v_link VARCHAR;
    r_assign RECORD;
BEGIN
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_pedido_id := (payload->>'pedido_id')::uuid;
    v_motivo := COALESCE(NULLIF(TRIM(payload->>'motivo'), ''), 'Cancelamento solicitado pelo cliente');
    v_observacoes := COALESCE(NULLIF(TRIM(payload->>'observacoes'), ''), '');
    v_cancel_assignments := COALESCE((payload->>'cancel_assignments')::boolean, true);
    v_worker_destination_status := COALESCE(NULLIF(TRIM(payload->>'worker_destination_status'), ''), 'Disponível');

    IF v_empresa_id IS NULL OR v_pedido_id IS NULL THEN
        RAISE EXCEPTION 'empresa_id e pedido_id são obrigatórios.';
    END IF;

    SELECT p.codigo, p.client_id, p.client_site_id, p.commercial_status, COALESCE(c.trade_name, c.legal_name, 'Cliente')
    INTO v_pedido_codigo, v_client_id, v_client_site_id, v_current_status, v_client_name
    FROM core_comercial.pedidos p
    LEFT JOIN core_common.clients c ON c.id = p.client_id
    WHERE p.id = v_pedido_id;

    IF v_pedido_codigo IS NULL THEN
        RAISE EXCEPTION 'Pedido com ID % não encontrado.', v_pedido_id;
    END IF;

    UPDATE core_comercial.pedidos
    SET commercial_status = 'cancelled',
        operational_status = 'cancelled',
        notes = COALESCE(notes || E'\n', '') || '[CANCELADO EM ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || '] Motivo: ' || v_motivo || CASE WHEN v_observacoes != '' THEN E'\nObs: ' || v_observacoes ELSE '' END,
        updated_at = NOW()
    WHERE id = v_pedido_id;

    UPDATE core_comercial.pedido_items
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE pedido_id = v_pedido_id;
    GET DIAGNOSTICS v_items_cancelled = ROW_COUNT;

    SELECT id, codigo INTO v_initial_solicitud_id, v_initial_solicitud_codigo
    FROM core_operacoes.solicitudes_operativas
    WHERE pedido_id = v_pedido_id AND tipo = 'new_order'
    LIMIT 1;

    IF v_initial_solicitud_id IS NOT NULL THEN
        UPDATE core_operacoes.solicitudes_operativas
        SET status = 'cancelled',
            description = COALESCE(description || E'\n', '') || '[Cancelada em ' || to_char(NOW(), 'DD/MM/YYYY') || ']: ' || v_motivo,
            updated_at = NOW()
        WHERE id = v_initial_solicitud_id;
    END IF;

    UPDATE core_operacoes.solicitud_tareas
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE solicitud_id IN (
        SELECT id FROM core_operacoes.solicitudes_operativas WHERE pedido_id = v_pedido_id
    )
    AND status NOT IN ('completed', 'cancelled');
    GET DIAGNOSTICS v_tasks_cancelled = ROW_COUNT;

    SELECT COALESCE(ARRAY_AGG(wa.id), ARRAY[]::UUID[])
    INTO v_target_assignment_ids
    FROM core_personal.worker_assignments wa
    WHERE wa.pedido_id = v_pedido_id
      AND wa.status IN ('planned', 'active', 'paused');

    IF v_cancel_assignments THEN
        FOR r_assign IN
            SELECT wa.id AS assignment_id, wa.worker_id
            FROM core_personal.worker_assignments wa
            WHERE wa.id = ANY(v_target_assignment_ids)
        LOOP
            UPDATE core_personal.worker_assignments
            SET status = 'cancelled',
                notes = COALESCE(notes || E'\n', '') || 'Cancelado em ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || ' - Pedido Cancelado: ' || v_motivo,
                updated_at = NOW()
            WHERE id = r_assign.assignment_id;

            UPDATE core_personal.contracts
            SET status = 'cancelled',
                updated_at = NOW()
            WHERE assignment_id = r_assign.assignment_id
              AND signed_at IS NULL;

            UPDATE core_personal.seguridade_status
            SET status = 'cancelado',
                observacoes = COALESCE(observacoes || E'\n', '') || 'Cancelado por cancelamento do pedido ' || v_pedido_codigo || ': ' || v_motivo,
                updated_at = NOW()
            WHERE worker_id = r_assign.worker_id
              AND status IN ('pendente', 'erro');

            UPDATE core_personal.workers
            SET status_trabajador = CASE 
                    WHEN status_trabajador = 'Desistiu' THEN status_trabajador
                    ELSE COALESCE(v_worker_destination_status, 'Disponível')
                END,
                departure_reason = 'Pedido cancelado pelo cliente: ' || v_motivo,
                notes = COALESCE(notes || E'\n', '') || 'Alocação cancelada por cancelamento do pedido ' || v_pedido_codigo
            WHERE id = r_assign.worker_id
              AND status_trabajador = 'Pendente Ingresso';

            v_workers_cancelled := v_workers_cancelled + 1;
        END LOOP;
    END IF;

    v_new_solicitud_codigo := core_operacoes.gerar_proximo_codigo_solicitud('order_cancellation', v_empresa_id);

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        tipo, title, description, priority, status, pedido_id, due_date, client_id, client_site_id, reason, created_by
    ) VALUES (
        v_new_solicitud_id,
        v_empresa_id,
        v_new_solicitud_codigo,
        'comercial',
        'pedido',
        v_pedido_id,
        'order_cancellation',
        'Cancelamento de Pedido - ' || v_pedido_codigo || ' - ' || v_client_name,
        'Cancelamento operacional efetuado. Motivo: ' || v_motivo || CASE WHEN v_observacoes != '' THEN E'\nObs: ' || v_observacoes ELSE '' END,
        'urgent',
        'pending',
        v_pedido_id,
        NOW(),
        v_client_id,
        v_client_site_id,
        v_motivo,
        v_user_id
    ) RETURNING codigo INTO v_new_solicitud_codigo;

    INSERT INTO core_operacoes.solicitud_targets (
        empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id,
        source_client_id, source_client_site_id, action_type, requires_replacement, status, reason, notes
    )
    SELECT 
        v_empresa_id, v_new_solicitud_id, wa.id, wa.worker_id, wa.pedido_id,
        wa.client_id, wa.client_site_id, 'cancel', false, 'completed', v_motivo, v_observacoes
    FROM core_personal.worker_assignments wa
    WHERE wa.id = ANY(v_target_assignment_ids);

    PERFORM core_operacoes.iniciar_playbook(v_new_solicitud_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pedido cancelado e tarefas de desmobilização criadas nos setores.',
        'pedido_id', v_pedido_id,
        'pedido_codigo', v_pedido_codigo,
        'solicitud_id', v_new_solicitud_id,
        'solicitud_codigo', v_new_solicitud_codigo,
        'workers_cancelled', v_workers_cancelled,
        'tasks_cancelled', v_tasks_cancelled,
        'items_cancelled', v_items_cancelled
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION core_operacoes.processar_cancelamento_pedido(jsonb) TO authenticated;

-- 5.5 core_operacoes.processar_pausa_pedido
CREATE OR REPLACE FUNCTION core_operacoes.processar_pausa_pedido(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_pedido_id UUID;
    v_motivo TEXT;
    v_observacoes TEXT;
    v_previsao_retomada TEXT;
    
    v_pedido_codigo VARCHAR;
    v_client_id UUID;
    v_client_site_id UUID;
    v_client_name TEXT;
    
    v_new_solicitud_id UUID := gen_random_uuid();
    v_new_solicitud_codigo VARCHAR;
    v_workers_affected INT := 0;
    
    r_assign RECORD;
BEGIN
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_pedido_id := (payload->>'pedido_id')::uuid;
    v_motivo := TRIM(COALESCE(payload->>'motivo', ''));
    v_observacoes := TRIM(COALESCE(payload->>'observacoes', ''));
    v_previsao_retomada := TRIM(COALESCE(payload->>'previsao_retomada', ''));

    IF v_pedido_id IS NULL THEN
        RAISE EXCEPTION 'O campo pedido_id é obrigatório.';
    END IF;

    IF v_motivo = '' THEN
        RAISE EXCEPTION 'O motivo da pausa é obrigatório.';
    END IF;

    SELECT p.codigo, p.empresa_id, p.client_id, p.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
    INTO v_pedido_codigo, v_empresa_id, v_client_id, v_client_site_id, v_client_name
    FROM core_comercial.pedidos p
    LEFT JOIN core_common.clients c ON c.id = p.client_id
    WHERE p.id = v_pedido_id;

    IF v_pedido_codigo IS NULL THEN
        RAISE EXCEPTION 'Pedido com ID % não encontrado.', v_pedido_id;
    END IF;

    UPDATE core_comercial.pedidos
    SET operational_status = 'paused',
        notes = COALESCE(notes || E'\n\n', '') || '[PAUSA DE PEDIDO - ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || E']\nMotivo: ' || v_motivo || 
                CASE WHEN v_previsao_retomada != '' THEN E'\nPrevisão Retomada: ' || v_previsao_retomada ELSE '' END ||
                CASE WHEN v_observacoes != '' THEN E'\nObs: ' || v_observacoes ELSE '' END,
        updated_at = NOW()
    WHERE id = v_pedido_id;

    v_new_solicitud_codigo := core_operacoes.gerar_proximo_codigo_solicitud('order_pause', v_empresa_id);

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, pedido_id, client_id, client_site_id,
        source_module, source_entity_type, source_entity_id,
        tipo, title, description, priority, status, created_by, reason, due_date
    )
    VALUES (
        v_new_solicitud_id,
        v_empresa_id,
        v_new_solicitud_codigo,
        v_pedido_id,
        v_client_id,
        v_client_site_id,
        'operacoes',
        'pedido',
        v_pedido_id,
        'order_pause',
        'Pausa de Pedido - ' || v_pedido_codigo || ' (' || v_client_name || ')',
        'Pausa solicitada pelo cliente. Motivo: ' || v_motivo || 
        CASE WHEN v_previsao_retomada != '' THEN ' | Previsão: ' || v_previsao_retomada ELSE '' END ||
        CASE WHEN v_observacoes != '' THEN ' | Detalhes: ' || v_observacoes ELSE '' END,
        'high',
        'pending',
        v_user_id,
        v_motivo,
        NOW()
    ) RETURNING codigo INTO v_new_solicitud_codigo;

    FOR r_assign IN
        SELECT wa.id AS assignment_id, wa.worker_id, wa.job_function_id, wa.job_function_name_snapshot,
               w.nome AS worker_nome, w.cod_colab
        FROM core_personal.worker_assignments wa
        JOIN core_personal.workers w ON w.id = wa.worker_id
        WHERE wa.pedido_id = v_pedido_id
          AND wa.status NOT IN ('cancelled', 'terminated')
    LOOP
        INSERT INTO core_operacoes.solicitud_targets (
            empresa_id,
            solicitud_id,
            source_assignment_id,
            source_worker_id,
            source_pedido_id,
            source_client_id,
            source_client_site_id,
            target_assignment_id,
            target_worker_id,
            target_job_function_id,
            target_job_function_name,
            action_type,
            requires_replacement,
            status,
            reason,
            notes
        )
        VALUES (
            v_empresa_id,
            v_new_solicitud_id,
            r_assign.assignment_id,
            r_assign.worker_id,
            v_pedido_id,
            v_client_id,
            v_client_site_id,
            r_assign.assignment_id,
            r_assign.worker_id,
            r_assign.job_function_id,
            r_assign.job_function_name_snapshot,
            'pause',
            false,
            'pending',
            v_motivo,
            v_observacoes
        );

        UPDATE core_personal.worker_assignments
        SET notes = COALESCE(notes || E'\n', '') || '[Início Pausado em ' || to_char(NOW(), 'DD/MM/YYYY') || ']: ' || v_motivo,
            updated_at = NOW()
        WHERE id = r_assign.assignment_id;

        v_workers_affected := v_workers_affected + 1;
    END LOOP;

    BEGIN
        PERFORM core_operacoes.iniciar_playbook(v_new_solicitud_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Aviso ao iniciar playbook para solicitude %: %', v_new_solicitud_id, SQLERRM;
    END;

    INSERT INTO core_operacoes.solicitud_timeline (
        empresa_id, solicitud_id, event_type, title, description, created_by
    )
    VALUES (
        v_empresa_id,
        v_new_solicitud_id,
        'status_changed',
        'Pausa Registrada',
        'Pedido ' || v_pedido_codigo || ' pausado. Motivo: ' || v_motivo || '. Trabalhadores afetados: ' || v_workers_affected::TEXT,
        v_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'solicitud_id', v_new_solicitud_id,
        'solicitud_codigo', v_new_solicitud_codigo,
        'pedido_codigo', v_pedido_codigo,
        'workers_affected', v_workers_affected
    );
END;
$function$;

-- 5.6 core_operacoes.processar_prorrogacao_ou_finalizacao_obra
CREATE OR REPLACE FUNCTION core_operacoes.processar_prorrogacao_ou_finalizacao_obra(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_pedido_id UUID;
    v_tipo VARCHAR;
    v_nova_data_fim DATE;
    v_motivo TEXT;
    v_observacoes TEXT;

    v_pedido_codigo VARCHAR;
    v_client_id UUID;
    v_client_site_id UUID;
    v_client_name TEXT;

    v_new_solicitud_id UUID := gen_random_uuid();
    v_new_solicitud_codigo VARCHAR;
BEGIN
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_pedido_id := (payload->>'pedido_id')::uuid;
    v_tipo := LOWER(TRIM(COALESCE(payload->>'tipo', 'order_extension')));
    v_nova_data_fim := NULLIF(payload->>'nova_data_fim', '')::date;
    v_motivo := COALESCE(NULLIF(TRIM(payload->>'motivo'), ''), 'Solicitação operacional');
    v_observacoes := COALESCE(NULLIF(TRIM(payload->>'observacoes'), ''), '');

    IF v_pedido_id IS NULL THEN
        RAISE EXCEPTION 'O campo pedido_id é obrigatório.';
    END IF;

    SELECT p.codigo, COALESCE(v_empresa_id, p.empresa_id), p.client_id, p.client_site_id, COALESCE(c.trade_name, c.legal_name, 'Cliente')
    INTO v_pedido_codigo, v_empresa_id, v_client_id, v_client_site_id, v_client_name
    FROM core_comercial.pedidos p
    LEFT JOIN core_common.clients c ON c.id = p.client_id
    WHERE p.id = v_pedido_id;

    IF v_pedido_codigo IS NULL THEN
        RAISE EXCEPTION 'Pedido % não encontrado.', v_pedido_id;
    END IF;

    IF v_tipo = 'order_extension' THEN
        UPDATE core_comercial.pedidos
        SET expected_end_date = COALESCE(v_nova_data_fim, expected_end_date),
            updated_at = NOW()
        WHERE id = v_pedido_id;

        IF v_nova_data_fim IS NOT NULL THEN
            UPDATE core_personal.worker_assignments
            SET planned_end_date = v_nova_data_fim,
                updated_at = NOW()
            WHERE pedido_id = v_pedido_id
              AND status IN ('active', 'planned');
        END IF;
    ELSIF v_tipo = 'order_termination' THEN
        UPDATE core_comercial.pedidos
        SET expected_end_date = COALESCE(v_nova_data_fim, CURRENT_DATE),
            commercial_status = 'completed',
            operational_status = 'completed',
            updated_at = NOW()
        WHERE id = v_pedido_id;

        UPDATE core_comercial.pedido_items
        SET status = 'fulfilled',
            updated_at = NOW()
        WHERE pedido_id = v_pedido_id
          AND status = 'pending';
    END IF;

    v_new_solicitud_codigo := core_operacoes.gerar_proximo_codigo_solicitud(v_tipo, v_empresa_id);

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        tipo, title, description, priority, status, pedido_id, due_date, client_id, client_site_id, reason, created_by
    ) VALUES (
        v_new_solicitud_id,
        v_empresa_id,
        v_new_solicitud_codigo,
        'operacoes',
        'pedido',
        v_pedido_id,
        v_tipo,
        CASE WHEN v_tipo = 'order_extension'
             THEN 'Prorrogação de Obra - ' || v_pedido_codigo || ' (' || v_client_name || ')'
             ELSE 'Finalização de Obra - ' || v_pedido_codigo || ' (' || v_client_name || ')'
        END,
        v_motivo || CASE WHEN v_observacoes != '' THEN ' | Obs: ' || v_observacoes ELSE '' END,
        'high',
        'completed',
        v_pedido_id,
        COALESCE(v_nova_data_fim, CURRENT_DATE),
        v_client_id,
        v_client_site_id,
        v_motivo,
        v_user_id
    ) RETURNING codigo INTO v_new_solicitud_codigo;

    INSERT INTO core_operacoes.solicitud_targets (
        empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id, source_pedido_item_id,
        source_client_id, source_client_site_id, action_type, requires_replacement, status, reason, notes
    )
    SELECT
        v_empresa_id, v_new_solicitud_id, wa.id, wa.worker_id, wa.pedido_id, wa.pedido_item_id,
        wa.client_id, wa.client_site_id,
        CASE WHEN v_tipo = 'order_extension' THEN 'extend' ELSE 'offboard' END,
        false,
        'completed',
        v_motivo,
        v_observacoes
    FROM core_personal.worker_assignments wa
    WHERE wa.pedido_id = v_pedido_id
      AND wa.status NOT IN ('cancelled', 'terminated');

    PERFORM core_operacoes.iniciar_playbook(v_new_solicitud_id);

    RETURN jsonb_build_object(
        'success', true,
        'solicitud_id', v_new_solicitud_id,
        'solicitud_codigo', v_new_solicitud_codigo,
        'pedido_id', v_pedido_id
    );
END;
$function$;

-- 5.7 core_personal.cancelar_alocacao_trabalhador
CREATE OR REPLACE FUNCTION core_personal.cancelar_alocacao_trabalhador(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_assignment_id UUID;
    v_reason TEXT;
    
    v_has_access BOOLEAN;
    v_worker_id UUID;
    v_worker_nome TEXT;
    v_pedido_item_id UUID;
    v_pedido_id UUID;
    v_client_id UUID;
    v_client_site_id UUID;
    v_empresa_id UUID;
    v_status_anterior VARCHAR;
    v_solicitud_id UUID;
    v_effective_start_date DATE;
    v_pedido_op_status VARCHAR;
    v_pedido_expected_start DATE;
    
    v_pedido_codigo VARCHAR;
    v_total_items INT;
    v_fulfilled_items INT;
    v_new_operational_status VARCHAR;
    v_new_item_fulfilled INT;

    v_withdrawal_solicitud_id UUID := gen_random_uuid();
    v_withdrawal_codigo VARCHAR;
BEGIN
    v_assignment_id := (payload->>'assignment_id')::uuid;
    v_reason := payload->>'reason';
    
    IF v_assignment_id IS NULL THEN
        RAISE EXCEPTION 'O campo assignment_id é obrigatório.';
    END IF;

    SELECT wa.worker_id, w.nome, wa.pedido_item_id, wa.pedido_id, wa.client_id, wa.client_site_id, wa.empresa_id, wa.status, wa.solicitud_id,
           COALESCE(wa.planned_start_date, wa.start_date)::date
    INTO v_worker_id, v_worker_nome, v_pedido_item_id, v_pedido_id, v_client_id, v_client_site_id, v_empresa_id, v_status_anterior, v_solicitud_id,
         v_effective_start_date
    FROM core_personal.worker_assignments wa
    LEFT JOIN core_personal.workers w ON w.id = wa.worker_id
    WHERE wa.id = v_assignment_id;

    IF v_worker_id IS NULL THEN
        RAISE EXCEPTION 'Alocação não encontrada.';
    END IF;

    IF v_pedido_id IS NOT NULL THEN
        SELECT codigo, COALESCE(v_client_id, client_id), COALESCE(v_client_site_id, client_site_id), operational_status, expected_start_date::date
        INTO v_pedido_codigo, v_client_id, v_client_site_id, v_pedido_op_status, v_pedido_expected_start
        FROM core_comercial.pedidos
        WHERE id = v_pedido_id;
    END IF;

    SELECT (
        public.get_my_role() = 'super_admin'
        OR EXISTS (
            SELECT 1 FROM core_common.user_memberships
            WHERE user_id = v_user_id 
              AND empresa_id = v_empresa_id 
              AND is_active = true
              AND role IN ('admin', 'rh', 'super_admin', 'admin_rh', 'operador')
        )
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Acesso negado. Apenas RH ou Operação (Admin) podem cancelar alocações.';
    END IF;

    IF v_status_anterior = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Alocação já está cancelada.');
    END IF;

    IF v_pedido_op_status IN ('completed', 'cancelled') OR v_status_anterior IN ('completed', 'replaced', 'relocated', 'terminated') THEN
        RAISE EXCEPTION 'Não é permitido cancelar por desistência um pedido ou alocação já finalizada/substituída.';
    END IF;

    v_effective_start_date := COALESCE(v_effective_start_date, v_pedido_expected_start);
    IF v_effective_start_date IS NOT NULL AND CURRENT_DATE > v_effective_start_date THEN
        RAISE EXCEPTION 'Não é permitido registrar desistência após a data de início (Início: %). Como a obra/alocação já iniciou, utilize a Solicitação de Baixa ou Substituição (Reemplazo) em Operações.', to_char(v_effective_start_date, 'DD/MM/YYYY');
    END IF;

    UPDATE core_personal.worker_assignments
    SET status = 'cancelled',
        end_date = NULL,
        notes = COALESCE(notes || E'\n', '') || 'Cancelado em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || COALESCE(' - Motivo: ' || v_reason, ' - Desistência do trabalhador')
    WHERE id = v_assignment_id;

    IF v_solicitud_id IS NOT NULL THEN
        UPDATE core_operacoes.solicitud_targets
        SET status = 'pending',
            target_worker_id = NULL,
            target_assignment_id = NULL,
            updated_at = now()
        WHERE target_assignment_id = v_assignment_id;

        UPDATE core_operacoes.solicitudes_operativas
        SET status = 'in_progress',
            updated_at = now()
        WHERE id = v_solicitud_id;
    END IF;

    IF v_pedido_item_id IS NOT NULL THEN
        SELECT COUNT(*)::int INTO v_new_item_fulfilled
        FROM core_personal.worker_assignments wa
        WHERE wa.pedido_item_id = v_pedido_item_id
          AND wa.status IN ('planned', 'active', 'paused');

        UPDATE core_comercial.pedido_items pi
        SET quantity_fulfilled = v_new_item_fulfilled,
            status = CASE
                WHEN v_new_item_fulfilled >= pi.quantity_requested THEN 'fulfilled'
                ELSE 'pending'
            END,
            updated_at = now()
        WHERE pi.id = v_pedido_item_id;
    END IF;

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
        SET operational_status = v_new_operational_status,
            updated_at = now()
        WHERE id = v_pedido_id;
    END IF;

    UPDATE core_personal.workers
    SET status_trabajador = 'Desistiu',
        departure_reason = COALESCE(v_reason, 'Desistência do trabalhador'),
        notes = COALESCE(notes || E'\n', '') || 'Desistiu da contratação em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || COALESCE(': ' || v_reason, '')
    WHERE id = v_worker_id;

    UPDATE core_personal.seguridade_status
    SET status = 'cancelado',
        observacoes = COALESCE(observacoes || E'\n', '') || 'Alocação cancelada: ' || COALESCE(v_reason, 'Desistência do trabalhador')
    WHERE worker_id = v_worker_id 
      AND status IN ('pendente', 'erro');

    UPDATE core_personal.contracts
    SET status = 'cancelled'
    WHERE assignment_id = v_assignment_id 
      AND signed_at IS NULL;

    v_withdrawal_codigo := core_operacoes.gerar_proximo_codigo_solicitud('hiring_withdrawal', v_empresa_id);

    INSERT INTO core_operacoes.solicitudes_operativas (
        id, empresa_id, codigo, source_module, source_entity_type, source_entity_id,
        pedido_id, pedido_item_id, client_id, client_site_id, target_worker_id, target_assignment_id,
        tipo, title, description, priority, status, reason, due_date, created_by
    ) VALUES (
        v_withdrawal_solicitud_id,
        v_empresa_id,
        v_withdrawal_codigo,
        'rh',
        'worker_assignment',
        v_assignment_id,
        v_pedido_id,
        v_pedido_item_id,
        v_client_id,
        v_client_site_id,
        v_worker_id,
        v_assignment_id,
        'hiring_withdrawal',
        'Desistência na Contratação - ' || COALESCE(v_worker_nome, 'Trabalhador') || COALESCE(' (' || v_pedido_codigo || ')', ''),
        'Trabalhador desistiu na etapa de contratação/assinatura de contrato. Motivo: ' || COALESCE(v_reason, 'Não informado'),
        'urgent',
        'pending',
        v_reason,
        CURRENT_DATE + 1,
        v_user_id
    ) RETURNING codigo INTO v_withdrawal_codigo;

    INSERT INTO core_operacoes.solicitud_targets (
        empresa_id, solicitud_id, source_assignment_id, source_worker_id, source_pedido_id, source_pedido_item_id,
        source_client_id, source_client_site_id, action_type, requires_replacement, status, reason
    ) VALUES (
        v_empresa_id, v_withdrawal_solicitud_id, v_assignment_id, v_worker_id, v_pedido_id, v_pedido_item_id,
        v_client_id, v_client_site_id, 'offboard', false, 'completed', v_reason
    );

    PERFORM core_operacoes.iniciar_playbook(v_withdrawal_solicitud_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Alocação cancelada e tarefas de desistência distribuídas aos setores.',
        'assignment_id', v_assignment_id,
        'worker_id', v_worker_id,
        'solicitud_id', v_withdrawal_solicitud_id,
        'solicitud_codigo', v_withdrawal_codigo
    );
END;
$function$;
