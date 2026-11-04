-- 1. Backfill commercial_owner_id and created_by from version 1 creator where missing
UPDATE core_comercial.estimaciones e
SET
  created_by = COALESCE(v.created_by, v.updated_by, e.created_by),
  commercial_owner_id = COALESCE(e.commercial_owner_id, v.created_by, v.updated_by)
FROM core_comercial.estimacion_versions v
WHERE v.estimacion_id = e.id
  AND v.version_number = 1
  AND (e.commercial_owner_id IS NULL OR e.created_by IS NULL);

-- 2. RPC para encerrar / expirar / reabrir estimación
CREATE OR REPLACE FUNCTION core_comercial.encerrar_estimacion(
  p_estimacion_id uuid,
  p_status text DEFAULT 'expired',
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_current_status text;
  v_has_order boolean;
BEGIN
  v_user_id := COALESCE(
    auth.uid(),
    (NULLIF(current_setting('request.jwt.claim.sub', true), ''))::uuid
  );

  IF p_status NOT IN ('expired', 'rejected', 'draft') THEN
    RAISE EXCEPTION 'Status inválido para alteração de orçamento: %', p_status;
  END IF;

  SELECT status INTO v_current_status
  FROM core_comercial.estimaciones
  WHERE id = p_estimacion_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Orçamento não encontrado.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM core_comercial.pedidos WHERE source_estimacion_id = p_estimacion_id
  ) INTO v_has_order;

  IF v_has_order AND p_status IN ('expired', 'rejected') THEN
    RAISE EXCEPTION 'Este orçamento já possui pedido operacional gerado e não pode ser encerrado diretamente.';
  END IF;

  UPDATE core_comercial.estimaciones
  SET
    status = p_status,
    review_decision_notes = COALESCE(NULLIF(p_reason, ''), review_decision_notes),
    updated_at = NOW(),
    updated_by = COALESCE(v_user_id, updated_by)
  WHERE id = p_estimacion_id;

  IF p_status IN ('expired', 'rejected') THEN
    UPDATE core_comercial.proposal_signatures
    SET status = 'expired',
        updated_at = NOW()
    WHERE estimacion_id = p_estimacion_id
      AND status = 'pending_signature';
  END IF;

  RETURN json_build_object(
    'status', 'success',
    'estimacion_id', p_estimacion_id,
    'new_status', p_status
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION core_comercial.encerrar_estimacion(uuid, text, text) TO authenticated, service_role;

-- 3. RPC para atribuir ou alterar comercial responsável da estimación
CREATE OR REPLACE FUNCTION core_comercial.atribuir_vendedor_estimacion(
  p_estimacion_id uuid,
  p_commercial_owner_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(
    auth.uid(),
    (NULLIF(current_setting('request.jwt.claim.sub', true), ''))::uuid
  );

  UPDATE core_comercial.estimaciones
  SET commercial_owner_id = p_commercial_owner_id,
      updated_at = NOW(),
      updated_by = COALESCE(v_user_id, updated_by)
  WHERE id = p_estimacion_id;

  UPDATE core_comercial.pedidos
  SET commercial_owner_id = p_commercial_owner_id,
      updated_at = NOW()
  WHERE source_estimacion_id = p_estimacion_id;

  RETURN json_build_object(
    'status', 'success',
    'estimacion_id', p_estimacion_id,
    'commercial_owner_id', p_commercial_owner_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION core_comercial.atribuir_vendedor_estimacion(uuid, uuid) TO authenticated, service_role;
