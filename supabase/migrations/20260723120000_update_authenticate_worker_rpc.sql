-- Update authenticate_worker RPC to return data_ingresso and data_baixa
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
    cnt.empresa_id,
    w.data_ingresso,
    w.data_baixa
  FROM core_personal.workers w
  LEFT JOIN core_personal.contracts cnt ON cnt.worker_id = w.id
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
