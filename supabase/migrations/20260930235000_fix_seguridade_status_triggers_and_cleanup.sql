-- Migration: 20260930235000_fix_seguridade_status_triggers_and_cleanup.sql
-- Description: Evitar re-disparo indevido de cards de alta/baixa na seguridade quando o status do trabalhador não mudou ou já foi confirmado anteriormente

CREATE OR REPLACE FUNCTION core_personal.fn_worker_status_triggers_kanban()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_operacoes', 'core_common'
AS $function$
DECLARE
    v_tipo_evento text;
    v_empresa_id uuid;
    v_last_event_tipo text;
BEGIN
    -- Só processar se houver mudança real no status_seguridad
    IF TG_OP = 'UPDATE' AND NEW.status_seguridad IS NOT DISTINCT FROM OLD.status_seguridad THEN
        RETURN NEW;
    END IF;

    -- Obter empresa_id de referência do trabalhador
    SELECT COALESCE(
        (SELECT empresa_id FROM core_personal.worker_assignments WHERE worker_id = NEW.id AND status != 'cancelled' ORDER BY COALESCE(start_date, planned_start_date) DESC LIMIT 1),
        (SELECT empresa_id FROM core_personal.contracts WHERE worker_id = NEW.id AND (status = 'active' OR terminated_at IS NULL) LIMIT 1),
        (SELECT id FROM core_common.empresas WHERE trade_name ILIKE NEW.contratante OR nome ILIKE NEW.contratante LIMIT 1),
        (SELECT id FROM core_common.empresas LIMIT 1)
    ) INTO v_empresa_id;

    -- Descobrir o último evento confirmado do trabalhador
    SELECT tipo_evento::text INTO v_last_event_tipo
    FROM core_personal.seguridade_status
    WHERE worker_id = NEW.id AND status = 'confirmado'
    ORDER BY COALESCE(data_efetiva, created_at) DESC, created_at DESC
    LIMIT 1;

    -- TRATAMENTO DE ALTA
    IF (NEW.status_seguridad ILIKE '%Pendente%Alta%' OR NEW.status_seguridad ILIKE '%Pendiente%Alta%')
       AND (NEW.status_trabajador IS NULL OR NEW.status_trabajador NOT ILIKE '%INATIVO%') THEN
        v_tipo_evento := 'alta';
        
        -- Só inserir se NÃO existir card pendente E o último evento confirmado não foi uma alta
        IF NOT EXISTS (
            SELECT 1 FROM core_personal.seguridade_status 
            WHERE worker_id = NEW.id AND status = 'pendente' AND tipo_evento::text = 'alta'
        ) AND (v_last_event_tipo IS NULL OR v_last_event_tipo != 'alta') THEN
            INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao)
            VALUES (NEW.id, v_empresa_id, 'Sistema', 'pendente', v_tipo_evento::core_personal.seguridade_tipo_evento, NOW());
        END IF;
        
    -- TRATAMENTO DE BAIXA
    ELSIF NEW.status_seguridad ILIKE '%Pendente%Baixa%' OR NEW.status_seguridad ILIKE '%Pendiente%Baja%' THEN
        v_tipo_evento := 'baixa';
        
        -- Só inserir se NÃO existir card pendente E o último evento confirmado NÃO for baixa!
        IF NOT EXISTS (
            SELECT 1 FROM core_personal.seguridade_status 
            WHERE worker_id = NEW.id AND status = 'pendente' AND tipo_evento::text = 'baixa'
        ) AND (v_last_event_tipo IS DISTINCT FROM 'baixa') THEN
            INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao)
            VALUES (NEW.id, v_empresa_id, 'Sistema', 'pendente', v_tipo_evento::core_personal.seguridade_tipo_evento, NOW());
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;
