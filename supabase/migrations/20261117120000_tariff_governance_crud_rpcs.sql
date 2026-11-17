-- Migration: RPCs to sync or cancel Super Gaveta task when a pending tariff authorization request is edited or deleted
-- Date: 2026-11-17

CREATE OR REPLACE FUNCTION core_operacoes.atualizar_tarefa_termo_tarifa(
    p_task_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_mes_vigencia TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_task_id IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE core_operacoes.solicitud_tareas
    SET
        title = COALESCE(NULLIF(TRIM(p_title), ''), title),
        description = COALESCE(NULLIF(TRIM(p_description), ''), description),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('mes_vigencia', p_mes_vigencia),
        updated_at = NOW()
    WHERE id = p_task_id
      AND status IN ('pending', 'in_progress');

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION core_operacoes.atualizar_tarefa_termo_tarifa(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION core_operacoes.cancelar_tarefa_termo_tarifa(
    p_task_id UUID,
    p_reason TEXT DEFAULT 'Termo excluído pelo solicitante'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_task_id IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE core_operacoes.solicitud_tareas
    SET
        status = 'cancelled',
        resolution_notes = p_reason,
        updated_at = NOW()
    WHERE id = p_task_id
      AND status IN ('pending', 'in_progress');

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION core_operacoes.cancelar_tarefa_termo_tarifa(UUID, TEXT) TO authenticated, service_role;
