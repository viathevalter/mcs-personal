-- Migration: 20261116100000_fix_orphan_replacements_and_prevent_duplicate_slots.sql
-- Description:
--   1. Relinks historical orphan late-replacements (where source_pedido_id / pedido_item_id were NULL
--      despite the replaced worker belonging to an active commercial Pedido on that client),
--      including STOCCO PED-2026-000815 (R-2026-000259 -> DIEGO SALAMANCA E2482).
--   2. Syncs PED-2026-000815 pedido_items.quantity_fulfilled = 2 and operational_status = 'fulfilled'.
--   3. Adds backend guardrails to core_operacoes.criar_solicitud_operativa_com_targets:
--      - Auto-resolves source_assignment_id, source_pedido_id, and source_pedido_item_id when missing.
--      - Prevents duplicate open replacement solicitudes for the same worker/client.
--      - Deduplicates requires_replacement when a separate replacement is opened after an offboarding.

BEGIN;

-- 1. Heal orphan replacement targets & active substitute worker_assignments
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            s.id AS sol_id,
            st.id AS target_id,
            st.target_assignment_id,
            owa.id AS orig_wa_id,
            owa.pedido_id AS orig_pedido_id,
            owa.pedido_item_id AS orig_item_id,
            owa.client_site_id AS orig_site_id
        FROM core_operacoes.solicitudes_operativas s
        JOIN core_operacoes.solicitud_targets st ON st.solicitud_id = s.id
        JOIN LATERAL (
            SELECT owa_inner.*
            FROM core_personal.worker_assignments owa_inner
            JOIN core_comercial.pedidos p2 ON p2.id = owa_inner.pedido_id
            WHERE owa_inner.worker_id = st.source_worker_id
              AND owa_inner.pedido_id IS NOT NULL
              AND (
                  owa_inner.client_id = COALESCE(st.source_client_id, s.client_id)
                  OR p2.client_id = COALESCE(st.source_client_id, s.client_id)
              )
            ORDER BY owa_inner.created_at DESC
            LIMIT 1
        ) owa ON TRUE
        WHERE s.tipo = 'replacement'
          AND st.source_pedido_id IS NULL
    LOOP
        UPDATE core_operacoes.solicitud_targets
        SET source_assignment_id = COALESCE(source_assignment_id, r.orig_wa_id),
            source_pedido_id = COALESCE(source_pedido_id, r.orig_pedido_id),
            source_pedido_item_id = COALESCE(source_pedido_item_id, r.orig_item_id),
            source_client_site_id = COALESCE(source_client_site_id, r.orig_site_id),
            updated_at = NOW()
        WHERE id = r.target_id;

        UPDATE core_operacoes.solicitudes_operativas
        SET pedido_id = COALESCE(pedido_id, r.orig_pedido_id),
            client_site_id = COALESCE(client_site_id, r.orig_site_id),
            updated_at = NOW()
        WHERE id = r.sol_id;

        IF r.target_assignment_id IS NOT NULL THEN
            UPDATE core_personal.worker_assignments
            SET pedido_id = COALESCE(pedido_id, r.orig_pedido_id),
                pedido_item_id = COALESCE(pedido_item_id, r.orig_item_id),
                client_site_id = COALESCE(client_site_id, r.orig_site_id),
                replacement_of_assignment_id = COALESCE(replacement_of_assignment_id, r.orig_wa_id),
                updated_at = NOW()
            WHERE id = r.target_assignment_id
              AND status IN ('planned', 'active', 'paused')
              AND pedido_item_id IS NULL;
        END IF;
    END LOOP;
END $$;

-- 2. Sync fulfilled counts on active orders whose active/planned/paused assignments now cover their items (e.g. PED-2026-000815)
UPDATE core_comercial.pedido_items pi
SET quantity_fulfilled = sub.active_count,
    status = CASE WHEN sub.active_count >= pi.quantity_requested THEN 'fulfilled' ELSE pi.status END,
    updated_at = NOW()
FROM (
    SELECT pi2.id AS item_id,
           COUNT(wa.id)::int AS active_count
    FROM core_comercial.pedido_items pi2
    JOIN core_comercial.pedidos p2 ON p2.id = pi2.pedido_id
    JOIN core_personal.worker_assignments wa
      ON wa.pedido_item_id = pi2.id
     AND wa.status IN ('planned', 'active', 'paused')
    WHERE p2.commercial_status = 'active'
    GROUP BY pi2.id
) sub
WHERE pi.id = sub.item_id
  AND pi.quantity_fulfilled < sub.active_count;

UPDATE core_comercial.pedidos p
SET operational_status = 'fulfilled',
    updated_at = NOW()
WHERE p.commercial_status = 'active'
  AND p.operational_status IN ('pending_operations', 'partially_fulfilled')
  AND NOT EXISTS (
      SELECT 1
      FROM core_comercial.pedido_items pi
      WHERE pi.pedido_id = p.id
        AND pi.status != 'cancelled'
        AND pi.quantity_fulfilled < pi.quantity_requested
  );

-- 3. Harden core_operacoes.criar_solicitud_operativa_com_targets against orphan links and duplicate replacement slots
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
    v_max_seq int;
    v_solicitudes_count int;
    
    -- Aux variables for targets
    v_source_assignment_id uuid;
    v_source_worker_id uuid;
    v_source_pedido_id uuid;
    v_source_pedido_item_id uuid;
    v_source_client_id uuid;
    v_source_client_site_id uuid;
    v_effective_client_id uuid;
    
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

    -- 2. Criar a Solicitação Operativa (Cabeçalho)
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

            v_effective_client_id := COALESCE(v_source_client_id, v_client_id);

            -- 3.1 Auto-vincular pedido/item original caso venha de alocação virtual ou baixa recente sem pedido_id explícito
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

            -- 3.2 Bloquear duplicidade de Reemplazo pendente para o mesmo trabalhador no mesmo cliente/pedido
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
                      OR (v_effective_client_id IS NOT NULL AND COALESCE(st.source_client_id, s.client_id) = v_effective_client_id)
                  )
                LIMIT 1;

                IF v_existing_sol_codigo IS NOT NULL THEN
                    RAISE EXCEPTION 'Já existe um Reemplazo em aberto (%) para o trabalhador % neste cliente/pedido.', v_existing_sol_codigo, COALESCE(v_worker_name, '');
                END IF;

                -- Se havia uma Baja anterior pendente com requires_replacement = true para o mesmo trabalhador,
                -- desativa o flag na Baja para que a vaga não seja contada em dobro em Contratação
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
                'pending',
                v_user_id
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
$function$;

GRANT EXECUTE ON FUNCTION core_operacoes.criar_solicitud_operativa_com_targets(jsonb) TO authenticated;

COMMIT;
