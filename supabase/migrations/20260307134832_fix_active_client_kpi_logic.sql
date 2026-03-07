-- SCRIPT DEFINITIVO DE CORREÇÃO (MASTER FIX)
-- 1. CORREÇÃO DA FUNÇÃO DE CLIENTE NO SCHEMA CORRETO (core_personal)
CREATE OR REPLACE FUNCTION core_personal.fn_get_active_client_for_worker(p_cod_colab text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT cpp.cliente_nombre 
  FROM public.colaborador_por_pedido cpp 
  WHERE cpp.cod_colab = p_cod_colab 
  ORDER BY 
    CASE WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= CURRENT_DATE THEN 0 ELSE 1 END,
    CASE WHEN cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= CURRENT_DATE THEN 0 ELSE 1 END,
    cpp.inserted_at DESC,
    cpp.fechainiciopedido DESC NULLS LAST
  LIMIT 1;
$function$;
