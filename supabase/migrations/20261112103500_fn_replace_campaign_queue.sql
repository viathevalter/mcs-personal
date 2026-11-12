-- Atomic server-side replacement of marketing_campaign_queue for a campaign
-- Avoids per-row RLS overhead and multi-chunk client race conditions when attaching 1,000+ leads

CREATE OR REPLACE FUNCTION public.fn_replace_campaign_queue(
  p_campaign_id uuid,
  p_lead_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'core_comercial', 'core_common'
AS $function$
DECLARE
  v_empresa_id uuid;
  v_inserted integer := 0;
BEGIN
  IF p_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Campanha inválida.';
  END IF;

  SELECT mc.empresa_id
    INTO v_empresa_id
    FROM core_comercial.marketing_campaigns mc
   WHERE mc.id = p_campaign_id;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Campanha não encontrada.';
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT (
       core_common.has_role(v_empresa_id, 'admin'::text)
       OR core_common.has_role(v_empresa_id, 'operador'::text)
     ) THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar a fila desta campanha.';
  END IF;

  DELETE FROM core_comercial.marketing_campaign_queue
   WHERE campaign_id = p_campaign_id;

  IF p_lead_ids IS NOT NULL AND COALESCE(array_length(p_lead_ids, 1), 0) > 0 THEN
    INSERT INTO core_comercial.marketing_campaign_queue (campaign_id, lead_id, status)
    SELECT p_campaign_id, u.lead_id, 'pending'
      FROM (SELECT DISTINCT unnest(p_lead_ids) AS lead_id) u
      JOIN core_comercial.leads l ON l.id = u.lead_id;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END IF;

  RETURN v_inserted;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_replace_campaign_queue(uuid, uuid[]) TO authenticated, service_role;
