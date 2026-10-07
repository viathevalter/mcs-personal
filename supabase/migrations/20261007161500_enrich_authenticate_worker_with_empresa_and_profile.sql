-- Migration: 20261007161500_enrich_authenticate_worker_with_empresa_and_profile.sql
-- Description: Enrich authenticate_worker RPC to return empresa_nome, contratante, funcion, movil, niss, nif, nie, iban, etc.

DROP FUNCTION IF EXISTS public.authenticate_worker(text, text);

CREATE OR REPLACE FUNCTION public.authenticate_worker(
  p_nome text,
  p_pasaporte text
)
RETURNS TABLE (
  id uuid,
  cod_colab text,
  nome text,
  pasaporte text,
  status_trabajador text,
  empresa_id uuid,
  empresa_nome text,
  contratante text,
  funcion text,
  email text,
  telefono text,
  niss text,
  nif text,
  nie text,
  dni text,
  iban text,
  cliente text,
  data_ingresso date,
  data_baixa date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized_input_name text;
  v_normalized_input_passport text;
BEGIN
  -- Lowercase and remove non-alphanumeric characters from passport
  v_normalized_input_passport := lower(regexp_replace(p_pasaporte, '[^a-zA-Z0-9]', '', 'g'));
  v_normalized_input_name := lower(trim(p_nome));

  RETURN QUERY
  SELECT 
    w.id,
    w.cod_colab,
    w.nome,
    COALESCE(w.pasaporte, w.dni, w.nie, w.nif) AS pasaporte,
    w.status_trabajador,
    COALESCE(cnt.empresa_id, e_by_contratante.id, '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid) AS empresa_id,
    COALESCE(e.trade_name, e_by_contratante.trade_name, w.contratante, cnt.contratante, 'LUMINOUS') AS empresa_nome,
    COALESCE(w.contratante, cnt.contratante, e.trade_name, e_by_contratante.trade_name, 'LUMINOUS') AS contratante,
    COALESCE(w.funcion, 'Operário') AS funcion,
    COALESCE(w.email, '') AS email,
    COALESCE(w.movil, '') AS telefono,
    COALESCE(w.niss, '') AS niss,
    COALESCE(w.nif, '') AS nif,
    COALESCE(w.nie, '') AS nie,
    COALESCE(w.dni, '') AS dni,
    COALESCE(w.iban, '') AS iban,
    COALESCE(w.cliente, '') AS cliente,
    w.data_ingresso,
    w.data_baixa
  FROM core_personal.workers w
  LEFT JOIN LATERAL (
    SELECT c.empresa_id, c.contratante 
    FROM core_personal.contracts c 
    WHERE c.worker_id = w.id 
    ORDER BY c.created_at DESC 
    LIMIT 1
  ) cnt ON true
  LEFT JOIN core_common.empresas e ON e.id = cnt.empresa_id
  LEFT JOIN core_common.empresas e_by_contratante ON (
    UPPER(TRIM(e_by_contratante.trade_name)) = UPPER(TRIM(w.contratante))
    OR UPPER(TRIM(e_by_contratante.nome)) = UPPER(TRIM(w.contratante))
    OR UPPER(TRIM(e_by_contratante.codigo)) = UPPER(TRIM(w.contratante))
  )
  WHERE 
    (
      lower(regexp_replace(COALESCE(w.pasaporte, ''), '[^a-zA-Z0-9]', '', 'g')) = v_normalized_input_passport OR
      lower(regexp_replace(COALESCE(w.dni, ''), '[^a-zA-Z0-9]', '', 'g')) = v_normalized_input_passport OR
      lower(regexp_replace(COALESCE(w.nie, ''), '[^a-zA-Z0-9]', '', 'g')) = v_normalized_input_passport OR
      lower(regexp_replace(COALESCE(w.nif, ''), '[^a-zA-Z0-9]', '', 'g')) = v_normalized_input_passport
    )
    AND (
      lower(w.nome) ILIKE '%' || v_normalized_input_name || '%' OR
      v_normalized_input_name ILIKE '%' || lower(w.nome) || '%'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_worker(text, text) TO anon, authenticated, service_role;
