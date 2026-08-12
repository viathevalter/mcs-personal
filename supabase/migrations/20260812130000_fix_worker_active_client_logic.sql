-- 1. Redefinir a função fn_get_active_client_for_worker para olhar ambas as tabelas (assignments e colaborador_por_pedido)
CREATE OR REPLACE FUNCTION core_personal.fn_get_active_client_for_worker(p_cod_colab text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_client_name text;
BEGIN
  WITH all_allocations AS (
    -- 1. Alocações novas (worker_assignments)
    SELECT 
      COALESCE(cl.trade_name, cl.legal_name, 'Cliente'::text) AS client_name,
      COALESCE(wa.start_date, wa.planned_start_date) AS start_date,
      wa.created_at AS inserted_at,
      CASE 
        WHEN wa.status IN ('active', 'planned', 'paused') 
             AND (wa.end_date IS NULL OR wa.end_date >= CURRENT_DATE) 
        THEN 1 
        ELSE 0 
      END AS is_active
    FROM core_personal.worker_assignments wa
    JOIN core_personal.workers w ON w.id = wa.worker_id
    LEFT JOIN core_common.clients cl ON cl.id = wa.client_id
    WHERE w.cod_colab = p_cod_colab

    UNION ALL

    -- 2. Alocações legadas (colaborador_por_pedido)
    SELECT 
      cpp.cliente_nombre AS client_name,
      cpp.fechainiciopedido::timestamp with time zone AS start_date,
      cpp.inserted_at AS inserted_at,
      CASE 
        WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= CURRENT_DATE 
        THEN 1 
        ELSE 0 
      END AS is_active
    FROM public.colaborador_por_pedido cpp
    WHERE cpp.cod_colab = p_cod_colab
  )
  SELECT client_name 
  INTO v_client_name
  FROM all_allocations
  ORDER BY 
    is_active DESC,
    start_date DESC NULLS LAST,
    inserted_at DESC
  LIMIT 1;

  RETURN v_client_name;
END;
$function$;

-- 2. Criar função para sincronizar campos ativos de um trabalhador no seu cadastro principal
CREATE OR REPLACE FUNCTION core_personal.fn_sync_worker_active_fields_by_cod(p_cod_colab text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_client text;
  v_active_contratante text;
  v_active_funcion text;
BEGIN
  WITH all_allocations AS (
    -- 1. Alocações novas
    SELECT 
      COALESCE(cl.trade_name, cl.legal_name, 'Cliente'::text) AS client_name,
      emp.nome AS contratante,
      wa.job_function_name_snapshot AS funcion,
      COALESCE(wa.start_date, wa.planned_start_date) AS start_date,
      wa.created_at AS inserted_at,
      CASE 
        WHEN wa.status IN ('active', 'planned', 'paused') 
             AND (wa.end_date IS NULL OR wa.end_date >= CURRENT_DATE) 
        THEN 1 
        ELSE 0 
      END AS is_active
    FROM core_personal.worker_assignments wa
    JOIN core_personal.workers w ON w.id = wa.worker_id
    LEFT JOIN core_common.clients cl ON cl.id = wa.client_id
    LEFT JOIN core_common.empresas emp ON emp.id = wa.empresa_id
    WHERE w.cod_colab = p_cod_colab

    UNION ALL

    -- 2. Alocações legadas
    SELECT 
      cpp.cliente_nombre AS client_name,
      cpp.contratante AS contratante,
      cpp.funcion AS funcion,
      cpp.fechainiciopedido::timestamp with time zone AS start_date,
      cpp.inserted_at AS inserted_at,
      CASE 
        WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= CURRENT_DATE 
        THEN 1 
        ELSE 0 
      END AS is_active
    FROM public.colaborador_por_pedido cpp
    WHERE cpp.cod_colab = p_cod_colab
  )
  SELECT client_name, contratante, funcion
  INTO v_active_client, v_active_contratante, v_active_funcion
  FROM all_allocations
  ORDER BY 
    is_active DESC,
    start_date DESC NULLS LAST,
    inserted_at DESC
  LIMIT 1;

  -- Atualizar core_personal.workers
  UPDATE core_personal.workers
  SET cliente = v_active_client,
      contratante = v_active_contratante,
      funcion = v_active_funcion
  WHERE cod_colab = p_cod_colab;
  
  -- Atualizar public.colaboradores (se existir)
  UPDATE public.colaboradores
  SET contratante = v_active_contratante,
      funcion = v_active_funcion
  WHERE cod_colab = p_cod_colab;
END;
$$;

-- 3. Criar função de gatilho para chamar a sincronização após modificações nas alocações
CREATE OR REPLACE FUNCTION core_personal.fn_worker_sync_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cod_colab text;
BEGIN
  IF TG_TABLE_NAME = 'worker_assignments' THEN
    SELECT cod_colab INTO v_cod_colab FROM core_personal.workers WHERE id = COALESCE(NEW.worker_id, OLD.worker_id);
  ELSE
    v_cod_colab := COALESCE(NEW.cod_colab, OLD.cod_colab);
  END IF;

  IF v_cod_colab IS NOT NULL THEN
    PERFORM core_personal.fn_sync_worker_active_fields_by_cod(v_cod_colab);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Criar os Triggers nas tabelas de alocações (novas e legadas)
DROP TRIGGER IF EXISTS trg_sync_worker_fields_from_assignment ON core_personal.worker_assignments;
CREATE TRIGGER trg_sync_worker_fields_from_assignment
AFTER INSERT OR UPDATE OF status, start_date, planned_start_date, end_date, client_id, empresa_id, job_function_name_snapshot OR DELETE
ON core_personal.worker_assignments
FOR EACH ROW
EXECUTE FUNCTION core_personal.fn_worker_sync_trigger_func();

DROP TRIGGER IF EXISTS trg_sync_worker_fields_from_cpp ON public.colaborador_por_pedido;
CREATE TRIGGER trg_sync_worker_fields_from_cpp
AFTER INSERT OR UPDATE OF cliente_nombre, contratante, funcion, fechainiciopedido, fechasalidatrabajador, fechafinpedido OR DELETE
ON public.colaborador_por_pedido
FOR EACH ROW
EXECUTE FUNCTION core_personal.fn_worker_sync_trigger_func();

-- 5. Executar sincronização inicial para todos os trabalhadores cadastrados
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT cod_colab FROM core_personal.workers WHERE cod_colab IS NOT NULL LOOP
    BEGIN
      PERFORM core_personal.fn_sync_worker_active_fields_by_cod(r.cod_colab);
    EXCEPTION WHEN OTHERS THEN
      -- Silencia erros em registros inválidos/órfãos
      NULL;
    END;
  END LOOP;
END;
$$;
