-- =========================================================================
-- MIGRATION: FIX OBSOLETE AND BROKEN TRIGGERS
-- =========================================================================

-- 1. Drop obsolete sync/generator triggers on clients
DROP TRIGGER IF EXISTS trg_sync_client_vies_and_details ON core_common.clients;
DROP TRIGGER IF EXISTS trg_sync_client_vies_insert ON core_common.clients;
DROP TRIGGER IF EXISTS trg_generate_client_code ON core_common.clients;


-- 2. Redefine worker status trigger to resolve empresa_id dynamically
CREATE OR REPLACE FUNCTION core_personal.fn_worker_status_triggers_kanban()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_tipo_evento text;
    v_empresa_id uuid;
BEGIN
    -- Se o status mudou para algo pendente
    IF NEW.status_seguridad IS DISTINCT FROM OLD.status_seguridad THEN
        IF NEW.status_seguridad ILIKE '%Pendente%Alta%' OR NEW.status_seguridad ILIKE '%Pendiente%Alta%' THEN
            v_tipo_evento := 'alta';
            
            -- Resolve empresa_id dynamically from contracts or contractor mapping
            SELECT cnt.empresa_id INTO v_empresa_id
            FROM core_personal.contracts cnt
            WHERE cnt.worker_id = NEW.id
            ORDER BY cnt.created_at DESC
            LIMIT 1;

            IF v_empresa_id IS NULL AND NEW.contratante IS NOT NULL THEN
                SELECT id INTO v_empresa_id
                FROM core_common.empresas
                WHERE nome ILIKE NEW.contratante
                LIMIT 1;
            END IF;

            -- Insere o card pendente se ele não existir em aberto
            IF NOT EXISTS (SELECT 1 FROM core_personal.seguridade_status WHERE worker_id = NEW.id AND status = 'pendente' AND tipo_evento = 'alta'::core_personal.seguridade_tipo_evento) THEN
                INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao)
                VALUES (NEW.id, v_empresa_id, 'Sistema', 'pendente', v_tipo_evento::core_personal.seguridade_tipo_evento, NOW());
            END IF;
            
        ELSIF NEW.status_seguridad ILIKE '%Pendente%Baixa%' OR NEW.status_seguridad ILIKE '%Pendiente%Baja%' THEN
            v_tipo_evento := 'baixa';
            
            SELECT cnt.empresa_id INTO v_empresa_id
            FROM core_personal.contracts cnt
            WHERE cnt.worker_id = NEW.id
            ORDER BY cnt.created_at DESC
            LIMIT 1;

            IF v_empresa_id IS NULL AND NEW.contratante IS NOT NULL THEN
                SELECT id INTO v_empresa_id
                FROM core_common.empresas
                WHERE nome ILIKE NEW.contratante
                LIMIT 1;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM core_personal.seguridade_status WHERE worker_id = NEW.id AND status = 'pendente' AND tipo_evento = 'baixa'::core_personal.seguridade_tipo_evento) THEN
                INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao)
                VALUES (NEW.id, v_empresa_id, 'Sistema', 'pendente', v_tipo_evento::core_personal.seguridade_tipo_evento, NOW());
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;
