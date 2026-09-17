-- ========================================================================================
-- Migration: 20260917083500_add_reabrir_analise_gerente.sql
-- Description: RPC allowing managers to reopen rejected estimations back to review status.
-- ========================================================================================

CREATE OR REPLACE FUNCTION core_comercial.reabrir_analise_gerente(
    p_estimacion_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' 
AS $$
DECLARE
    v_user_id UUID;
    v_empresa_id UUID;
    v_status_check TEXT;
BEGIN
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;

    SELECT status, empresa_id INTO v_status_check, v_empresa_id
    FROM core_comercial.estimaciones
    WHERE id = p_estimacion_id;

    IF v_status_check IS NULL THEN
        RAISE EXCEPTION 'Estimación não encontrada.';
    END IF;

    IF NOT (
        core_common.has_role(v_empresa_id, 'super_admin') OR 
        core_common.has_role(v_empresa_id, 'admin')
    ) THEN
        RAISE EXCEPTION 'Apenas gerentes e administradores podem reabrir orçamentos para análise.';
    END IF;

    UPDATE core_comercial.estimaciones
    SET 
        status = 'review',
        is_approved_by_manager = FALSE,
        review_requested_at = NOW(),
        review_decision_notes = COALESCE(p_notes, review_decision_notes),
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = p_estimacion_id;

    RETURN json_build_object(
        'status', 'success',
        'estimacion_id', p_estimacion_id,
        'new_status', 'review'
    );
END;
$$;

REVOKE ALL ON FUNCTION core_comercial.reabrir_analise_gerente(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core_comercial.reabrir_analise_gerente(UUID, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
