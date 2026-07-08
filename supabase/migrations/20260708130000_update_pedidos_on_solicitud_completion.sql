-- Migration: 20260708130000_update_pedidos_on_solicitud_completion.sql
-- Description: Update expected_start_date, expected_end_date, or status in core_comercial.pedidos when solicitudes of type order_postponement, order_extension, or order_termination are completed.

CREATE OR REPLACE FUNCTION core_operacoes.trigger_notificar_alteracao_data()
RETURNS TRIGGER AS $$
DECLARE
    v_dep_rh UUID;
    v_dep_doc UUID;
    v_dep_log UUID;
    v_dep_com UUID;
    
    v_msg TEXT;
    v_link VARCHAR;
BEGIN
    -- Obter IDs dos departamentos
    SELECT id INTO v_dep_rh FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'RH';
    SELECT id INTO v_dep_doc FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'DOCUMENTACION';
    SELECT id INTO v_dep_log FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'LOGISTICA';
    SELECT id INTO v_dep_com FROM core_common.departments WHERE empresa_id = NEW.empresa_id AND code = 'COMERCIAL';

    v_link := '/operacoes/pedidos/' || NEW.pedido_id;

    -- Se a solicitud é de adiamento de início e acabou de ser concluída
    IF NEW.tipo = 'order_postponement' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        v_msg := 'O Pedido ' || NEW.codigo || ' teve o início adiado pelo cliente. Novas datas operacionais foram aplicadas.';
        
        -- Atualizar a data de início do Pedido
        UPDATE core_comercial.pedidos
        SET expected_start_date = NEW.due_date::date, updated_at = NOW()
        WHERE id = NEW.pedido_id;
        
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_rh,  NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_doc, NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_log, NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_com, NULL, 'Início Adiado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'warning', v_link);
    
    -- Se a solicitud é de prorrogação e acabou de ser concluída
    ELSIF NEW.tipo = 'order_extension' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        v_msg := 'O Pedido ' || NEW.codigo || ' teve o prazo estendido. Novas datas operacionais foram aplicadas.';
        
        -- Atualizar a data de fim do Pedido
        UPDATE core_comercial.pedidos
        SET expected_end_date = NEW.due_date::date, updated_at = NOW()
        WHERE id = NEW.pedido_id;
        
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_rh,  NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_doc, NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_log, NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_com, NULL, 'Prazo Prorrogado - Pedido ' || NEW.codigo, v_msg, 'date_change', 'info', v_link);

    -- Se a solicitud é de finalização e acabou de ser concluída
    ELSIF NEW.tipo = 'order_termination' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        v_msg := 'O Pedido ' || NEW.codigo || ' foi finalizado/encerrado. As alocações foram concluídas.';
        
        -- Atualizar o status do Pedido
        UPDATE core_comercial.pedidos
        SET expected_end_date = COALESCE(NEW.due_date::date, expected_end_date),
            commercial_status = 'completed',
            operational_status = 'completed',
            updated_at = NOW()
        WHERE id = NEW.pedido_id;
        
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_rh,  NULL, 'Pedido Finalizado - ' || NEW.codigo, v_msg, 'status_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_doc, NULL, 'Pedido Finalizado - ' || NEW.codigo, v_msg, 'status_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_log, NULL, 'Pedido Finalizado - ' || NEW.codigo, v_msg, 'status_change', 'info', v_link);
        PERFORM core_common.create_notification(NEW.empresa_id, v_dep_com, NULL, 'Pedido Finalizado - ' || NEW.codigo, v_msg, 'status_change', 'info', v_link);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
