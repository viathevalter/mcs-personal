-- ==============================================================================
-- Migração - Correção da Função get_hours_control_workers e Sincronização de Perfis
-- ==============================================================================

-- 1. Recria a função get_hours_control_workers buscando a função do workers (w.funcion)
CREATE OR REPLACE FUNCTION core_personal.get_hours_control_workers(p_empresa_id uuid, p_period_year integer, p_period_month integer, p_contratante text DEFAULT NULL::text, p_cliente_nombre text DEFAULT NULL::text)
 RETURNS TABLE(total_count bigint, id uuid, empresa_id uuid, cod_colab text, nome text, email text, movil text, niss text, nif text, nie text, dni text, pasaporte text, status_seguridad text, status_trabajador text, contratante text, funcion text, cliente_nombre text, data_baixa date, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_start_date date := make_date(p_period_year, p_period_month, 1);
  v_end_date date := (v_start_date + interval '1 month' - interval '1 day')::date;
BEGIN
  RETURN QUERY
  WITH valid_allocations AS (
    SELECT DISTINCT ON (cpp.cod_colab)
      cpp.cod_colab,
      cpp.contratante,
      cpp.cliente_nombre
    FROM public.colaborador_por_pedido cpp
    WHERE 
      (cpp.fechainiciopedido IS NULL OR cpp.fechainiciopedido <= v_end_date)
      AND (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= v_start_date)
      AND (cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= v_start_date)
    ORDER BY cpp.cod_colab, 
             COALESCE(cpp.fechasalidatrabajador, cpp.fechafinpedido, v_end_date) DESC,
             cpp.inserted_at DESC
  ),
  base_workers AS (
    SELECT 
      w.id,
      w.empresa_id,
      w.cod_colab,
      w.nome,
      w.email,
      w.movil,
      w.niss,
      w.nif,
      w.nie,
      w.dni,
      w.pasaporte,
      w.status_seguridad,
      w.status_trabajador,
      COALESCE(va.contratante, c.contratante) AS contratante,
      COALESCE(w.funcion, c.funcion) AS funcion,
      COALESCE(va.cliente_nombre, public.fn_get_active_client_for_worker(w.cod_colab), 'NÃO DEFINIDO') AS cliente_nombre,
      w.data_baixa,
      w.created_at
    FROM core_personal.workers w
    LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
    LEFT JOIN valid_allocations va ON va.cod_colab = w.cod_colab
    WHERE w.empresa_id = p_empresa_id
      AND (
         (va.cod_colab IS NOT NULL) 
         OR 
         (w.status_trabajador ILIKE 'Ativo' OR w.status_trabajador ILIKE 'Activo')
         OR
         (w.status_trabajador ILIKE 'Inativo' AND w.data_baixa >= v_start_date)
         OR
         (w.status_trabajador ILIKE 'Desligado' AND w.data_baixa >= v_start_date)
      )
  ),
  filtered AS (
    SELECT bw.*
    FROM base_workers bw
    WHERE (p_contratante IS NULL OR p_contratante = '' OR bw.contratante = p_contratante)
      AND (p_cliente_nombre IS NULL OR p_cliente_nombre = '' OR bw.cliente_nombre ILIKE '%' || p_cliente_nombre || '%')
  ),
  total AS (
    SELECT COUNT(*) AS exact_count FROM filtered
  )
  SELECT 
    (SELECT exact_count FROM total) AS total_count,
    f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.cliente_nombre, f.data_baixa, f.created_at
  FROM filtered f
  ORDER BY f.nome ASC;
END;
$function$;

-- 2. Sincroniza todas as funções únicas do workers para a tabela core_comercial.job_functions
DO $$
DECLARE
    r RECORD;
    v_base_code varchar(50);
    v_code varchar(50);
    v_counter integer;
BEGIN
    FOR r IN 
        SELECT DISTINCT w.empresa_id, w.funcion
        FROM core_personal.workers w
        WHERE w.funcion IS NOT NULL AND w.funcion <> ''
    LOOP
        -- Se não existe função correspondente ativa com o mesmo nome na mesma empresa
        IF NOT EXISTS (
            SELECT 1 
            FROM core_comercial.job_functions jf 
            WHERE jf.empresa_id = r.empresa_id 
              AND jf.name = r.funcion 
              AND jf.status != 'archived'
        ) THEN
            -- Gera um código limpo a partir do nome
            v_base_code := UPPER(REGEXP_REPLACE(r.funcion, '[^a-zA-Z0-9]', '', 'g'));
            IF LENGTH(v_base_code) > 40 THEN
                v_base_code := SUBSTRING(v_base_code FROM 1 FOR 40);
            END IF;
            
            v_code := v_base_code;
            v_counter := 1;
            
            -- Trata colisão de códigos gerados
            WHILE EXISTS (
                SELECT 1 
                FROM core_comercial.job_functions jf 
                WHERE jf.empresa_id = r.empresa_id 
                  AND jf.code = v_code 
                  AND jf.status != 'archived'
            ) LOOP
                v_code := SUBSTRING(v_base_code FROM 1 FOR 35) || '_' || v_counter;
                v_counter := v_counter + 1;
            END LOOP;
            
            INSERT INTO core_comercial.job_functions (empresa_id, name, code, status)
            VALUES (r.empresa_id, r.funcion, v_code, 'active');
        END IF;
    END LOOP;
END $$;
