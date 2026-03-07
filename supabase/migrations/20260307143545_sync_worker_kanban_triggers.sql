-- SCRIPTS DE TRIGGERS PARA SINCRONIZAÇÃO AUTOMÁTICA DA SEGURIDADE SOCIAL

BEGIN;

-- 1. GATILHO: Quando o Admin muda o Worker para "Pendente Alta" / "Pendente Baixa" na tela de Trabalhadores
-- Isso vai criar automaticamente o Ticket (Card) no Kanban da Seguridade!
CREATE OR REPLACE FUNCTION core_personal.fn_worker_status_triggers_kanban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tipo_evento text;
BEGIN
    -- Se o status mudou para algo pendente
    IF NEW.status_seguridad IS DISTINCT FROM OLD.status_seguridad THEN
        IF NEW.status_seguridad ILIKE '%Pendente%Alta%' OR NEW.status_seguridad ILIKE '%Pendiente%Alta%' THEN
            v_tipo_evento := 'alta';
            
            -- Insere o card pendente se ele não existir em aberto
            IF NOT EXISTS (SELECT 1 FROM core_personal.seguridade_status WHERE worker_id = NEW.id AND status = 'pendente' AND tipo_evento = 'alta') THEN
                INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao)
                VALUES (NEW.id, NEW.empresa_id, 'Sistema', 'pendente', v_tipo_evento, NOW());
            END IF;
            
        ELSIF NEW.status_seguridad ILIKE '%Pendente%Baixa%' OR NEW.status_seguridad ILIKE '%Pendiente%Baja%' THEN
            v_tipo_evento := 'baixa';
            
            IF NOT EXISTS (SELECT 1 FROM core_personal.seguridade_status WHERE worker_id = NEW.id AND status = 'pendente' AND tipo_evento = 'baixa') THEN
                INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao)
                VALUES (NEW.id, NEW.empresa_id, 'Sistema', 'pendente', v_tipo_evento, NOW());
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_worker_status_triggers_kanban ON core_personal.workers;
CREATE TRIGGER trg_worker_status_triggers_kanban
    AFTER UPDATE OF status_seguridad ON core_personal.workers
    FOR EACH ROW
    EXECUTE FUNCTION core_personal.fn_worker_status_triggers_kanban();


-- 2. GATILHO: Quando o Admin move o Card para "Confirmados" no Kanban da Seguridade
-- Isso vai atualizar o Worker automaticamente para "Alta" ou "Baixa"!
CREATE OR REPLACE FUNCTION core_personal.fn_kanban_updates_worker_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se o card mudou para "confirmado"
    IF NEW.status = 'confirmado' AND OLD.status != 'confirmado' THEN
        IF NEW.tipo_evento = 'alta' THEN
            UPDATE core_personal.workers 
            SET status_seguridad = 'Alta', updated_at = NOW()
            WHERE id = NEW.worker_id AND (status_seguridad ILIKE '%Pendente%' OR status_seguridad IS NULL);
        ELSIF NEW.tipo_evento = 'baixa' THEN
            UPDATE core_personal.workers 
            SET status_seguridad = 'Baixa', status_trabajador = 'Inativo', updated_at = NOW()
            WHERE id = NEW.worker_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kanban_updates_worker_status ON core_personal.seguridade_status;
CREATE TRIGGER trg_kanban_updates_worker_status
    AFTER UPDATE OF status ON core_personal.seguridade_status
    FOR EACH ROW
    EXECUTE FUNCTION core_personal.fn_kanban_updates_worker_status();

COMMIT;
