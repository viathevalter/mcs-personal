


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "core_common";


ALTER SCHEMA "core_common" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "core_personal";


ALTER SCHEMA "core_personal" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "core_personal"."categoria_evento_holerite" AS ENUM (
    'salario_base',
    'auxilio_alojamento',
    'outros_acrescimos',
    'imposto_ss',
    'adiantamento',
    'desconto_carro',
    'multa_transito',
    'combustivel',
    'pedagios',
    'suministros',
    'multa_alojamento',
    'limpeza_danos',
    'epis',
    'taxa_bancaria',
    'outros_descontos',
    'total_horas'
);


ALTER TYPE "core_personal"."categoria_evento_holerite" OWNER TO "postgres";


CREATE TYPE "core_personal"."discount_category" AS ENUM (
    'Imposto ss',
    'Adiantamento',
    'Desconto Carro',
    'MULTA TRANSITO',
    'COMBUSTIBLE',
    'PEAJES',
    'SUMINISTROS',
    'MULTA ALOJAMIENTO',
    'LIMPIEZA O DAÑOS',
    'EPIS',
    'OUTROS',
    'Taxa bancária'
);


ALTER TYPE "core_personal"."discount_category" OWNER TO "postgres";


CREATE TYPE "core_personal"."holerite_status" AS ENUM (
    'rascunho',
    'fechado',
    'pago'
);


ALTER TYPE "core_personal"."holerite_status" OWNER TO "postgres";


CREATE TYPE "core_personal"."seguridade_status_workflow" AS ENUM (
    'pendente',
    'confirmado',
    'erro',
    'cancelado'
);


ALTER TYPE "core_personal"."seguridade_status_workflow" OWNER TO "postgres";


CREATE TYPE "core_personal"."seguridade_tipo_evento" AS ENUM (
    'alta',
    'baixa'
);


ALTER TYPE "core_personal"."seguridade_tipo_evento" OWNER TO "postgres";


CREATE TYPE "core_personal"."tipo_evento_holerite" AS ENUM (
    'provento',
    'desconto'
);


ALTER TYPE "core_personal"."tipo_evento_holerite" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'super_admin',
    'admin_rh',
    'operador',
    'visualizador'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."tax_category" AS ENUM (
    'SS_TRABALHADOR',
    'SS_EMPRESA',
    'IRS_DEFAULT',
    'SUBSIDIO_ALIMENTACAO_LIMITE_DINHEIRO',
    'SUBSIDIO_ALIMENTACAO_LIMITE_CARTAO',
    'FCT',
    'AJUDAS_CUSTO_LIMITE',
    'KMS_LIMITE',
    'OUTROS'
);


ALTER TYPE "public"."tax_category" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_common"."has_role"("p_empresa_id" "uuid", "p_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'core_common', 'public'
    AS $$
begin
  return exists (
    select 1
    from core_common.user_memberships
    where user_id = auth.uid()
      and empresa_id = p_empresa_id
      and role = p_role
      and is_active = true
  );
end;
$$;


ALTER FUNCTION "core_common"."has_role"("p_empresa_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_common"."is_admin_of_empresa"("check_empresa_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'core_common'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM core_common.user_memberships 
    WHERE user_id = auth.uid() 
      AND empresa_id = check_empresa_id 
      AND role = 'admin'
      AND is_active = true
  );
$$;


ALTER FUNCTION "core_common"."is_admin_of_empresa"("check_empresa_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_common"."is_member"("p_empresa_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'core_common', 'public'
    AS $$
begin
  return exists (
    select 1
    from core_common.user_memberships
    where user_id = auth.uid()
      and empresa_id = p_empresa_id
      and is_active = true
  );
end;
$$;


ALTER FUNCTION "core_common"."is_member"("p_empresa_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."fn_get_active_client_for_worker"("p_cod_colab" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT cpp.cliente_nombre 
  FROM public.colaborador_por_pedido cpp 
  WHERE cpp.cod_colab = p_cod_colab 
  ORDER BY 
    CASE WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= CURRENT_DATE THEN 0 ELSE 1 END,
    CASE WHEN cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= CURRENT_DATE THEN 0 ELSE 1 END,
    cpp.inserted_at DESC,
    cpp.fechainiciopedido DESC NULLS LAST
  LIMIT 1;
$$;


ALTER FUNCTION "core_personal"."fn_get_active_client_for_worker"("p_cod_colab" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."fn_get_active_client_for_worker_json"("p_cod_colab" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT jsonb_build_object(
    'cod_cliente', COALESCE(c.cod_cliente, cpp.codcliente),
    'cliente_nombre', COALESCE(c.nombre_comercial, cpp.cliente_nombre),
    'empresa_nome', COALESCE(e.nome_pbi, cpp.contratante)
  )
  FROM public.colaborador_por_pedido cpp 
  LEFT JOIN public.clientes c ON c.id = cpp.idcliente 
  LEFT JOIN public.empresas e ON e.sp_id = cpp.idempresa
  WHERE cpp.cod_colab = p_cod_colab 
  ORDER BY 
    CASE WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= CURRENT_DATE THEN 0 ELSE 1 END,
    CASE WHEN cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= CURRENT_DATE THEN 0 ELSE 1 END,
    cpp.inserted_at DESC,
    cpp.fechainiciopedido DESC NULLS LAST
  LIMIT 1;
$$;


ALTER FUNCTION "core_personal"."fn_get_active_client_for_worker_json"("p_cod_colab" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."fn_import_ibans_batch"("payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    item jsonb;
    v_worker_id uuid;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        -- Find the worker_id matching the cod_colab
        SELECT id INTO v_worker_id 
        FROM core_personal.workers 
        WHERE cod_colab = item->>'cod_colab';
        
        IF v_worker_id IS NOT NULL THEN
            -- Check if IBAN doesn't already exist for this worker
            IF NOT EXISTS (
                SELECT 1 FROM core_personal.worker_ibans 
                WHERE iban = item->>'iban'
            ) THEN
                INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                VALUES (
                    v_worker_id, 
                    item->>'banco', 
                    item->>'iban', 
                    'ATIVO', 
                    item->>'observacoes'
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION "core_personal"."fn_import_ibans_batch"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."fn_kanban_updates_worker_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
   v_old_status_seguridad text;
   v_old_status_trabajador text;
BEGIN
    -- Se o card mudou para "confirmado"
    IF NEW.status = 'confirmado' AND OLD.status != 'confirmado' THEN
        SELECT status_seguridad, status_trabajador INTO v_old_status_seguridad, v_old_status_trabajador
        FROM core_personal.workers WHERE id = NEW.worker_id;

        IF NEW.tipo_evento = 'alta' THEN
            IF v_old_status_seguridad ILIKE '%Pendente%' OR v_old_status_seguridad IS NULL THEN
                UPDATE core_personal.workers 
                SET status_seguridad = 'Alta'
                WHERE id = NEW.worker_id;

                INSERT INTO core_personal.worker_status_history (
                    worker_id, change_type, old_value, new_value, effective_date, comments, changed_by
                ) VALUES (
                    NEW.worker_id, 'SEGURIDADE', COALESCE(v_old_status_seguridad, 'Sem Status'), 'Alta', CURRENT_DATE, NEW.observacoes, auth.uid()
                );
            END IF;
        ELSIF NEW.tipo_evento = 'baixa' THEN
            UPDATE core_personal.workers 
            SET status_seguridad = 'Baixa', status_trabajador = 'INATIVO'
            WHERE id = NEW.worker_id;

            IF v_old_status_seguridad IS DISTINCT FROM 'Baixa' THEN
                INSERT INTO core_personal.worker_status_history (
                    worker_id, change_type, old_value, new_value, effective_date, comments, changed_by
                ) VALUES (
                    NEW.worker_id, 'SEGURIDADE', COALESCE(v_old_status_seguridad, 'Sem Status'), 'Baixa', CURRENT_DATE, NEW.observacoes, auth.uid()
                );
            END IF;

            IF v_old_status_trabajador IS NULL OR v_old_status_trabajador NOT ILIKE 'INATIVO' THEN
                INSERT INTO core_personal.worker_status_history (
                    worker_id, change_type, old_value, new_value, effective_date, comments, changed_by
                ) VALUES (
                    NEW.worker_id, 'TRABALHADOR', COALESCE(v_old_status_trabajador, 'Sem Status'), 'INATIVO', CURRENT_DATE, 'Reflexo Automático da Baixa Kanban', auth.uid()
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "core_personal"."fn_kanban_updates_worker_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."fn_worker_status_triggers_kanban"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tipo_evento text;
BEGIN
    -- Se o status mudou para algo pendente
    IF NEW.status_seguridad IS DISTINCT FROM OLD.status_seguridad THEN
        IF NEW.status_seguridad ILIKE '%Pendente%Alta%' OR NEW.status_seguridad ILIKE '%Pendiente%Alta%' THEN
            v_tipo_evento := 'alta';
            
            -- Insere o card pendente se ele não existir em aberto
            IF NOT EXISTS (SELECT 1 FROM core_personal.seguridade_status WHERE worker_id = NEW.id AND status = 'pendente' AND tipo_evento = 'alta'::core_personal.seguridade_tipo_evento) THEN
                INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao)
                VALUES (NEW.id, NEW.empresa_id, 'Sistema', 'pendente', v_tipo_evento::core_personal.seguridade_tipo_evento, NOW());
            END IF;
            
        ELSIF NEW.status_seguridad ILIKE '%Pendente%Baixa%' OR NEW.status_seguridad ILIKE '%Pendiente%Baja%' THEN
            v_tipo_evento := 'baixa';
            
            IF NOT EXISTS (SELECT 1 FROM core_personal.seguridade_status WHERE worker_id = NEW.id AND status = 'pendente' AND tipo_evento = 'baixa'::core_personal.seguridade_tipo_evento) THEN
                INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao)
                VALUES (NEW.id, NEW.empresa_id, 'Sistema', 'pendente', v_tipo_evento::core_personal.seguridade_tipo_evento, NOW());
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "core_personal"."fn_worker_status_triggers_kanban"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."get_client_worker_kpis"("p_empresa_id" "uuid", "p_cliente_nombre" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total int;
  v_ativos int;
  v_pendentes_alta int;
  v_inativos int;
BEGIN
  IF p_cliente_nombre IS NULL OR p_cliente_nombre = '' THEN
    SELECT 
      COUNT(w.id),
      COUNT(w.id) FILTER (WHERE w.status_seguridad ILIKE '%alta%' AND w.status_seguridad NOT ILIKE '%pendiente%'),
      COUNT(w.id) FILTER (WHERE w.status_seguridad ILIKE '%pendiente alta%'),
      COUNT(w.id) FILTER (WHERE w.status_seguridad ILIKE '%baja%' AND w.status_seguridad NOT ILIKE '%pendiente%')
    INTO v_total, v_ativos, v_pendentes_alta, v_inativos
    FROM core_personal.workers w
    WHERE w.empresa_id = p_empresa_id;
  ELSE
    SELECT 
      COUNT(DISTINCT w.id),
      COUNT(DISTINCT w.id) FILTER (WHERE w.status_seguridad ILIKE '%alta%' AND w.status_seguridad NOT ILIKE '%pendiente%'),
      COUNT(DISTINCT w.id) FILTER (WHERE w.status_seguridad ILIKE '%pendiente alta%'),
      COUNT(DISTINCT w.id) FILTER (WHERE w.status_seguridad ILIKE '%baja%' AND w.status_seguridad NOT ILIKE '%pendiente%')
    INTO v_total, v_ativos, v_pendentes_alta, v_inativos
    FROM core_personal.workers w
    JOIN public.colaborador_por_pedido cpp ON w.cod_colab = cpp.cod_colab
    WHERE w.empresa_id = p_empresa_id AND cpp.cliente_nombre = p_cliente_nombre;
  END IF;

  RETURN json_build_object(
    'total', COALESCE(v_total, 0),
    'ativos', COALESCE(v_ativos, 0),
    'pendentes_alta', COALESCE(v_pendentes_alta, 0),
    'inativos', COALESCE(v_inativos, 0)
  );
END;
$$;


ALTER FUNCTION "core_personal"."get_client_worker_kpis"("p_empresa_id" "uuid", "p_cliente_nombre" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."get_client_worker_kpis"("p_empresa_id" "uuid", "p_search" "text" DEFAULT NULL::"text", "p_cliente_nombre" "text"[] DEFAULT NULL::"text"[], "p_contratante" "text" DEFAULT NULL::"text", "p_funcion" "text" DEFAULT NULL::"text") RETURNS TABLE("ativos" bigint, "inativos" bigint, "pendentes_ingreso" bigint, "seguridade_alta" bigint, "seguridade_pendente_alta" bigint, "seguridade_em_regularizacao" bigint, "seguridade_baixa" bigint, "seguridade_pendente_baixa" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH worker_active_clients AS (
        SELECT 
            w.id,
            w.status_trabajador,
            w.status_seguridad,
            w.nome,
            w.cod_colab,
            w.dni,
            w.pasaporte,
            w.niss,
            w.nie,
            c.contratante,
            c.funcion,
            core_personal.fn_get_active_client_for_worker(w.cod_colab) as active_client
        FROM core_personal.workers w
        LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
        WHERE w.empresa_id = p_empresa_id
          AND (p_search IS NULL OR p_search = '' OR w.nome ILIKE '%' || p_search || '%' OR w.cod_colab ILIKE '%' || p_search || '%' OR w.dni ILIKE '%' || p_search || '%' OR w.pasaporte ILIKE '%' || p_search || '%' OR w.niss ILIKE '%' || p_search || '%' OR w.nie ILIKE '%' || p_search || '%')
          AND (p_contratante IS NULL OR p_contratante = '' OR c.contratante = p_contratante)
          AND (p_funcion IS NULL OR p_funcion = '' OR c.funcion = p_funcion)
    ),
    filtered_kpis AS (
        SELECT *
        FROM worker_active_clients wk
        WHERE (p_cliente_nombre IS NULL OR array_length(p_cliente_nombre, 1) IS NULL OR wk.active_client = ANY(p_cliente_nombre))
    )
    SELECT 
        -- Status do Trabalhador
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Activo' OR wk.status_trabajador ILIKE 'Ativo') AS ativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Inactivo' OR wk.status_trabajador ILIKE 'Inativo') AS inativos,
        COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE '%Pendente%') AS pendentes_ingreso,
        
        -- Status de Seguridade
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Alta' OR wk.status_seguridad ILIKE 'Alta Confirmada') AS seguridade_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendiente Alta' OR wk.status_seguridad ILIKE 'Pendente Alta') AS seguridade_pendente_alta,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Em Regularização' OR wk.status_seguridad ILIKE 'En Regularización') AS seguridade_em_regularizacao,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Baja' OR wk.status_seguridad ILIKE 'Baixa' OR wk.status_seguridad ILIKE 'Anulado') AS seguridade_baixa,
        COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendiente Baja' OR wk.status_seguridad ILIKE 'Pendente Baixa') AS seguridade_pendente_baixa

    FROM filtered_kpis wk;
END;
$$;


ALTER FUNCTION "core_personal"."get_client_worker_kpis"("p_empresa_id" "uuid", "p_search" "text", "p_cliente_nombre" "text"[], "p_contratante" "text", "p_funcion" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."get_global_movement_history"() RETURNS TABLE("id" "uuid", "worker_id" "uuid", "change_type" character varying, "old_value" character varying, "new_value" character varying, "effective_date" "date", "comments" "text", "changed_by" "uuid", "created_at" timestamp with time zone, "worker_nome" "text", "worker_cod_colab" "text", "changed_by_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.worker_id,
    h.change_type,
    h.old_value,
    h.new_value,
    h.effective_date,
    h.comments,
    h.changed_by,
    h.created_at,
    w.nome AS worker_nome,
    w.cod_colab AS worker_cod_colab,
    COALESCE(
       (u.raw_user_meta_data->>'full_name')::text, 
       u.email::text, 
       'Sistema'
    ) AS changed_by_name
  FROM core_personal.worker_status_history h
  LEFT JOIN core_personal.workers w ON w.id = h.worker_id
  LEFT JOIN auth.users u ON u.id = h.changed_by
  ORDER BY h.created_at DESC
  LIMIT 200;
END;
$$;


ALTER FUNCTION "core_personal"."get_global_movement_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."get_global_movement_history"("p_empresa_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_nome" "text" DEFAULT NULL::"text", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("id" "uuid", "worker_id" "uuid", "change_type" character varying, "old_value" character varying, "new_value" character varying, "effective_date" "date", "comments" "text", "changed_by" "uuid", "created_at" timestamp with time zone, "worker_nome" "text", "worker_cod_colab" "text", "changed_by_name" "text", "empresa_nome" "text", "cliente_nome" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH movement_data AS (
    SELECT 
      h.id,
      h.worker_id,
      h.change_type,
      h.old_value,
      h.new_value,
      h.effective_date,
      h.comments,
      h.changed_by,
      h.created_at,
      w.nome AS worker_nome,
      w.cod_colab AS worker_cod_colab,
      w.empresa_id,
      COALESCE(
         (u.raw_user_meta_data->>'full_name')::text, 
         u.email::text, 
         'Sistema'
      ) AS changed_by_name,
      e.nome AS empresa_nome,
      COALESCE(
        public.fn_get_active_client_for_worker(w.cod_colab),
        (
          SELECT cpp.cliente_nombre 
          FROM public.colaborador_por_pedido cpp
          WHERE cpp.cod_colab = w.cod_colab 
          ORDER BY COALESCE(cpp.fechasalidatrabajador, cpp.fechafinpedido, cpp.fechainiciopedido) DESC NULLS LAST 
          LIMIT 1
        ),
        'Não Alocado'
      ) AS cliente_nome
    FROM core_personal.worker_status_history h
    LEFT JOIN core_personal.workers w ON w.id = h.worker_id
    LEFT JOIN core_common.empresas e ON e.id = w.empresa_id
    LEFT JOIN auth.users u ON u.id = h.changed_by
    WHERE 
      (p_start_date IS NULL OR h.created_at >= p_start_date::timestamp) AND
      (p_end_date IS NULL OR h.created_at <= (p_end_date + interval '1 day')::timestamp)
  )
  SELECT 
    md.id,
    md.worker_id,
    md.change_type,
    md.old_value,
    md.new_value,
    md.effective_date,
    md.comments,
    md.changed_by,
    md.created_at,
    md.worker_nome,
    md.worker_cod_colab,
    md.changed_by_name,
    md.empresa_nome,
    md.cliente_nome
  FROM movement_data md
  WHERE 
    (p_empresa_id IS NULL OR md.empresa_id = p_empresa_id) AND
    (p_cliente_nome IS NULL OR p_cliente_nome = 'all' OR md.cliente_nome ILIKE '%' || p_cliente_nome || '%')
  ORDER BY md.created_at DESC
  LIMIT 500;
END;
$$;


ALTER FUNCTION "core_personal"."get_global_movement_history"("p_empresa_id" "uuid", "p_cliente_nome" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."get_hours_control_workers"("p_empresa_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_contratante" "text" DEFAULT NULL::"text", "p_cliente_nombre" "text" DEFAULT NULL::"text") RETURNS TABLE("total_count" bigint, "id" "uuid", "empresa_id" "uuid", "cod_colab" "text", "nome" "text", "email" "text", "movil" "text", "niss" "text", "nif" "text", "nie" "text", "dni" "text", "pasaporte" "text", "status_seguridad" "text", "status_trabajador" "text", "contratante" "text", "funcion" "text", "cliente_nombre" "text", "data_baixa" "date", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
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
      c.funcion,
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
$$;


ALTER FUNCTION "core_personal"."get_hours_control_workers"("p_empresa_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_contratante" "text", "p_cliente_nombre" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."get_real_seguridade_status"("p_empresa_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(
      json_build_object(
        'id', ss.id,
        'empresa_id', ss.empresa_id,
        'worker_id', w.id,
        'tipo_evento', ss.tipo_evento,
        'status', ss.status,
        'origem', ss.origem,
        'origem_cliente_nome', COALESCE(ss.origem_cliente_nome, (
            SELECT cliente_nombre 
            FROM public.colaborador_por_pedido cpp 
            WHERE cpp.cod_colab = w.cod_colab 
            ORDER BY id DESC 
            LIMIT 1
        )),
        'data_solicitacao', ss.data_solicitacao,
        'data_efetiva', ss.data_efetiva,
        'observacoes', ss.observacoes,
        'autor_inativacao', (
            SELECT COALESCE(u.display_name, u.email)
            FROM core_personal.worker_status_history h
            LEFT JOIN public.mcs_users u ON u.id = h.changed_by
            WHERE h.worker_id = w.id 
              AND h.change_type = 'TRABALHADOR'
            ORDER BY h.created_at DESC 
            LIMIT 1
        ),
        'hist_observacoes', (
            SELECT h.comments
            FROM core_personal.worker_status_history h
            WHERE h.worker_id = w.id 
              AND h.change_type = 'TRABALHADOR'
            ORDER BY h.created_at DESC 
            LIMIT 1
        ),
        'hist_data_efetiva', (
            SELECT h.effective_date
            FROM core_personal.worker_status_history h
            WHERE h.worker_id = w.id 
              AND h.change_type = 'TRABALHADOR'
            ORDER BY h.created_at DESC 
            LIMIT 1
        ),
        'worker', json_build_object(
          'id', w.id,
          'nome', w.nome,
          'cod_colab', w.cod_colab,
          'niss', w.niss,
          'nif', w.nif,
          'dni', w.dni,
          'nie', w.nie,
          'pasaporte', w.pasaporte,
          'fecha_nacimiento', w.fecha_nacimiento,
          'funcion', (SELECT c.funcion FROM public.colaboradores c WHERE c.cod_colab = w.cod_colab LIMIT 1),
          'empresa_nome', (SELECT e.nome FROM core_common.empresas e WHERE e.id = w.empresa_id LIMIT 1)
        )
      ) ORDER BY ss.created_at DESC
    )
    FROM core_personal.seguridade_status ss
    JOIN core_personal.workers w ON ss.worker_id = w.id
    WHERE ss.empresa_id = p_empresa_id
      AND (
         ss.status IN ('pendente', 'erro', 'cancelado') OR
         (ss.status = 'confirmado' AND (ss.updated_at > now() - interval '60 days' OR ss.created_at > now() - interval '60 days'))
      )
  ), '[]');
END;
$$;


ALTER FUNCTION "core_personal"."get_real_seguridade_status"("p_empresa_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."search_workers"("p_empresa_id" "uuid", "p_search" "text" DEFAULT NULL::"text", "p_cliente_nombre" "text"[] DEFAULT NULL::"text"[], "p_status_trabajador_filter" "text"[] DEFAULT NULL::"text"[], "p_status_seguridad_filter" "text"[] DEFAULT NULL::"text"[], "p_contratante" "text" DEFAULT NULL::"text", "p_funcion" "text" DEFAULT NULL::"text", "p_sort_column" "text" DEFAULT 'nome'::"text", "p_sort_direction" "text" DEFAULT 'asc'::"text", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 10) RETURNS TABLE("total_count" bigint, "id" "uuid", "empresa_id" "uuid", "cod_colab" "text", "nome" "text", "email" "text", "movil" "text", "niss" "text", "nif" "text", "nie" "text", "dni" "text", "pasaporte" "text", "status_seguridad" "text", "status_trabajador" "text", "contratante" "text", "funcion" "text", "cliente_nombre" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_offset int := (p_page - 1) * p_page_size;
BEGIN
  RETURN QUERY
  WITH base_workers AS (
    SELECT w.*, c.contratante, c.funcion,
      public.fn_get_active_client_for_worker(w.cod_colab) as active_client_nombre
    FROM core_personal.workers w
    LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
    WHERE w.empresa_id = p_empresa_id
      AND (p_search IS NULL OR p_search = '' OR w.nome ILIKE '%' || p_search || '%' OR w.cod_colab ILIKE '%' || p_search || '%' OR w.dni ILIKE '%' || p_search || '%' OR w.pasaporte ILIKE '%' || p_search || '%' OR w.niss ILIKE '%' || p_search || '%' OR w.nie ILIKE '%' || p_search || '%')
      AND (p_contratante IS NULL OR p_contratante = '' OR c.contratante = p_contratante)
      AND (p_funcion IS NULL OR p_funcion = '' OR c.funcion = p_funcion)
      AND (p_status_trabajador_filter IS NULL OR array_length(p_status_trabajador_filter, 1) IS NULL OR (
        EXISTS (
          SELECT 1 FROM unnest(p_status_trabajador_filter) AS sf
          WHERE (sf = 'ativos' AND (w.status_trabajador ILIKE 'Ativo' OR w.status_trabajador ILIKE 'Activo')) OR
                (sf = 'inativos' AND (w.status_trabajador ILIKE 'Inativo' OR w.status_trabajador ILIKE 'Inactivo')) OR
                (sf = 'pendientes_ingreso' AND (w.status_trabajador ILIKE 'Pendente Ingresso' OR w.status_trabajador ILIKE 'Pendiente Ingresar'))
        )
      ))
      AND (p_status_seguridad_filter IS NULL OR array_length(p_status_seguridad_filter, 1) IS NULL OR (
        EXISTS (
          SELECT 1 FROM unnest(p_status_seguridad_filter) AS sf
          WHERE (sf = 'alta' AND w.status_seguridad ILIKE 'Alta') OR
                (sf = 'pendentes_alta' AND (w.status_seguridad ILIKE 'Pendente Alta' OR w.status_seguridad ILIKE 'Pendiente Alta')) OR
                (sf = 'baixa' AND (w.status_seguridad ILIKE 'Baixa' OR w.status_seguridad ILIKE 'Baja' OR w.status_seguridad ILIKE 'Anulado')) OR
                (sf = 'pendentes_baixa' AND (w.status_seguridad ILIKE 'Pendente Baixa' OR w.status_seguridad ILIKE 'Pendiente Baja'))
        )
      ))
  ),
  filtered AS (
    SELECT *
    FROM base_workers bw
    WHERE (p_cliente_nombre IS NULL OR array_length(p_cliente_nombre, 1) IS NULL OR bw.active_client_nombre = ANY(p_cliente_nombre))
  ),
  total AS (
    SELECT COUNT(*) AS exact_count FROM filtered
  )
  SELECT 
    (SELECT exact_count FROM total) AS total_count,
    f.id, f.empresa_id, f.cod_colab, f.nome, f.email, f.movil, f.niss, f.nif, f.nie, f.dni, f.pasaporte, f.status_seguridad, f.status_trabajador, f.contratante, f.funcion, f.active_client_nombre as cliente_nombre, f.created_at
  FROM filtered f
  ORDER BY 
    CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'asc' THEN f.nome END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'nome' AND p_sort_direction = 'desc' THEN f.nome END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'asc' THEN f.cod_colab END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'cod_colab' AND p_sort_direction = 'desc' THEN f.cod_colab END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'asc' THEN f.contratante END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'contratante' AND p_sort_direction = 'desc' THEN f.contratante END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'asc' THEN f.funcion END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'funcion' AND p_sort_direction = 'desc' THEN f.funcion END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'asc' THEN f.active_client_nombre END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'cliente_nombre' AND p_sort_direction = 'desc' THEN f.active_client_nombre END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'asc' THEN f.status_trabajador END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'status_trabajador' AND p_sort_direction = 'desc' THEN f.status_trabajador END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'status_seguridad' AND p_sort_direction = 'asc' THEN f.status_seguridad END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'status_seguridad' AND p_sort_direction = 'desc' THEN f.status_seguridad END DESC NULLS LAST,
    f.nome ASC -- Fallback tiebreaker
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;


ALTER FUNCTION "core_personal"."search_workers"("p_empresa_id" "uuid", "p_search" "text", "p_cliente_nombre" "text"[], "p_status_trabajador_filter" "text"[], "p_status_seguridad_filter" "text"[], "p_contratante" "text", "p_funcion" "text", "p_sort_column" "text", "p_sort_direction" "text", "p_page" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "core_personal"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "core_personal"."update_seguridade_status_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "core_personal"."update_seguridade_status_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_licencia_conducir_trigger_fn"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if the value is not null and looks like the SharePoint JSON payload
  IF NEW.licencia_conducir IS NOT NULL AND NEW.licencia_conducir LIKE '{%odata.type%' THEN
    BEGIN
      -- Try to parse as JSON and extract the "Value"
      NEW.licencia_conducir := (NEW.licencia_conducir::json)->>'Value';
    EXCEPTION WHEN OTHERS THEN
      -- If parsing fails, just keep the original value (silently ignore the error)
      -- This acts as a safe fallback.
    END;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."clean_licencia_conducir_trigger_fn"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_active_client_for_worker"("p_cod_colab" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT cpp.cliente_nombre 
  FROM public.colaborador_por_pedido cpp 
  WHERE cpp.cod_colab = p_cod_colab 
  ORDER BY 
    CASE WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= CURRENT_DATE THEN 0 ELSE 1 END,
    CASE WHEN cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= CURRENT_DATE THEN 0 ELSE 1 END,
    cpp.inserted_at DESC,
    cpp.fechainiciopedido DESC NULLS LAST
  LIMIT 1;
$$;


ALTER FUNCTION "public"."fn_get_active_client_for_worker"("p_cod_colab" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_active_client_for_worker_json"("p_cod_colab" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT jsonb_build_object(
    'cod_cliente', COALESCE(c.cod_cliente, cpp.codcliente),
    'cliente_nombre', COALESCE(c.nombre_comercial, cpp.cliente_nombre),
    'empresa_nome', COALESCE(e.nome_pbi, cpp.contratante)
  )
  FROM public.colaborador_por_pedido cpp 
  LEFT JOIN public.clientes c ON c.id = cpp.idcliente 
  LEFT JOIN public.empresas e ON e.sp_id = cpp.idempresa
  WHERE cpp.cod_colab = p_cod_colab 
  ORDER BY 
    CASE WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= CURRENT_DATE THEN 0 ELSE 1 END,
    CASE WHEN cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= CURRENT_DATE THEN 0 ELSE 1 END,
    cpp.inserted_at DESC,
    cpp.fechainiciopedido DESC NULLS LAST
  LIMIT 1;
$$;


ALTER FUNCTION "public"."fn_get_active_client_for_worker_json"("p_cod_colab" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_import_ibans_batch"("payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    item jsonb;
    v_worker_id uuid;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        -- Find the worker_id matching the cod_colab
        SELECT id INTO v_worker_id 
        FROM core_personal.workers 
        WHERE cod_colab = item->>'cod_colab';
        
        IF v_worker_id IS NOT NULL THEN
            -- Check if IBAN doesn't already exist for this worker
            IF NOT EXISTS (
                SELECT 1 FROM core_personal.worker_ibans 
                WHERE iban = item->>'iban'
            ) THEN
                INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes)
                VALUES (
                    v_worker_id, 
                    item->>'banco', 
                    item->>'iban', 
                    'ATIVO', 
                    item->>'observacoes'
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."fn_import_ibans_batch"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_sharepoint_worker"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_empresa_id UUID;
    v_cod_colab TEXT;
    v_status_seguridad TEXT;
    v_status_trabajador TEXT;
BEGIN
    SELECT id INTO v_empresa_id FROM core_common.empresas WHERE is_active = true LIMIT 1;
    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Cannot sync worker: No active Empresa found in core_common.empresas.';
    END IF;

    v_cod_colab := COALESCE(NEW.cod_colab, 'SP-' || NEW.sp_id::text);
    
    -- Safely extract Value from SharePoint JSON string if present, otherwise use the value directly
    v_status_seguridad := COALESCE(substring(NEW.status_seguridad from '"Value":"([^"]+)"'), NEW.status_seguridad);
    v_status_trabajador := COALESCE(substring(NEW.status_trabajador from '"Value":"([^"]+)"'), NEW.status_trabajador);

    IF TG_OP = 'UPDATE' THEN
        UPDATE core_personal.workers
        SET 
            nome = COALESCE(NEW.nombre, 'Sem Nome'),
            email = NEW.email,
            movil = NEW.movil,
            niss = NEW.niss,
            nif = NEW.nif,
            nie = NEW.nie,
            dni = NEW.dni,
            pasaporte = NEW.pasaporte,
            status_seguridad = v_status_seguridad,
            status_trabajador = v_status_trabajador,
            licencia_conducir = NEW.licencia_conducir,
            nacionalidade = NEW.nacionalidade,
            fecha_nacimiento = NEW.fecha_nacimiento,
            nuss = NEW.nuss,
            foto = NEW.foto
        WHERE cod_colab = v_cod_colab;
        
        IF FOUND THEN
            RETURN NEW;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM core_personal.workers WHERE empresa_id = v_empresa_id AND cod_colab = v_cod_colab) THEN
         v_cod_colab := v_cod_colab || '-' || NEW.sp_id::text;
    END IF;
    
    BEGIN
        INSERT INTO core_personal.workers (
            empresa_id,
            cod_colab,
            nome,
            email,
            movil,
            niss,
            nif,
            nie,
            dni,
            pasaporte,
            status_seguridad,
            status_trabajador,
            licencia_conducir,
            nacionalidade,
            fecha_nacimiento,
            nuss,
            foto
        ) VALUES (
            v_empresa_id,
            v_cod_colab,
            COALESCE(NEW.nombre, 'Sem Nome'),
            NEW.email,
            NEW.movil,
            NEW.niss,
            NEW.nif,
            NEW.nie,
            NEW.dni,
            NEW.pasaporte,
            v_status_seguridad,
            v_status_trabajador,
            NEW.licencia_conducir,
            NEW.nacionalidade,
            NEW.fecha_nacimiento,
            NEW.nuss,
            NEW.foto
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to sync worker %: %', NEW.sp_id, SQLERRM;
    END;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_sharepoint_worker"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sys_execute_sql"("q" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  EXECUTE q;
END;
$$;


ALTER FUNCTION "public"."fn_sys_execute_sql"("q" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "public"."app_role"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unique_clients"() RETURNS TABLE("cliente_nombre" "text")
    LANGUAGE "sql"
    AS $$
  SELECT DISTINCT cliente_nombre FROM public.colaborador_por_pedido WHERE cliente_nombre IS NOT NULL ORDER BY 1;
$$;


ALTER FUNCTION "public"."get_unique_clients"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unique_contratantes"() RETURNS TABLE("contratante" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.contratante
  FROM public.colaboradores c
  WHERE c.contratante IS NOT NULL AND c.contratante != ''
  ORDER BY c.contratante ASC;
END;
$$;


ALTER FUNCTION "public"."get_unique_contratantes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unique_funciones"() RETURNS TABLE("funcion" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.funcion
  FROM public.colaboradores c
  WHERE c.funcion IS NOT NULL AND c.funcion != ''
  ORDER BY c.funcion ASC;
END;
$$;


ALTER FUNCTION "public"."get_unique_funciones"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, email, role)
  VALUES (new.id, new.email, 'visualizador')
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.mcs_users
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'super_admin')
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mcs_create_incident_from_reemplazo"("p_reemplazo_sp_id" bigint) RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
declare
  v record;
  v_incident_id bigint;
begin
  select *
  into v
  from public.vw_reemplazos_context
  where reemplazo_sp_id = p_reemplazo_sp_id;

  if not found then
    raise exception 'Reemplazo sp_id % não encontrado', p_reemplazo_sp_id;
  end if;

  insert into public.mcs_incidents (
    incident_type, origin_table, origin_sp_id, origin_code,
    empresa_id, cliente_id, pedido_code,
    title, description, status
  )
  values (
    'reemplazo',
    'reemplazos',
    v.reemplazo_sp_id,
    v.cod_reemplazo,
    v.id_empresa,
    v.id_cliente,
    v.cod_pedido,
    'Reemplazo ' || v.cod_reemplazo,
    'Incidência gerada automaticamente a partir do reemplazo.',
    'open'
  )
  on conflict (origin_table, origin_sp_id)
  do update set
    origin_code = excluded.origin_code
  returning id into v_incident_id;

  insert into public.mcs_incident_tasks (
    incident_id,
    title,
    sector,
    due_at
  )
  values
    (v_incident_id, 'Validar reemplazo', 'Operações', now() + interval '1 day'),
    (v_incident_id, 'Comunicar cliente', 'Comercial', now() + interval '2 days')
  on conflict do nothing;

  return v_incident_id;
end;
$$;


ALTER FUNCTION "public"."mcs_create_incident_from_reemplazo"("p_reemplazo_sp_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_incident_creator"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.created_by_email IS NULL THEN
    NEW.created_by_email := (auth.jwt() ->> 'email');
    
    IF NEW.created_by_email IS NULL AND auth.uid() IS NOT NULL THEN
       SELECT email INTO NEW.created_by_email FROM auth.users WHERE id = auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_incident_creator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_sync_state"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_sync_state"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_contratados_alta"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_worker_id UUID;
    v_empresa_id UUID;
    v_cliente_nome TEXT;
BEGIN
    -- Ignore if there's no worker code
    IF NULLIF(NEW.cod_colab, '') IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find worker DB ID from core_personal.workers!
    SELECT id INTO v_worker_id 
    FROM core_personal.workers 
    WHERE cod_colab = NEW.cod_colab 
    LIMIT 1;
    
    IF v_worker_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find the client name
    SELECT c.nombre_comercial 
    INTO v_cliente_nome
    FROM public.pedidos p
    LEFT JOIN public.clientes c ON p.id_cliente = c.sp_id
    WHERE p.cod_pedido = NEW.cod_servico 
    LIMIT 1;

    -- Get UUID from core_common.empresas
    SELECT id INTO v_empresa_id 
    FROM core_common.empresas 
    LIMIT 1;

    -- Insert Alta ticket
    INSERT INTO core_personal.seguridade_status (
        empresa_id,
        worker_id,
        tipo_evento,
        status,
        origem,
        origem_id,
        origem_cliente_nome,
        data_solicitacao
    ) VALUES (
        v_empresa_id,
        v_worker_id,
        'alta',
        'pendente',
        'SharePoint - ' || COALESCE(NULLIF(NEW.tipo_servico, ''), 'Contratação'),
        NEW.cod_servico,
        v_cliente_nome,
        CURRENT_DATE
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_contratados_alta"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_reemplazados_baja"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_worker_id UUID;
    v_empresa_id UUID;
    v_cliente_nome TEXT;
BEGIN
    -- Ignore if there's no worker code
    IF NULLIF(NEW.cod_colaborador, '') IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find worker DB ID
    SELECT id INTO v_worker_id 
    FROM core_personal.workers 
    WHERE cod_colab = NEW.cod_colaborador 
    LIMIT 1;
    
    IF v_worker_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find the client name
    SELECT c.nombre_comercial 
    INTO v_cliente_nome
    FROM public.pedidos p
    LEFT JOIN public.clientes c ON p.id_cliente = c.sp_id
    WHERE p.cod_pedido = NEW.cod_pedido 
    LIMIT 1;

    -- Get UUID from core_common.empresas
    SELECT id INTO v_empresa_id 
    FROM core_common.empresas 
    LIMIT 1;

    -- Insert Baja ticket
    INSERT INTO core_personal.seguridade_status (
        empresa_id,
        worker_id,
        tipo_evento,
        status,
        origem,
        origem_id,
        origem_cliente_nome,
        data_solicitacao
    ) VALUES (
        v_empresa_id,
        v_worker_id,
        'baja',
        'pendente',
        'SharePoint - Reemplazo',
        NEW.cod_reemplazo,
        v_cliente_nome,
        CURRENT_DATE
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_reemplazados_baja"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_role"("target_user_id" "uuid", "new_role" "text", "new_managed_departments" "text"[] DEFAULT '{}'::"text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  caller_role text;
BEGIN
  -- 1. Descobre quem chamou a função (qual é o nível dele)
  SELECT role INTO caller_role FROM mcs_users WHERE id = auth.uid();

  -- 2. Verifica as permissões de quem está tentando mudar
  IF caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Acesso Negado. Apenas administradores podem alterar permissões.';
  END IF;

  -- 3. Atualiza na tabela do sistema (mcs_users)
  UPDATE mcs_users
  SET 
    role = new_role,
    managed_departments = new_managed_departments
  WHERE id = target_user_id;

  -- 4. Mantém a tabela de perfis (profiles) sincronizada
  UPDATE profiles
  SET 
    role = new_role,
    managed_departments = new_managed_departments
  WHERE id = target_user_id;

END;
$$;


ALTER FUNCTION "public"."update_user_role"("target_user_id" "uuid", "new_role" "text", "new_managed_departments" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_access_to_incident"("p_incident_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_creator_email text;
  v_user_email text;
BEGIN
  -- Admin bypass
  IF public.is_admin() THEN RETURN TRUE; END IF;

  -- Get User Email (Try JWT first, then Table)
  v_user_email := (auth.jwt() ->> 'email');
  IF v_user_email IS NULL THEN
     SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  END IF;

  -- Check if Creator
  SELECT created_by_email INTO v_creator_email FROM public.mcs_incidents WHERE id = p_incident_id;
  
  -- If I am the creator, I have access.
  IF v_creator_email IS NOT NULL AND v_creator_email = v_user_email THEN
    RETURN TRUE;
  END IF;

  -- Check Department Tasks
  RETURN EXISTS (
    SELECT 1 
    FROM public.mcs_incident_tasks t
    JOIN public.mcs_users u ON u.id = auth.uid()
    WHERE t.incident_id = p_incident_id
    AND t.department_id = u.department_id
  );
END;
$$;


ALTER FUNCTION "public"."user_has_access_to_incident"("p_incident_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "core_common"."empresas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nome" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "core_common"."empresas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_common"."user_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_memberships_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'rh'::"text", 'finance'::"text", 'commercial'::"text", 'user'::"text"])))
);


ALTER TABLE "core_common"."user_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."benefit_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "core_personal"."benefit_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."discount_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "core_personal"."discount_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."holerite_eventos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "holerite_id" "uuid" NOT NULL,
    "tipo_evento" "core_personal"."tipo_evento_holerite" NOT NULL,
    "categoria" "core_personal"."categoria_evento_holerite" NOT NULL,
    "descricao" "text" NOT NULL,
    "valor" numeric(15,2) NOT NULL,
    "referencia_dias_horas" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "import_batch_id" "uuid"
);


ALTER TABLE "core_personal"."holerite_eventos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."holerites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "mes_referencia" "date" NOT NULL,
    "horas_trabalhadas" numeric(10,2) DEFAULT 0,
    "total_proventos" numeric(15,2) DEFAULT 0,
    "total_descontos" numeric(15,2) DEFAULT 0,
    "valor_liquido" numeric(15,2) DEFAULT 0,
    "status" "core_personal"."holerite_status" DEFAULT 'rascunho'::"core_personal"."holerite_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "core_personal"."holerites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."ledger_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "type_code" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ledger_types_direction_check" CHECK (("direction" = ANY (ARRAY['credit'::"text", 'debit'::"text"])))
);


ALTER TABLE "core_personal"."ledger_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."seguridade_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "tipo_evento" "core_personal"."seguridade_tipo_evento" NOT NULL,
    "status" "core_personal"."seguridade_status_workflow" DEFAULT 'pendente'::"core_personal"."seguridade_status_workflow" NOT NULL,
    "origem" "text" NOT NULL,
    "origem_id" "text",
    "data_solicitacao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "data_efetiva" "date",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "origem_cliente_nome" "text"
);


ALTER TABLE "core_personal"."seguridade_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."workers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "cod_colab" "text" NOT NULL,
    "nome" "text" NOT NULL,
    "email" "text",
    "movil" "text",
    "niss" "text",
    "nie" "text",
    "dni" "text",
    "pasaporte" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nif" "text",
    "status_seguridad" "text",
    "status_trabajador" "text",
    "licencia_conducir" "text",
    "nacionalidade" "text",
    "fecha_nacimiento" "text",
    "nuss" "text",
    "foto" "text",
    "data_ingresso" "date",
    "data_baixa" "date",
    "data_alta_seguridad" "date",
    "data_baixa_seguridad" "date"
);


ALTER TABLE "core_personal"."workers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" bigint NOT NULL,
    "sp_id" integer NOT NULL,
    "sp_modified" timestamp with time zone,
    "created_sp" timestamp with time zone,
    "modified_by" "text",
    "tp_prazos_pg" "text",
    "cod_cliente" "text",
    "conta_transf" "text",
    "nombre_comercial" "text",
    "razon_social" "text",
    "cif_dni" "text",
    "cif_europeo" "text",
    "domicilio" "text",
    "codigo_postal" "text",
    "municipio" "text",
    "provincia" "text",
    "pais" "text",
    "telefono" "text",
    "movil" "text",
    "email" "text",
    "email_envio_factura" "text",
    "iban" "text",
    "latitude" "text",
    "longitude" "text",
    "comentarios" "text",
    "id_pais" integer,
    "nombre_resp_empresa" "text",
    "nombre_resp_documentacion" "text",
    "nombre_resp_facturacion" "text",
    "telefono_resp_empresa" "text",
    "telefono_resp_documentacion" "text",
    "telefono_facturacion" "text",
    "email_cobros" "text",
    "resp_cobros" "text",
    "telefono_cobros" "text",
    "funcions_clientes" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contratados" (
    "id" bigint NOT NULL,
    "sp_id" bigint,
    "sp_created" timestamp with time zone,
    "sp_modified" timestamp with time zone,
    "sp_created_by" "text",
    "sp_modified_by" "text",
    "cod_colab" "text",
    "nombre" "text",
    "movil" "text",
    "tarifa_acordada_trab" "text",
    "id_funcion" "text",
    "cod_servico" "text",
    "tipo_servico" "text",
    "camisa" "text",
    "pantalone" "text",
    "licencia_de_conducir" "text",
    "observaciones" "text",
    "fecha_nascto" timestamp with time zone,
    "pasaporte" "text"
);


ALTER TABLE "public"."contratados" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pedidos" (
    "id" bigint NOT NULL,
    "sp_id" integer NOT NULL,
    "sp_modified" timestamp with time zone,
    "created_sp" timestamp with time zone,
    "modified_sp" timestamp with time zone,
    "created_by" "text",
    "modified_by" "text",
    "cod_pedido" "text",
    "ubicacion_trabajo" "text",
    "fecha_inicio_pedido" timestamp with time zone,
    "fecha_fin_pedido" timestamp with time zone,
    "fecha_emision" timestamp with time zone,
    "horas_trabalho_dia" "text",
    "responsavel_obra" "text",
    "movil_responsavel" "text",
    "hora_inicio_trabalho" "text",
    "comercial_responsable" "text",
    "solicitado_por" "text",
    "tarifa_contratada" "text",
    "tipo_trabajo" "text",
    "observacoes" "text",
    "status_pedido" "text",
    "id_cliente" integer,
    "cod_cliente" "text",
    "id_empresa" integer,
    "id_pais" integer,
    "id_region" integer,
    "pergunta_respuesta" "text"
);


ALTER TABLE "public"."pedidos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reemplazos" (
    "id" bigint NOT NULL,
    "sp_id" bigint NOT NULL,
    "created_sp" timestamp with time zone,
    "sp_modified" timestamp with time zone,
    "sp_created_by" "text",
    "sp_modified_by" "text",
    "tarifacontratada" "text",
    "codreemplazo" "text",
    "codpedido" "text",
    "codcliente" "text",
    "idcliente" integer,
    "idempresa" "text",
    "comercialresponsable" "text",
    "fechaemision" "text",
    "solicitadopor" "text",
    "umbicaciontrabajo" "text",
    "idpais" "text",
    "idregion" "text",
    "fechainicioreemplazo" "text",
    "fechafinreemplazo" "text",
    "fechafincolab" "text",
    "horastrabalhodia" "text",
    "horainiciotrabalho" "text",
    "responsavelobra" "text",
    "movilresponsavel" "text",
    "observacoes" "text",
    "preguntarespuesta" "text",
    "statusreemplazo" "text",
    "tipotrabajo" "text",
    "inserted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reemplazos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "core_personal"."worker_alocacoes_history" AS
 SELECT "c"."id" AS "contratado_id",
    "c"."cod_colab",
    "w"."id" AS "worker_id",
    "c"."tipo_servico",
    "c"."cod_servico",
    "c"."sp_created" AS "data_alocacao",
    COALESCE("cl"."nombre_comercial", "cl"."razon_social") AS "cliente_nome",
    COALESCE("p"."ubicacion_trabajo", "r"."umbicaciontrabajo") AS "cliente_local",
    COALESCE(("p"."fecha_inicio_pedido")::"text", "r"."fechainicioreemplazo") AS "data_inicio",
    COALESCE(("p"."fecha_fin_pedido")::"text", "r"."fechafinreemplazo") AS "data_fim",
    COALESCE("p"."status_pedido", "r"."statusreemplazo") AS "status_servico",
    "c"."tarifa_acordada_trab"
   FROM (((("public"."contratados" "c"
     JOIN "core_personal"."workers" "w" ON (("w"."cod_colab" = "c"."cod_colab")))
     LEFT JOIN "public"."pedidos" "p" ON ((("c"."tipo_servico" = 'Pedido'::"text") AND ("c"."cod_servico" = "p"."cod_pedido"))))
     LEFT JOIN "public"."reemplazos" "r" ON ((("c"."tipo_servico" = 'Reemplazo'::"text") AND ("c"."cod_servico" = "r"."codreemplazo"))))
     LEFT JOIN "public"."clientes" "cl" ON (("cl"."id" = COALESCE("p"."id_cliente", "r"."idcliente"))));


ALTER VIEW "core_personal"."worker_alocacoes_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."worker_beneficios_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "change_type" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "document_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "worker_beneficios_history_change_type_check" CHECK (("change_type" = ANY (ARRAY['iban_update'::"text", 'tarifa_update'::"text"])))
);


ALTER TABLE "core_personal"."worker_beneficios_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."worker_beneficios_settings" (
    "worker_id" "uuid" NOT NULL,
    "iban" "text",
    "tarifa_hora" numeric(10,2) DEFAULT 0,
    "recebe_auxilio_moradia" boolean DEFAULT false,
    "auxilio_moradia_base" numeric(10,2) DEFAULT 300.00,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "banco" "text",
    "import_batch_id" "uuid"
);


ALTER TABLE "core_personal"."worker_beneficios_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."worker_benefit_housing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "monthly_amount" numeric(12,2) NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "proration_method" "text" DEFAULT 'daily_actual'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "import_batch_id" "uuid",
    CONSTRAINT "worker_benefit_housing_monthly_amount_check" CHECK (("monthly_amount" >= (0)::numeric)),
    CONSTRAINT "worker_benefit_housing_proration_method_check" CHECK (("proration_method" = ANY (ARRAY['daily_actual'::"text", 'daily_30'::"text"])))
);


ALTER TABLE "core_personal"."worker_benefit_housing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."worker_discounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid",
    "category" "core_personal"."discount_category" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "reference_date" "date" NOT NULL,
    "is_recurring" boolean DEFAULT false,
    "status" character varying(50) DEFAULT 'Ativo'::character varying,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "core_personal"."worker_discounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."worker_hours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "period_year" integer NOT NULL,
    "period_month" integer NOT NULL,
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "file_url" "text",
    "file_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sharepoint_sync_status" "text" DEFAULT 'pending'::"text",
    "sharepoint_sync_date" timestamp with time zone,
    "sharepoint_error" "text",
    "observacoes" "text",
    "contratante" "text",
    "cliente_nombre" "text",
    CONSTRAINT "worker_hours_sharepoint_sync_status_check" CHECK (("sharepoint_sync_status" = ANY (ARRAY['pending'::"text", 'syncing'::"text", 'success'::"text", 'failed'::"text"])))
);


ALTER TABLE "core_personal"."worker_hours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."worker_ibans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "banco" "text",
    "iban" "text",
    "status" "text" NOT NULL,
    "documento_url" "text",
    "observacoes" "text",
    "data_alteracao" "date" DEFAULT CURRENT_DATE,
    "changed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "worker_ibans_status_check" CHECK (("status" = ANY (ARRAY['ATIVO'::"text", 'INATIVO'::"text", 'BLOQUEADO'::"text"])))
);


ALTER TABLE "core_personal"."worker_ibans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."worker_ledger_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "competence_year" integer NOT NULL,
    "competence_month" integer NOT NULL,
    "ledger_type_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "reference_type" "text",
    "reference_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "worker_ledger_entries_competence_month_check" CHECK ((("competence_month" >= 1) AND ("competence_month" <= 12))),
    CONSTRAINT "worker_ledger_entries_competence_year_check" CHECK ((("competence_year" >= 2000) AND ("competence_year" <= 2100))),
    CONSTRAINT "worker_ledger_entries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'posted'::"text", 'canceled'::"text"])))
);


ALTER TABLE "core_personal"."worker_ledger_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core_personal"."worker_status_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "change_type" character varying(50) NOT NULL,
    "old_value" character varying(50),
    "new_value" character varying(50) NOT NULL,
    "effective_date" "date" NOT NULL,
    "comments" "text",
    "changed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "core_personal"."worker_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asignaciones_grupo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coche_id" "uuid",
    "cliente_id" "text",
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date" NOT NULL,
    "dias_totais" integer DEFAULT 0,
    "costo_total" numeric DEFAULT 0,
    "cota_kotrik" numeric DEFAULT 0,
    "cota_trabajador" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."asignaciones_grupo" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asignaciones_ocupantes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asignacion_grupo_id" "uuid",
    "trabajador_id" "text",
    "rol" "text" DEFAULT 'ACOMPAÑANTE'::"text",
    "cota_apurada" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "fecha_inicio" "date",
    "fecha_fin" "date"
);


ALTER TABLE "public"."asignaciones_ocupantes" OWNER TO "postgres";


ALTER TABLE "public"."clientes" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."clientes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."coches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "matricula" "text" NOT NULL,
    "marca" "text",
    "modelo" "text",
    "tipo_propiedad" "text",
    "costo_renting" numeric,
    "status" "text" DEFAULT 'Disponível'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ano_fabricacion" integer,
    "cor" "text",
    "chassi" "text",
    "tipo_combustivel" "text",
    "lotacao" integer,
    "categoria" "text",
    "quilometragem_atual" integer DEFAULT 0,
    "proxima_troca_oleo" integer,
    "vencimento_itv" "date",
    "observacoes_conservacao" "text",
    "provedor" "text",
    "data_inicio_contrato" "date",
    "data_fim_contrato" "date",
    "foto_principal" "text",
    "galeria_fotos" "jsonb" DEFAULT '[]'::"jsonb",
    "etiqueta_ambiental" character varying(50),
    "data_matriculacao" "date"
);


ALTER TABLE "public"."coches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."colaborador_por_pedido" (
    "id" bigint NOT NULL,
    "sp_id" bigint NOT NULL,
    "sp_created" timestamp with time zone,
    "sp_modified" timestamp with time zone,
    "sp_created_by" "text",
    "sp_modified_by" "text",
    "codpedido" "text",
    "idcolaborador" "text",
    "nome_colab" "text",
    "fechainiciopedido" "date",
    "fechafinpedido" "date",
    "idcliente" integer,
    "cod_colab" "text",
    "idempresa" integer,
    "contratante" "text",
    "idfuncion" integer,
    "cliente_nombre" "text",
    "tiposervico" "text",
    "fechasalidatrabajador" "date",
    "codreemplazo" "text",
    "codreubicacion" "text",
    "direccion_cliente" "text",
    "statusdocumento" "text",
    "anexos" "jsonb",
    "codcliente" "text",
    "inserted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."colaborador_por_pedido" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."colaborador_por_pedido_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."colaborador_por_pedido_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."colaborador_por_pedido_id_seq" OWNED BY "public"."colaborador_por_pedido"."id";



CREATE TABLE IF NOT EXISTS "public"."colaboradores" (
    "id" bigint NOT NULL,
    "sp_id" integer NOT NULL,
    "sp_modified" timestamp with time zone,
    "cod_colab" "text",
    "nombre" "text",
    "pasaporte" "text",
    "fecha_nacimiento" "text",
    "nacionalidade" "text",
    "dni" "text",
    "nie" "text",
    "movil" "text",
    "niss" "text",
    "nif" "text",
    "status_seguridad" "text",
    "fecha_alta" "text",
    "fecha_baja" "text",
    "ubicacion" "text",
    "fecha_inicio" "text",
    "fecha_fin_pedido" "text",
    "fecha_salida_trabajador" "text",
    "camiseta" "text",
    "pantalones" "text",
    "transporte" "text",
    "licencia_conducir" "text",
    "alojamiento" "text",
    "status_trabajador" "text",
    "motivo_salida" "text",
    "comentarios" "text",
    "funcion" "text",
    "contratante" "text",
    "email" "text",
    "foto" "text",
    "domicilio" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "nuss" "text"
);


ALTER TABLE "public"."colaboradores" OWNER TO "postgres";


ALTER TABLE "public"."colaboradores" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."colaboradores_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."colaboradores_reemplazados" (
    "id" bigint NOT NULL,
    "sp_id" bigint NOT NULL,
    "sp_created" timestamp with time zone,
    "sp_modified" timestamp with time zone,
    "sp_created_by" "text",
    "sp_modified_by" "text",
    "cod_reemplazo" "text",
    "cod_pedido" "text",
    "cod_cliente" "text",
    "nombre_colaborador" "text",
    "cod_colaborador" "text",
    "funcion" "text",
    "cantidad" "text",
    "fecha_inicio_reemplazo" timestamp with time zone,
    "fecha_fin_reemplazo" timestamp with time zone,
    "observaciones" "text"
);


ALTER TABLE "public"."colaboradores_reemplazados" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."colaboradores_reemplazados_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."colaboradores_reemplazados_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."colaboradores_reemplazados_id_seq" OWNED BY "public"."colaboradores_reemplazados"."id";



CREATE TABLE IF NOT EXISTS "public"."colaboradores_reubicados" (
    "id" bigint NOT NULL,
    "sp_id" bigint,
    "sp_created" timestamp with time zone,
    "sp_modified" timestamp with time zone,
    "sp_created_by" "text",
    "sp_modified_by" "text",
    "cod_reubicacion" "text",
    "cod_pedido" "text",
    "cod_cliente" "text",
    "nombre_colaborador" "text",
    "cod_colab" "text",
    "funcion" "text",
    "cantidad" "text",
    "fecha_inicio_reubicacion" timestamp with time zone,
    "fecha_fin_reubicacion" timestamp with time zone,
    "observaciones" "text"
);


ALTER TABLE "public"."colaboradores_reubicados" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."colaboradores_reubicados_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."colaboradores_reubicados_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."colaboradores_reubicados_id_seq" OWNED BY "public"."colaboradores_reubicados"."id";



CREATE TABLE IF NOT EXISTS "public"."contas_receber" (
    "id" bigint NOT NULL,
    "sp_id" integer NOT NULL,
    "sp_modified" timestamp with time zone,
    "empresa" "text",
    "cod_cliente" "text",
    "cliente" "text",
    "obra" "text",
    "periodo_fat" "text",
    "data_emissao" "text",
    "competencia" "text",
    "dt_venc" "text",
    "moeda" "text",
    "valot_total" "text",
    "status" "text",
    "origem" "text",
    "cat_receita" "text",
    "centro_custo" "text",
    "conta_contab" "text",
    "num_doc" "text",
    "obs" "text",
    "creado" "text",
    "creado_por" "text",
    "banco" "text",
    "comentarios" "text",
    "form_receb" "text",
    "comisao_taxa" "text",
    "hist_valor_parcial" "text",
    "integral_parcial" "text",
    "prev_pag" "text",
    "saldo_a_pagar" "text",
    "tipo_cobros" "text",
    "valor_parcial" "text",
    "obs_recebimento" "text",
    "dt_recebimento" "text",
    "modificado" "text",
    "modificado_por" "text"
);


ALTER TABLE "public"."contas_receber" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."contas_receber_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."contas_receber_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."contas_receber_id_seq" OWNED BY "public"."contas_receber"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."contratados_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."contratados_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."contratados_id_seq" OWNED BY "public"."contratados"."id";



CREATE TABLE IF NOT EXISTS "public"."empresas" (
    "id" bigint NOT NULL,
    "sp_id" bigint NOT NULL,
    "sp_created" timestamp with time zone,
    "sp_modified" timestamp with time zone,
    "sp_created_by" "text",
    "sp_modified_by" "text",
    "nome_pbi" "text",
    "razon_social" "text",
    "nombre_comercial" "text",
    "cif_dni" "text",
    "cif_europeo" "text",
    "conta_transf" "text",
    "domicilio" "text",
    "codigo_postal" "text",
    "municipio" "text",
    "provincia" "text",
    "pais" "text",
    "telefono" "text",
    "movil" "text",
    "email" "text",
    "email_envio_factura" "text",
    "email_cobros" "text",
    "iban" "text",
    "latitude" "text",
    "longitude" "text",
    "comentarios" "text",
    "nombre_resp_empresa" "text",
    "nombre_resp_documentacion" "text",
    "nombre_resp_facturacion" "text",
    "telefono_resp_empresa" "text",
    "telefono_resp_documentacion" "text",
    "telefono_facturacion" "text",
    "resp_cobros" "text",
    "telefono_cobros" "text"
);


ALTER TABLE "public"."empresas" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."empresas_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."empresas_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."empresas_id_seq" OWNED BY "public"."empresas"."id";



CREATE TABLE IF NOT EXISTS "public"."estimaciones" (
    "id" bigint NOT NULL,
    "sp_id" bigint NOT NULL,
    "sp_modified" timestamp with time zone,
    "title" "text",
    "comercial_ventas" "text",
    "correo_comercial" "text",
    "nombre" "text",
    "id_cliente" "text",
    "empresa" "text",
    "externo" "text",
    "empresa_interna" "text",
    "id_firma_digital" "text",
    "correo_adm_ventas" "text",
    "correo_central_ventas" "text",
    "correo_coordinacion_ei" "text",
    "correo_prl_ei" "text",
    "fecha_inicio" timestamp with time zone,
    "fecha_final" timestamp with time zone,
    "direccion" "text",
    "codigo_postal" "text",
    "pruebas" "text",
    "inicio_prueba" timestamp with time zone,
    "fin_prueba" timestamp with time zone,
    "direccion_pruebas" "text",
    "codigo_postal_pruebas" "text",
    "lunes" boolean,
    "martes" boolean,
    "miercoles" boolean,
    "jueves" boolean,
    "viernes" boolean,
    "sabado" boolean,
    "domingo" boolean,
    "completa_estandar" "text",
    "inserted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."estimaciones" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."estimaciones_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."estimaciones_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."estimaciones_id_seq" OWNED BY "public"."estimaciones"."id";



CREATE TABLE IF NOT EXISTS "public"."funcion" (
    "id" bigint NOT NULL,
    "sp_id" bigint,
    "sp_created" timestamp with time zone,
    "sp_modified" timestamp with time zone,
    "sp_created_by" "text",
    "sp_modified_by" "text",
    "cod_funcion" "text",
    "nombre" "text",
    "descripcion" "text",
    "status_funcion" "text",
    "analise_risco" "text",
    "perguntas" "text",
    "grupo_funcion" "text",
    "tarifa_cliente" "text",
    "dias_habiles" "text",
    "nomina_completa" "text",
    "coste_epi" "text"
);


ALTER TABLE "public"."funcion" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."funcion_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."funcion_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."funcion_id_seq" OWNED BY "public"."funcion"."id";



CREATE TABLE IF NOT EXISTS "public"."itens_pedido" (
    "id" bigint NOT NULL,
    "sp_id" bigint NOT NULL,
    "sp_created" timestamp with time zone,
    "sp_modified" timestamp with time zone,
    "sp_created_by" "text",
    "sp_modified_by" "text",
    "cod_pedido" "text",
    "nombre_perfil" "text",
    "cantidad" numeric,
    "descripcion_trabajo" "text",
    "id_funcion_col" bigint,
    "analise_risco" "text"
);


ALTER TABLE "public"."itens_pedido" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."itens_pedido_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."itens_pedido_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."itens_pedido_id_seq" OWNED BY "public"."itens_pedido"."id";



CREATE TABLE IF NOT EXISTS "public"."itens_reemplazo" (
    "id" bigint NOT NULL,
    "sp_id" bigint NOT NULL,
    "sp_modified" timestamp with time zone,
    "creado_sp" timestamp with time zone,
    "creado_por" "text",
    "modificado_por" "text",
    "cod_reemplazo" "text",
    "cod_pedido" "text",
    "cantidad" bigint,
    "descripcion_trabajo" "text",
    "nombre_perfil" "text",
    "id_funcion_col" bigint,
    "analise_risco" "text",
    "sp_created" timestamp with time zone,
    "sp_created_by" "text",
    "sp_modified_by" "text"
);


ALTER TABLE "public"."itens_reemplazo" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."itens_reemplazo_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."itens_reemplazo_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."itens_reemplazo_id_seq" OWNED BY "public"."itens_reemplazo"."id";



CREATE TABLE IF NOT EXISTS "public"."mantenimientos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coche_id" "uuid",
    "tipo" "text" NOT NULL,
    "fecha_vencimiento" "date" NOT NULL,
    "estado" "text" DEFAULT 'PENDENTE'::"text",
    "km_vencimiento" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "anexos" "jsonb" DEFAULT '[]'::"jsonb",
    "descripcion" "text"
);


ALTER TABLE "public"."mantenimientos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcs_comissoes_lancamentos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vendedor_email" "text" NOT NULL,
    "vendedor_nome" "text",
    "tipo" "text" NOT NULL,
    "mes_referencia" "text" NOT NULL,
    "valor" numeric NOT NULL,
    "referencia_id" "text",
    "descricao" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_by" "uuid",
    CONSTRAINT "mcs_comissoes_lancamentos_tipo_check" CHECK (("tipo" = ANY (ARRAY['pagamento'::"text", 'ajuste_positivo'::"text", 'ajuste_negativo'::"text"])))
);


ALTER TABLE "public"."mcs_comissoes_lancamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcs_comissoes_settings" (
    "id" integer NOT NULL,
    "comissao_base" numeric DEFAULT 20.0,
    "bonus_novo_cliente" numeric DEFAULT 30.0,
    "carencia_dias" integer DEFAULT 20,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."mcs_comissoes_settings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mcs_comissoes_settings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mcs_comissoes_settings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mcs_comissoes_settings_id_seq" OWNED BY "public"."mcs_comissoes_settings"."id";



CREATE TABLE IF NOT EXISTS "public"."mcs_department_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "department_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "member_role" "text" DEFAULT 'member'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nombrecompleto" "text",
    "correoempresarial" "text",
    "ubicaciontrabajo" "text",
    "codigoresponsabilidad" "text",
    "telefonodirecto" "text",
    "extenciontelefonica" "text",
    "fechainicio" "date",
    "fechanacimiento" "date",
    "estadotrabajador" "text",
    "iban" "text",
    "empresa_contratante_id" bigint,
    "empresa_servicos_id" bigint,
    "usuario" "text"
);


ALTER TABLE "public"."mcs_department_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcs_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mcs_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcs_entity_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "source_system" "text" NOT NULL,
    "source_table" "text" NOT NULL,
    "source_sp_id" integer,
    "source_id" "uuid",
    "source_ref" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mcs_entity_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcs_incident_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "incident_id" "uuid" NOT NULL,
    "step_order" integer NOT NULL,
    "title" "text" NOT NULL,
    "department_id" "uuid",
    "sla_days" integer DEFAULT 1 NOT NULL,
    "due_at" timestamp with time zone,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "assigned_to_email" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "last_status_change_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_for" timestamp with time zone,
    "created_by" "uuid"
);


ALTER TABLE "public"."mcs_incident_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcs_incidents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "incident_type" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "playbook_id" "uuid",
    "origin_system" "text",
    "origin_table" "text",
    "origin_sp_id" integer,
    "origin_ref" "text",
    "client_sp_id" integer,
    "pedido_sp_id" integer,
    "worker_sp_id" integer,
    "obra_sp_id" integer,
    "company_sp_id" integer,
    "title" "text" NOT NULL,
    "description" "text",
    "context_json" "jsonb",
    "created_by_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "origin_code" "text",
    "empresa_id" integer,
    "cliente_id" integer,
    "pedido_code" "text"
);


ALTER TABLE "public"."mcs_incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcs_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_email" "text" NOT NULL,
    "type" "text" NOT NULL,
    "severity" "text" DEFAULT 'info'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text",
    "entity_type" "text",
    "entity_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."mcs_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcs_playbook_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "playbook_id" "uuid" NOT NULL,
    "step_order" integer NOT NULL,
    "task_template_id" "uuid" NOT NULL,
    "override_title_pt" "text",
    "override_title_es" "text",
    "override_department_id" "uuid",
    "override_sla_days" integer,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mcs_playbook_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcs_playbooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_es" "text",
    "incident_type" "text" NOT NULL,
    "description_pt" "text",
    "description_es" "text",
    "version" integer DEFAULT 1 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mcs_playbooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcs_task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title_pt" "text" NOT NULL,
    "title_es" "text",
    "description_pt" "text",
    "description_es" "text",
    "default_department_id" "uuid",
    "default_sla_days" integer DEFAULT 1 NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mcs_task_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcs_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "display_name" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "language" "text" DEFAULT 'pt'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "department_id" "uuid",
    "managed_departments" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."mcs_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."multas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coche_id" "uuid",
    "infrator_id" "text",
    "fecha_infraccion" timestamp with time zone NOT NULL,
    "motivo" "text",
    "importe" numeric DEFAULT 0,
    "notificada_conductor" boolean DEFAULT false,
    "pagada" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."multas" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pedidos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pedidos_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pedidos_id_seq" OWNED BY "public"."pedidos"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'user'::"text",
    "department" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "managed_departments" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'manager'::"text", 'super_admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reemplazos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reemplazos_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reemplazos_id_seq" OWNED BY "public"."reemplazos"."id";



CREATE TABLE IF NOT EXISTS "public"."reubicaciones" (
    "id" bigint NOT NULL,
    "sp_id" bigint,
    "sp_created" timestamp with time zone,
    "sp_modified" timestamp with time zone,
    "sp_created_by" "text",
    "sp_modified_by" "text",
    "cod_reubicaciones" "text",
    "cliente" "text",
    "empresa" "text",
    "status_reubicaciones" "text",
    "observacoes" "text",
    "id_empresa" "text",
    "id_cliente" "text",
    "fecha_emision" timestamp with time zone,
    "fecha_inicio_reubicacion" timestamp with time zone,
    "fecha_fin_reubicacion" timestamp with time zone,
    "cod_pedido" "text",
    "comercial_responsable" "text",
    "solicitado_por" "text",
    "id_pais" "text",
    "id_regiao" "text",
    "id_region" "text",
    "umbicacion_trabajo" "text",
    "horas_trabajo_dia" "text",
    "hora_inicio_dia" "text",
    "movil_responsable" "text",
    "responsable_obra" "text",
    "tipo_trabajo" "text",
    "cod_cliente" "text"
);


ALTER TABLE "public"."reubicaciones" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reubicaciones_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reubicaciones_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reubicaciones_id_seq" OWNED BY "public"."reubicaciones"."id";



CREATE TABLE IF NOT EXISTS "public"."sync_state" (
    "entity" "text" NOT NULL,
    "last_modified_sp" timestamp with time zone,
    "last_run_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sync_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_rules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "empresa_id" bigint,
    "tax_type" "public"."tax_category" NOT NULL,
    "rate_percentage" numeric(5,2),
    "fixed_amount" numeric(10,2),
    "description" "text",
    "is_active" boolean DEFAULT true,
    "valid_from" "date" DEFAULT CURRENT_DATE,
    "valid_to" "date",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "has_value" CHECK ((("rate_percentage" IS NOT NULL) OR ("fixed_amount" IS NOT NULL)))
);


ALTER TABLE "public"."tax_rules" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."trabajadores" AS
 SELECT "id",
    "cod_colab" AS "Cod_colab",
    "nombre" AS "Nombre",
    "funcion" AS "Departamento",
    "status_trabajador",
    "email"
   FROM "public"."colaboradores";


ALTER VIEW "public"."trabajadores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text",
    "role" "public"."app_role" DEFAULT 'visualizador'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_comissoes_geradas" AS
 WITH "settings" AS (
         SELECT "mcs_comissoes_settings"."comissao_base",
            "mcs_comissoes_settings"."bonus_novo_cliente",
            "mcs_comissoes_settings"."carencia_dias"
           FROM "public"."mcs_comissoes_settings"
          WHERE ("mcs_comissoes_settings"."id" = 1)
        ), "pedidos_extraidos" AS (
         SELECT "p"."cod_pedido",
            "p"."id_cliente",
            (("p"."comercial_responsable")::"jsonb" ->> 'Value'::"text") AS "vendedor_nome",
            COALESCE(( SELECT "pr"."email"
                   FROM "public"."profiles" "pr"
                  WHERE ("pr"."full_name" ~~* (('%'::"text" || (("p"."comercial_responsable")::"jsonb" ->> 'Value'::"text")) || '%'::"text"))
                 LIMIT 1), (("p"."comercial_responsable")::"jsonb" ->> 'Value'::"text")) AS "vendedor_email",
            "p"."fecha_inicio_pedido"
           FROM "public"."pedidos" "p"
          WHERE ("p"."comercial_responsable" IS NOT NULL)
        ), "primeiros_pedidos" AS (
         SELECT "pedidos"."id_cliente",
            "min"("pedidos"."fecha_inicio_pedido") AS "primeiro_pedido_data"
           FROM "public"."pedidos"
          GROUP BY "pedidos"."id_cliente"
        ), "colaboradores_unicos_por_pedido" AS (
         SELECT DISTINCT ON ("colaborador_por_pedido"."codpedido") "colaborador_por_pedido"."codpedido",
            "colaborador_por_pedido"."cliente_nombre",
            "colaborador_por_pedido"."fechainiciopedido"
           FROM "public"."colaborador_por_pedido"
        )
 SELECT ('hire_'::"text" || ("cp"."id")::"text") AS "id",
    "ep"."vendedor_nome",
    "ep"."vendedor_email",
    "cp"."codpedido",
    "cp"."nome_colab",
    "cp"."cliente_nombre",
    'contratacao'::"text" AS "tipo",
    "s"."comissao_base" AS "valor",
    "cp"."fechainiciopedido" AS "data_referencia",
    "to_char"(("cp"."fechainiciopedido")::timestamp with time zone, 'YYYY-MM'::"text") AS "mes_referencia"
   FROM (("public"."colaborador_por_pedido" "cp"
     JOIN "pedidos_extraidos" "ep" ON (("ep"."cod_pedido" = "cp"."codpedido")))
     CROSS JOIN "settings" "s")
UNION ALL
 SELECT ('bonus_'::"text" || "ep"."cod_pedido") AS "id",
    "ep"."vendedor_nome",
    "ep"."vendedor_email",
    "ep"."cod_pedido" AS "codpedido",
    ''::"text" AS "nome_colab",
    "cup"."cliente_nombre",
    'bonus_cliente_novo'::"text" AS "tipo",
    "s"."bonus_novo_cliente" AS "valor",
    "cup"."fechainiciopedido" AS "data_referencia",
    "to_char"(("cup"."fechainiciopedido")::timestamp with time zone, 'YYYY-MM'::"text") AS "mes_referencia"
   FROM ((("pedidos_extraidos" "ep"
     JOIN "primeiros_pedidos" "pp" ON (("pp"."id_cliente" = "ep"."id_cliente")))
     JOIN "colaboradores_unicos_por_pedido" "cup" ON (("cup"."codpedido" = "ep"."cod_pedido")))
     CROSS JOIN "settings" "s")
  WHERE ("ep"."fecha_inicio_pedido" = "pp"."primeiro_pedido_data")
UNION ALL
 SELECT ('desc_'::"text" || ("cp"."id")::"text") AS "id",
    "ep"."vendedor_nome",
    "ep"."vendedor_email",
    "cp"."codpedido",
    "cp"."nome_colab",
    ((("cp"."cliente_nombre" || ' (Subst. R. '::"text") || "cp"."codreemplazo") || ')'::"text") AS "cliente_nombre",
    'desconto_reemplazo'::"text" AS "tipo",
    (- "s"."comissao_base") AS "valor",
    COALESCE("cp"."fechasalidatrabajador", ("cp"."updated_at")::"date") AS "data_referencia",
    "to_char"((COALESCE("cp"."fechasalidatrabajador", ("cp"."updated_at")::"date"))::timestamp with time zone, 'YYYY-MM'::"text") AS "mes_referencia"
   FROM (("public"."colaborador_por_pedido" "cp"
     JOIN "pedidos_extraidos" "ep" ON (("ep"."cod_pedido" = "cp"."codpedido")))
     CROSS JOIN "settings" "s")
  WHERE (("cp"."codreemplazo" IS NOT NULL) AND ("cp"."codreemplazo" <> ''::"text") AND ((COALESCE("cp"."fechasalidatrabajador", ("cp"."updated_at")::"date") - "cp"."fechainiciopedido") < "s"."carencia_dias"));


ALTER VIEW "public"."vw_comissoes_geradas" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_mcs_servicos_unificados" AS
 SELECT 'pedido'::"text" AS "service_type",
    "p"."sp_id" AS "origin_sp_id",
    "p"."cod_pedido" AS "service_code",
    "p"."cod_pedido" AS "pedido_code",
    "p"."id_cliente" AS "client_idcliente",
    "p"."cod_cliente" AS "client_codcliente",
    "p"."id_empresa" AS "empresa_id",
    "p"."sp_modified"
   FROM "public"."pedidos" "p"
UNION ALL
 SELECT 'reemplazo'::"text" AS "service_type",
    "r"."sp_id" AS "origin_sp_id",
    "r"."codreemplazo" AS "service_code",
    "r"."codpedido" AS "pedido_code",
    "r"."idcliente" AS "client_idcliente",
    "r"."codcliente" AS "client_codcliente",
    ("r"."idempresa")::integer AS "empresa_id",
    "r"."sp_modified"
   FROM "public"."reemplazos" "r";


ALTER VIEW "public"."vw_mcs_servicos_unificados" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reemplazos_context" AS
 SELECT "r"."sp_id" AS "reemplazo_sp_id",
    "r"."codreemplazo" AS "cod_reemplazo",
    "r"."codpedido" AS "cod_pedido",
    "r"."idcliente" AS "id_cliente",
    "r"."codcliente" AS "cod_cliente",
        CASE
            WHEN ("r"."idempresa" IS NULL) THEN NULL::integer
            WHEN ("r"."idempresa" = ANY (ARRAY[''::"text", 'EMPTY'::"text"])) THEN NULL::integer
            ELSE ("r"."idempresa")::integer
        END AS "id_empresa",
    "r"."sp_modified",
    "p"."sp_id" AS "pedido_sp_id",
    "c"."sp_id" AS "cliente_sp_id"
   FROM (("public"."reemplazos" "r"
     LEFT JOIN "public"."pedidos" "p" ON (("p"."cod_pedido" = "r"."codpedido")))
     LEFT JOIN "public"."clientes" "c" ON (("c"."sp_id" = "r"."idcliente")));


ALTER VIEW "public"."vw_reemplazos_context" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_discounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "reference_date" "date" NOT NULL,
    "is_recurring" boolean DEFAULT false,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "import_batch_id" "uuid"
);


ALTER TABLE "public"."worker_discounts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."colaborador_por_pedido" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."colaborador_por_pedido_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."colaboradores_reemplazados" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."colaboradores_reemplazados_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."colaboradores_reubicados" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."colaboradores_reubicados_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."contas_receber" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."contas_receber_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."contratados" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."contratados_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."empresas" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."empresas_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."estimaciones" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."estimaciones_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."funcion" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."funcion_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."itens_pedido" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."itens_pedido_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."itens_reemplazo" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."itens_reemplazo_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mcs_comissoes_settings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mcs_comissoes_settings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pedidos" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."pedidos_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."reemplazos" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."reemplazos_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."reubicaciones" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."reubicaciones_id_seq"'::"regclass");



ALTER TABLE ONLY "core_common"."empresas"
    ADD CONSTRAINT "empresas_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "core_common"."empresas"
    ADD CONSTRAINT "empresas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_common"."user_memberships"
    ADD CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_common"."user_memberships"
    ADD CONSTRAINT "user_memberships_user_id_empresa_id_role_key" UNIQUE ("user_id", "empresa_id", "role");



ALTER TABLE ONLY "core_personal"."benefit_categories"
    ADD CONSTRAINT "benefit_categories_empresa_id_name_key" UNIQUE ("empresa_id", "name");



ALTER TABLE ONLY "core_personal"."benefit_categories"
    ADD CONSTRAINT "benefit_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."discount_categories"
    ADD CONSTRAINT "discount_categories_empresa_id_name_key" UNIQUE ("empresa_id", "name");



ALTER TABLE ONLY "core_personal"."discount_categories"
    ADD CONSTRAINT "discount_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."holerite_eventos"
    ADD CONSTRAINT "holerite_eventos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."holerites"
    ADD CONSTRAINT "holerites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."ledger_types"
    ADD CONSTRAINT "ledger_types_empresa_id_type_code_key" UNIQUE ("empresa_id", "type_code");



ALTER TABLE ONLY "core_personal"."ledger_types"
    ADD CONSTRAINT "ledger_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."seguridade_status"
    ADD CONSTRAINT "seguridade_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."worker_beneficios_history"
    ADD CONSTRAINT "worker_beneficios_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."worker_beneficios_settings"
    ADD CONSTRAINT "worker_beneficios_settings_pkey" PRIMARY KEY ("worker_id");



ALTER TABLE ONLY "core_personal"."worker_benefit_housing"
    ADD CONSTRAINT "worker_benefit_housing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."worker_discounts"
    ADD CONSTRAINT "worker_discounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."worker_hours"
    ADD CONSTRAINT "worker_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."worker_hours"
    ADD CONSTRAINT "worker_hours_unique_period" UNIQUE ("worker_id", "period_year", "period_month");



ALTER TABLE ONLY "core_personal"."worker_ibans"
    ADD CONSTRAINT "worker_ibans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."worker_ledger_entries"
    ADD CONSTRAINT "worker_ledger_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."worker_status_history"
    ADD CONSTRAINT "worker_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core_personal"."workers"
    ADD CONSTRAINT "workers_empresa_id_cod_colab_key" UNIQUE ("empresa_id", "cod_colab");



ALTER TABLE ONLY "core_personal"."workers"
    ADD CONSTRAINT "workers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asignaciones_grupo"
    ADD CONSTRAINT "asignaciones_grupo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asignaciones_ocupantes"
    ADD CONSTRAINT "asignaciones_ocupantes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coches"
    ADD CONSTRAINT "coches_matricula_key" UNIQUE ("matricula");



ALTER TABLE ONLY "public"."coches"
    ADD CONSTRAINT "coches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colaborador_por_pedido"
    ADD CONSTRAINT "colaborador_por_pedido_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colaboradores_reemplazados"
    ADD CONSTRAINT "colaboradores_reemplazados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colaboradores_reemplazados"
    ADD CONSTRAINT "colaboradores_reemplazados_sp_id_key" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."colaboradores_reubicados"
    ADD CONSTRAINT "colaboradores_reubicados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colaboradores_reubicados"
    ADD CONSTRAINT "colaboradores_reubicados_sp_id_key" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_sp_id_key" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."contas_receber"
    ADD CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contratados"
    ADD CONSTRAINT "contratados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contratados"
    ADD CONSTRAINT "contratados_sp_id_key" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."empresas"
    ADD CONSTRAINT "empresas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresas"
    ADD CONSTRAINT "empresas_sp_id_key" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."estimaciones"
    ADD CONSTRAINT "estimaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funcion"
    ADD CONSTRAINT "funcion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funcion"
    ADD CONSTRAINT "funcion_sp_id_key" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."itens_pedido"
    ADD CONSTRAINT "itens_pedido_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."itens_reemplazo"
    ADD CONSTRAINT "itens_reemplazo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."itens_reemplazo"
    ADD CONSTRAINT "itens_reemplazo_sp_id_key" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."mantenimientos"
    ADD CONSTRAINT "mantenimientos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_comissoes_lancamentos"
    ADD CONSTRAINT "mcs_comissoes_lancamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_comissoes_settings"
    ADD CONSTRAINT "mcs_comissoes_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_department_members"
    ADD CONSTRAINT "mcs_department_members_department_id_user_id_key" UNIQUE ("department_id", "user_id");



ALTER TABLE ONLY "public"."mcs_department_members"
    ADD CONSTRAINT "mcs_department_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_departments"
    ADD CONSTRAINT "mcs_departments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."mcs_departments"
    ADD CONSTRAINT "mcs_departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_entity_links"
    ADD CONSTRAINT "mcs_entity_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_incident_tasks"
    ADD CONSTRAINT "mcs_incident_tasks_incident_id_step_order_key" UNIQUE ("incident_id", "step_order");



ALTER TABLE ONLY "public"."mcs_incident_tasks"
    ADD CONSTRAINT "mcs_incident_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_incidents"
    ADD CONSTRAINT "mcs_incidents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_notifications"
    ADD CONSTRAINT "mcs_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_playbook_steps"
    ADD CONSTRAINT "mcs_playbook_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_playbook_steps"
    ADD CONSTRAINT "mcs_playbook_steps_playbook_id_step_order_key" UNIQUE ("playbook_id", "step_order");



ALTER TABLE ONLY "public"."mcs_playbooks"
    ADD CONSTRAINT "mcs_playbooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_task_templates"
    ADD CONSTRAINT "mcs_task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcs_users"
    ADD CONSTRAINT "mcs_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."mcs_users"
    ADD CONSTRAINT "mcs_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."multas"
    ADD CONSTRAINT "multas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pedidos"
    ADD CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reemplazos"
    ADD CONSTRAINT "reemplazos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reubicaciones"
    ADD CONSTRAINT "reubicaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reubicaciones"
    ADD CONSTRAINT "reubicaciones_sp_id_key" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."sync_state"
    ADD CONSTRAINT "sync_state_pkey" PRIMARY KEY ("entity");



ALTER TABLE ONLY "public"."tax_rules"
    ADD CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "uq_clientes_sp_id" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."colaborador_por_pedido"
    ADD CONSTRAINT "uq_cpp_sp_id" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."estimaciones"
    ADD CONSTRAINT "uq_estimaciones_sp_id" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."reemplazos"
    ADD CONSTRAINT "uq_reemplazos_sp_id" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."worker_discounts"
    ADD CONSTRAINT "worker_discounts_pkey" PRIMARY KEY ("id");



CREATE INDEX "ix_user_memberships_empresa" ON "core_common"."user_memberships" USING "btree" ("empresa_id");



CREATE INDEX "ix_user_memberships_user" ON "core_common"."user_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_seguridade_status_empresa" ON "core_personal"."seguridade_status" USING "btree" ("empresa_id");



CREATE INDEX "idx_seguridade_status_worker" ON "core_personal"."seguridade_status" USING "btree" ("worker_id");



CREATE INDEX "idx_seguridade_status_workflow" ON "core_personal"."seguridade_status" USING "btree" ("status");



CREATE INDEX "idx_worker_beneficios_settings_import_batch_id" ON "core_personal"."worker_beneficios_settings" USING "btree" ("import_batch_id");



CREATE INDEX "idx_worker_discounts_category" ON "core_personal"."worker_discounts" USING "btree" ("category");



CREATE INDEX "idx_worker_discounts_date" ON "core_personal"."worker_discounts" USING "btree" ("reference_date");



CREATE INDEX "idx_worker_discounts_worker_id" ON "core_personal"."worker_discounts" USING "btree" ("worker_id");



CREATE INDEX "idx_worker_hours_sp_sync" ON "core_personal"."worker_hours" USING "btree" ("sharepoint_sync_status");



CREATE INDEX "ix_housing_empresa" ON "core_personal"."worker_benefit_housing" USING "btree" ("empresa_id");



CREATE INDEX "ix_housing_worker" ON "core_personal"."worker_benefit_housing" USING "btree" ("worker_id");



CREATE INDEX "ix_ledger_empresa_month" ON "core_personal"."worker_ledger_entries" USING "btree" ("empresa_id", "competence_year", "competence_month");



CREATE INDEX "ix_ledger_worker_month" ON "core_personal"."worker_ledger_entries" USING "btree" ("worker_id", "competence_year", "competence_month");



CREATE INDEX "ix_workers_empresa" ON "core_personal"."workers" USING "btree" ("empresa_id");



CREATE INDEX "ix_workers_nome" ON "core_personal"."workers" USING "btree" ("nome");



CREATE UNIQUE INDEX "ux_ledger_auto_ref" ON "core_personal"."worker_ledger_entries" USING "btree" ("worker_id", "competence_year", "competence_month", "ledger_type_id", "reference_id") WHERE ("reference_id" IS NOT NULL);



CREATE UNIQUE INDEX "contas_receber_sp_id_uq" ON "public"."contas_receber" USING "btree" ("sp_id");



CREATE INDEX "idx_clientes_cod_cliente" ON "public"."clientes" USING "btree" ("cod_cliente");



CREATE INDEX "idx_clientes_email" ON "public"."clientes" USING "btree" ("email");



CREATE INDEX "idx_clientes_sp_modified" ON "public"."clientes" USING "btree" ("sp_modified");



CREATE INDEX "idx_colab_reemp_sp_modified" ON "public"."colaboradores_reemplazados" USING "btree" ("sp_modified");



CREATE INDEX "idx_colab_reubicados_cod_pedido" ON "public"."colaboradores_reubicados" USING "btree" ("cod_pedido");



CREATE INDEX "idx_colab_reubicados_cod_reubicacion" ON "public"."colaboradores_reubicados" USING "btree" ("cod_reubicacion");



CREATE INDEX "idx_colab_reubicados_sp_modified" ON "public"."colaboradores_reubicados" USING "btree" ("sp_modified");



CREATE INDEX "idx_contratados_cod_colab" ON "public"."contratados" USING "btree" ("cod_colab");



CREATE INDEX "idx_contratados_sp_id" ON "public"."contratados" USING "btree" ("sp_id");



CREATE INDEX "idx_empresas_nome_pbi" ON "public"."empresas" USING "btree" ("nome_pbi");



CREATE INDEX "idx_empresas_sp_modified" ON "public"."empresas" USING "btree" ("sp_modified");



CREATE INDEX "idx_funcion_sp_modified" ON "public"."funcion" USING "btree" ("sp_modified");



CREATE INDEX "idx_itens_reemplazo_cod_pedido" ON "public"."itens_reemplazo" USING "btree" ("cod_pedido");



CREATE INDEX "idx_itens_reemplazo_cod_reemplazo" ON "public"."itens_reemplazo" USING "btree" ("cod_reemplazo");



CREATE INDEX "idx_itens_reemplazo_sp_modified" ON "public"."itens_reemplazo" USING "btree" ("sp_modified");



CREATE INDEX "idx_mcs_dept_members_dept" ON "public"."mcs_department_members" USING "btree" ("department_id");



CREATE INDEX "idx_mcs_dept_members_user" ON "public"."mcs_department_members" USING "btree" ("user_id");



CREATE INDEX "idx_mcs_entity_links_entity" ON "public"."mcs_entity_links" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_mcs_entity_links_source" ON "public"."mcs_entity_links" USING "btree" ("source_system", "source_table", "source_sp_id");



CREATE INDEX "idx_mcs_incidents_client" ON "public"."mcs_incidents" USING "btree" ("client_sp_id");



CREATE INDEX "idx_mcs_incidents_pedido" ON "public"."mcs_incidents" USING "btree" ("pedido_sp_id");



CREATE INDEX "idx_mcs_incidents_playbook" ON "public"."mcs_incidents" USING "btree" ("playbook_id");



CREATE INDEX "idx_mcs_incidents_status" ON "public"."mcs_incidents" USING "btree" ("status");



CREATE INDEX "idx_mcs_notif_unread" ON "public"."mcs_notifications" USING "btree" ("user_email") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_mcs_notif_user" ON "public"."mcs_notifications" USING "btree" ("user_email", "created_at" DESC);



CREATE INDEX "idx_mcs_playbooks_active" ON "public"."mcs_playbooks" USING "btree" ("active");



CREATE INDEX "idx_mcs_playbooks_type" ON "public"."mcs_playbooks" USING "btree" ("incident_type");



CREATE INDEX "idx_mcs_steps_playbook" ON "public"."mcs_playbook_steps" USING "btree" ("playbook_id", "step_order");



CREATE INDEX "idx_mcs_steps_template" ON "public"."mcs_playbook_steps" USING "btree" ("task_template_id");



CREATE INDEX "idx_mcs_task_templates_dept" ON "public"."mcs_task_templates" USING "btree" ("default_department_id");



CREATE INDEX "idx_mcs_tasks_assigned" ON "public"."mcs_incident_tasks" USING "btree" ("assigned_to_email");



CREATE INDEX "idx_mcs_tasks_due" ON "public"."mcs_incident_tasks" USING "btree" ("due_at");



CREATE INDEX "idx_mcs_tasks_incident" ON "public"."mcs_incident_tasks" USING "btree" ("incident_id", "step_order");



CREATE INDEX "idx_mcs_tasks_status" ON "public"."mcs_incident_tasks" USING "btree" ("status");



CREATE INDEX "idx_reubicaciones_cod_pedido" ON "public"."reubicaciones" USING "btree" ("cod_pedido");



CREATE INDEX "idx_reubicaciones_cod_reubicaciones" ON "public"."reubicaciones" USING "btree" ("cod_reubicaciones");



CREATE INDEX "idx_reubicaciones_sp_modified" ON "public"."reubicaciones" USING "btree" ("sp_modified");



CREATE INDEX "idx_worker_discounts_batch_id" ON "public"."worker_discounts" USING "btree" ("import_batch_id") WHERE ("import_batch_id" IS NOT NULL);



CREATE UNIQUE INDEX "itens_pedido_sp_id_ux" ON "public"."itens_pedido" USING "btree" ("sp_id");



CREATE INDEX "ix_cpp_codpedido" ON "public"."colaborador_por_pedido" USING "btree" ("codpedido");



CREATE INDEX "ix_cpp_idcliente" ON "public"."colaborador_por_pedido" USING "btree" ("idcliente");



CREATE INDEX "ix_cpp_idempresa" ON "public"."colaborador_por_pedido" USING "btree" ("idempresa");



CREATE INDEX "ix_cpp_sp_modified" ON "public"."colaborador_por_pedido" USING "btree" ("sp_modified");



CREATE INDEX "ix_estimaciones_sp_modified" ON "public"."estimaciones" USING "btree" ("sp_modified");



CREATE INDEX "ix_pedidos_sp_modified" ON "public"."pedidos" USING "btree" ("sp_modified");



CREATE INDEX "ix_reemplazos_codcliente" ON "public"."reemplazos" USING "btree" ("codcliente");



CREATE INDEX "ix_reemplazos_codpedido" ON "public"."reemplazos" USING "btree" ("codpedido");



CREATE INDEX "ix_reemplazos_codreemplazo" ON "public"."reemplazos" USING "btree" ("codreemplazo");



CREATE INDEX "ix_reemplazos_idcliente" ON "public"."reemplazos" USING "btree" ("idcliente");



CREATE INDEX "ix_reemplazos_idempresa" ON "public"."reemplazos" USING "btree" ("idempresa");



CREATE INDEX "ix_reemplazos_sp_modified" ON "public"."reemplazos" USING "btree" ("sp_modified");



CREATE UNIQUE INDEX "uq_mcs_incident_origin" ON "public"."mcs_incidents" USING "btree" ("origin_system", "origin_table", "origin_sp_id") WHERE (("origin_system" IS NOT NULL) AND ("origin_table" IS NOT NULL) AND ("origin_sp_id" IS NOT NULL));



CREATE UNIQUE INDEX "ux_funcion_cod_funcion" ON "public"."funcion" USING "btree" ("cod_funcion");



CREATE UNIQUE INDEX "ux_mcs_incidents_origin" ON "public"."mcs_incidents" USING "btree" ("origin_table", "origin_sp_id");



CREATE UNIQUE INDEX "ux_pedidos_sp_id" ON "public"."pedidos" USING "btree" ("sp_id");



CREATE OR REPLACE TRIGGER "trg_kanban_updates_worker_status" AFTER UPDATE OF "status" ON "core_personal"."seguridade_status" FOR EACH ROW EXECUTE FUNCTION "core_personal"."fn_kanban_updates_worker_status"();



CREATE OR REPLACE TRIGGER "trg_seguridade_status_updated_at" BEFORE UPDATE ON "core_personal"."seguridade_status" FOR EACH ROW EXECUTE FUNCTION "core_personal"."update_seguridade_status_updated_at"();



CREATE OR REPLACE TRIGGER "trg_worker_status_triggers_kanban" AFTER UPDATE OF "status_seguridad" ON "core_personal"."workers" FOR EACH ROW EXECUTE FUNCTION "core_personal"."fn_worker_status_triggers_kanban"();



CREATE OR REPLACE TRIGGER "update_worker_discounts_modtime" BEFORE UPDATE ON "core_personal"."worker_discounts" FOR EACH ROW EXECUTE FUNCTION "core_personal"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_worker_ibans_updated_at" BEFORE UPDATE ON "core_personal"."worker_ibans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "handle_updated_at_tax_rules" BEFORE UPDATE ON "public"."tax_rules" FOR EACH ROW EXECUTE FUNCTION "core_personal"."update_modified_column"();



CREATE OR REPLACE TRIGGER "handle_updated_at_worker_discounts" BEFORE UPDATE ON "public"."worker_discounts" FOR EACH ROW EXECUTE FUNCTION "core_personal"."update_modified_column"();



CREATE OR REPLACE TRIGGER "trg_clean_licencia_conducir" BEFORE INSERT OR UPDATE OF "licencia_conducir" ON "public"."colaboradores" FOR EACH ROW EXECUTE FUNCTION "public"."clean_licencia_conducir_trigger_fn"();



CREATE OR REPLACE TRIGGER "trg_clientes_updated_at" BEFORE UPDATE ON "public"."clientes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_contratados_after_insert" AFTER INSERT ON "public"."contratados" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_contratados_alta"();



CREATE OR REPLACE TRIGGER "trg_cpp_updated_at" BEFORE UPDATE ON "public"."colaborador_por_pedido" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_estimaciones_set_updated_at" BEFORE UPDATE ON "public"."estimaciones" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_reemplazados_after_insert" AFTER INSERT ON "public"."colaboradores_reemplazados" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_reemplazados_baja"();



CREATE OR REPLACE TRIGGER "trg_reemplazos_set_updated_at" BEFORE UPDATE ON "public"."reemplazos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_incident_creator" BEFORE INSERT ON "public"."mcs_incidents" FOR EACH ROW EXECUTE FUNCTION "public"."set_incident_creator"();



CREATE OR REPLACE TRIGGER "trg_sync_sharepoint_worker" AFTER INSERT OR UPDATE ON "public"."colaboradores" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_sharepoint_worker"();



ALTER TABLE ONLY "core_common"."user_memberships"
    ADD CONSTRAINT "fk_user_memberships_auth" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."holerite_eventos"
    ADD CONSTRAINT "holerite_eventos_holerite_id_fkey" FOREIGN KEY ("holerite_id") REFERENCES "core_personal"."holerites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."holerites"
    ADD CONSTRAINT "holerites_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "core_personal"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."seguridade_status"
    ADD CONSTRAINT "seguridade_status_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "core_common"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."seguridade_status"
    ADD CONSTRAINT "seguridade_status_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "core_personal"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."worker_beneficios_history"
    ADD CONSTRAINT "worker_beneficios_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "core_personal"."worker_beneficios_history"
    ADD CONSTRAINT "worker_beneficios_history_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "core_personal"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."worker_beneficios_settings"
    ADD CONSTRAINT "worker_beneficios_settings_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "core_personal"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."worker_benefit_housing"
    ADD CONSTRAINT "worker_benefit_housing_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "core_personal"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."worker_discounts"
    ADD CONSTRAINT "worker_discounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "core_personal"."worker_discounts"
    ADD CONSTRAINT "worker_discounts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "core_personal"."worker_discounts"
    ADD CONSTRAINT "worker_discounts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "core_personal"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."worker_hours"
    ADD CONSTRAINT "worker_hours_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "core_personal"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."worker_ibans"
    ADD CONSTRAINT "worker_ibans_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "core_personal"."worker_ibans"
    ADD CONSTRAINT "worker_ibans_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "core_personal"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."worker_ledger_entries"
    ADD CONSTRAINT "worker_ledger_entries_ledger_type_id_fkey" FOREIGN KEY ("ledger_type_id") REFERENCES "core_personal"."ledger_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "core_personal"."worker_ledger_entries"
    ADD CONSTRAINT "worker_ledger_entries_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "core_personal"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "core_personal"."worker_status_history"
    ADD CONSTRAINT "worker_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "core_personal"."worker_status_history"
    ADD CONSTRAINT "worker_status_history_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "core_personal"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asignaciones_grupo"
    ADD CONSTRAINT "asignaciones_grupo_coche_id_fkey" FOREIGN KEY ("coche_id") REFERENCES "public"."coches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asignaciones_ocupantes"
    ADD CONSTRAINT "asignaciones_ocupantes_asignacion_grupo_id_fkey" FOREIGN KEY ("asignacion_grupo_id") REFERENCES "public"."asignaciones_grupo"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mantenimientos"
    ADD CONSTRAINT "mantenimientos_coche_id_fkey" FOREIGN KEY ("coche_id") REFERENCES "public"."coches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mcs_comissoes_lancamentos"
    ADD CONSTRAINT "mcs_comissoes_lancamentos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."mcs_department_members"
    ADD CONSTRAINT "mcs_department_members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."mcs_departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mcs_department_members"
    ADD CONSTRAINT "mcs_department_members_empresa_contratante_id_fkey" FOREIGN KEY ("empresa_contratante_id") REFERENCES "public"."empresas"("id");



ALTER TABLE ONLY "public"."mcs_department_members"
    ADD CONSTRAINT "mcs_department_members_empresa_servicos_id_fkey" FOREIGN KEY ("empresa_servicos_id") REFERENCES "public"."empresas"("id");



ALTER TABLE ONLY "public"."mcs_department_members"
    ADD CONSTRAINT "mcs_department_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."mcs_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mcs_incident_tasks"
    ADD CONSTRAINT "mcs_incident_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."mcs_incident_tasks"
    ADD CONSTRAINT "mcs_incident_tasks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."mcs_departments"("id");



ALTER TABLE ONLY "public"."mcs_incident_tasks"
    ADD CONSTRAINT "mcs_incident_tasks_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "public"."mcs_incidents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mcs_incidents"
    ADD CONSTRAINT "mcs_incidents_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "public"."mcs_playbooks"("id");



ALTER TABLE ONLY "public"."mcs_playbook_steps"
    ADD CONSTRAINT "mcs_playbook_steps_override_department_id_fkey" FOREIGN KEY ("override_department_id") REFERENCES "public"."mcs_departments"("id");



ALTER TABLE ONLY "public"."mcs_playbook_steps"
    ADD CONSTRAINT "mcs_playbook_steps_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "public"."mcs_playbooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mcs_playbook_steps"
    ADD CONSTRAINT "mcs_playbook_steps_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "public"."mcs_task_templates"("id");



ALTER TABLE ONLY "public"."mcs_task_templates"
    ADD CONSTRAINT "mcs_task_templates_default_department_id_fkey" FOREIGN KEY ("default_department_id") REFERENCES "public"."mcs_departments"("id");



ALTER TABLE ONLY "public"."mcs_users"
    ADD CONSTRAINT "mcs_users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."mcs_departments"("id");



ALTER TABLE ONLY "public"."multas"
    ADD CONSTRAINT "multas_coche_id_fkey" FOREIGN KEY ("coche_id") REFERENCES "public"."coches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_rules"
    ADD CONSTRAINT "tax_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tax_rules"
    ADD CONSTRAINT "tax_rules_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_rules"
    ADD CONSTRAINT "tax_rules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."worker_discounts"
    ADD CONSTRAINT "worker_discounts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "core_personal"."workers"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can view all memberships in their empresa" ON "core_common"."user_memberships" FOR SELECT TO "authenticated" USING ("core_common"."is_admin_of_empresa"("empresa_id"));



CREATE POLICY "Authenticated can read empresas" ON "core_common"."empresas" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Enable read access for all users" ON "core_common"."empresas" FOR SELECT USING (true);



CREATE POLICY "Enable read access for user memberships" ON "core_common"."user_memberships" FOR SELECT USING (true);



CREATE POLICY "Users can view their own memberships" ON "core_common"."user_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "core_common"."empresas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admin and Finance can update ledger entries" ON "core_personal"."worker_ledger_entries" FOR UPDATE TO "authenticated" USING (("core_common"."has_role"("empresa_id", 'admin'::"text") OR "core_common"."has_role"("empresa_id", 'finance'::"text"))) WITH CHECK (("core_common"."has_role"("empresa_id", 'admin'::"text") OR "core_common"."has_role"("empresa_id", 'finance'::"text")));



CREATE POLICY "Admin can delete ledger entries" ON "core_personal"."worker_ledger_entries" FOR DELETE TO "authenticated" USING ("core_common"."has_role"("empresa_id", 'admin'::"text"));



CREATE POLICY "Admin can delete ledger types" ON "core_personal"."ledger_types" FOR DELETE TO "authenticated" USING ("core_common"."has_role"("empresa_id", 'admin'::"text"));



CREATE POLICY "Admin can delete workers" ON "core_personal"."workers" FOR DELETE TO "authenticated" USING ("core_common"."has_role"("empresa_id", 'admin'::"text"));



CREATE POLICY "Admin can insert ledger types" ON "core_personal"."ledger_types" FOR INSERT TO "authenticated" WITH CHECK ("core_common"."has_role"("empresa_id", 'admin'::"text"));



CREATE POLICY "Admin can update ledger types" ON "core_personal"."ledger_types" FOR UPDATE TO "authenticated" USING ("core_common"."has_role"("empresa_id", 'admin'::"text")) WITH CHECK ("core_common"."has_role"("empresa_id", 'admin'::"text"));



CREATE POLICY "Admin, Finance and RH can insert ledger entries" ON "core_personal"."worker_ledger_entries" FOR INSERT TO "authenticated" WITH CHECK (("core_common"."has_role"("empresa_id", 'admin'::"text") OR "core_common"."has_role"("empresa_id", 'finance'::"text") OR "core_common"."has_role"("empresa_id", 'rh'::"text")));



CREATE POLICY "Admin, Finance and RH can view ledger entries" ON "core_personal"."worker_ledger_entries" FOR SELECT TO "authenticated" USING (("core_common"."has_role"("empresa_id", 'admin'::"text") OR "core_common"."has_role"("empresa_id", 'finance'::"text") OR "core_common"."has_role"("empresa_id", 'rh'::"text")));



CREATE POLICY "Admin, RH and Finance can view benefit housing" ON "core_personal"."worker_benefit_housing" FOR SELECT TO "authenticated" USING (("core_common"."has_role"("empresa_id", 'admin'::"text") OR "core_common"."has_role"("empresa_id", 'rh'::"text") OR "core_common"."has_role"("empresa_id", 'finance'::"text")));



CREATE POLICY "Admins and HR can manage seguridade status" ON "core_personal"."seguridade_status" USING (("core_common"."has_role"("empresa_id", 'admin'::"text") OR "core_common"."has_role"("empresa_id", 'rh'::"text") OR "core_common"."has_role"("empresa_id", 'commercial'::"text")));



CREATE POLICY "Allow anon delete" ON "core_personal"."worker_hours" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Allow anon insert" ON "core_personal"."worker_hours" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow anon select" ON "core_personal"."worker_hours" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anon update" ON "core_personal"."worker_hours" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow auth delete" ON "core_personal"."worker_hours" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow auth insert" ON "core_personal"."worker_hours" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow auth select" ON "core_personal"."worker_hours" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow auth update" ON "core_personal"."worker_hours" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Discounts are deletable by authenticated users" ON "core_personal"."worker_discounts" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Discounts are insertable by authenticated users" ON "core_personal"."worker_discounts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Discounts are updatable by authenticated users" ON "core_personal"."worker_discounts" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Discounts are viewable by authenticated users" ON "core_personal"."worker_discounts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable ALL for authenticated admins on benefit_categories" ON "core_personal"."benefit_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin_rh'::"public"."app_role", 'operador'::"public"."app_role"]))))));



CREATE POLICY "Enable ALL for authenticated admins on discount_categories" ON "core_personal"."discount_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin_rh'::"public"."app_role", 'operador'::"public"."app_role"]))))));



CREATE POLICY "Enable ALL for authenticated admins on holerite_eventos" ON "core_personal"."holerite_eventos" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin_rh'::"public"."app_role", 'operador'::"public"."app_role"]))))));



CREATE POLICY "Enable ALL for authenticated admins on holerites" ON "core_personal"."holerites" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin_rh'::"public"."app_role", 'operador'::"public"."app_role"]))))));



CREATE POLICY "Enable ALL for authenticated admins on worker_beneficios_histor" ON "core_personal"."worker_beneficios_history" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin_rh'::"public"."app_role", 'operador'::"public"."app_role"]))))));



CREATE POLICY "Enable ALL for authenticated admins on worker_beneficios_settin" ON "core_personal"."worker_beneficios_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin_rh'::"public"."app_role", 'operador'::"public"."app_role"]))))));



CREATE POLICY "Enable INSERT for admins and rh" ON "core_personal"."worker_status_history" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin_rh'::"public"."app_role", 'operador'::"public"."app_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("core_personal"."workers" "w"
     JOIN "core_common"."user_memberships" "um" ON ((("um"."user_id" = "auth"."uid"()) AND ("um"."empresa_id" = "w"."empresa_id"))))
  WHERE (("w"."id" = "worker_status_history"."worker_id") AND ("um"."role" = ANY (ARRAY['admin'::"text", 'rh'::"text"])))))));



CREATE POLICY "Enable SELECT for authenticated users" ON "core_personal"."worker_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("core_personal"."workers" "w"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "auth"."uid"())))
     LEFT JOIN "core_common"."user_memberships" "um" ON ((("um"."user_id" = "auth"."uid"()) AND ("um"."empresa_id" = "w"."empresa_id"))))
  WHERE (("w"."id" = "worker_status_history"."worker_id") AND (("ur"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin_rh'::"public"."app_role"])) OR ("um"."role" = ANY (ARRAY['admin'::"text", 'rh'::"text", 'finance'::"text", 'commercial'::"text", 'user'::"text"])))))));



CREATE POLICY "Enable delete access for admins" ON "core_personal"."worker_ibans" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "core_personal"."workers" "w"
  WHERE (("w"."id" = "worker_ibans"."worker_id") AND "core_common"."has_role"("w"."empresa_id", 'admin'::"text")))));



CREATE POLICY "Enable insert access for all members" ON "core_personal"."worker_ibans" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "core_personal"."workers" "w"
  WHERE (("w"."id" = "worker_ibans"."worker_id") AND "core_common"."is_member"("w"."empresa_id")))));



CREATE POLICY "Enable insert access for all members" ON "core_personal"."workers" FOR INSERT WITH CHECK ("core_common"."is_member"("empresa_id"));



CREATE POLICY "Enable read access for all members" ON "core_personal"."worker_ibans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "core_personal"."workers" "w"
  WHERE (("w"."id" = "worker_ibans"."worker_id") AND "core_common"."is_member"("w"."empresa_id")))));



CREATE POLICY "Enable read access for all workers" ON "core_personal"."workers" FOR SELECT USING (true);



CREATE POLICY "Enable update access for all members" ON "core_personal"."worker_ibans" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "core_personal"."workers" "w"
  WHERE (("w"."id" = "worker_ibans"."worker_id") AND "core_common"."is_member"("w"."empresa_id")))));



CREATE POLICY "Enable update access for all members" ON "core_personal"."workers" FOR UPDATE USING ("core_common"."is_member"("empresa_id"));



CREATE POLICY "Members can delete benefit housing" ON "core_personal"."worker_benefit_housing" FOR DELETE TO "authenticated" USING ("core_common"."is_member"("empresa_id"));



CREATE POLICY "Members can insert benefit housing" ON "core_personal"."worker_benefit_housing" FOR INSERT TO "authenticated" WITH CHECK ("core_common"."is_member"("empresa_id"));



CREATE POLICY "Members can update benefit housing" ON "core_personal"."worker_benefit_housing" FOR UPDATE TO "authenticated" USING ("core_common"."is_member"("empresa_id"));



CREATE POLICY "Members can view ledger types" ON "core_personal"."ledger_types" FOR SELECT TO "authenticated" USING ("core_common"."is_member"("empresa_id"));



CREATE POLICY "Members can view workers" ON "core_personal"."workers" FOR SELECT TO "authenticated" USING ("core_common"."is_member"("empresa_id"));



CREATE POLICY "Users can view seguridade status of their empresa" ON "core_personal"."seguridade_status" FOR SELECT USING ("core_common"."is_member"("empresa_id"));



ALTER TABLE "core_personal"."benefit_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "core_personal"."discount_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "core_personal"."holerite_eventos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "holerite_eventos_all_authenticated" ON "core_personal"."holerite_eventos" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "core_personal"."holerites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "holerites_all_authenticated" ON "core_personal"."holerites" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "core_personal"."ledger_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "core_personal"."seguridade_status" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "worker_beneficios_all_admins" ON "core_personal"."worker_beneficios_settings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin_rh'::"public"."app_role", 'operador'::"public"."app_role"]))))));



ALTER TABLE "core_personal"."worker_beneficios_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "worker_beneficios_select_all" ON "core_personal"."worker_beneficios_settings" FOR SELECT USING (true);



ALTER TABLE "core_personal"."worker_beneficios_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "core_personal"."worker_benefit_housing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "core_personal"."worker_discounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "core_personal"."worker_hours" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "core_personal"."worker_ibans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "core_personal"."worker_ledger_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "core_personal"."worker_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "core_personal"."workers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Acesso total colaboradores" ON "public"."colaboradores" USING (true) WITH CHECK (true);



CREATE POLICY "Acesso total sync_state" ON "public"."sync_state" USING (true) WITH CHECK (true);



CREATE POLICY "Admins can view all users" ON "public"."mcs_users" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins have full access to comissoes_lancamentos" ON "public"."mcs_comissoes_lancamentos" USING ("public"."is_admin"());



CREATE POLICY "Admins have full access to comissoes_settings" ON "public"."mcs_comissoes_settings" USING ("public"."is_admin"());



CREATE POLICY "Admins have full access to incidents" ON "public"."mcs_incidents" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Admins have full access to tasks" ON "public"."mcs_incident_tasks" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Enable ALL for authenticated users on tax_rules" ON "public"."tax_rules" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable ALL for authenticated users on worker_discounts" ON "public"."worker_discounts" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Everyone can read comissoes_settings" ON "public"."mcs_comissoes_settings" FOR SELECT USING (true);



CREATE POLICY "Sellers can view own lancamentos" ON "public"."mcs_comissoes_lancamentos" FOR SELECT USING (("vendedor_email" = "auth"."email"()));



CREATE POLICY "Super admins can delete roles" ON "public"."user_roles" FOR DELETE TO "authenticated" USING (("public"."get_my_role"() = 'super_admin'::"public"."app_role"));



CREATE POLICY "Super admins can insert roles" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_role"() = 'super_admin'::"public"."app_role"));



CREATE POLICY "Super admins can update roles" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING (("public"."get_my_role"() = 'super_admin'::"public"."app_role"));



CREATE POLICY "Super admins can view all roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("public"."get_my_role"() = 'super_admin'::"public"."app_role"));



CREATE POLICY "Users can create incidents" ON "public"."mcs_incidents" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can insert tasks" ON "public"."mcs_incident_tasks" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can update own or Dept incidents" ON "public"."mcs_incidents" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))) OR ("created_by_email" = "auth"."email"()) OR (EXISTS ( SELECT 1
   FROM (("public"."mcs_incident_tasks" "t"
     LEFT JOIN "public"."mcs_departments" "d" ON (("t"."department_id" = "d"."id")))
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("t"."incident_id" = "mcs_incidents"."id") AND ("d"."name" = "p"."department"))))));



CREATE POLICY "Users can update own profile" ON "public"."mcs_users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update relevant tasks" ON "public"."mcs_incident_tasks" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))) OR ("assigned_to_email" = "auth"."email"()) OR (EXISTS ( SELECT 1
   FROM ("public"."mcs_departments" "d"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("mcs_incident_tasks"."department_id" = "d"."id") AND ("d"."name" = "p"."department"))))));



CREATE POLICY "Users can view own profile" ON "public"."mcs_users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own role" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users view relevant incidents" ON "public"."mcs_incidents" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))) OR ("created_by_email" = "auth"."email"()) OR (EXISTS ( SELECT 1
   FROM (("public"."mcs_incident_tasks" "t"
     LEFT JOIN "public"."mcs_departments" "d" ON (("t"."department_id" = "d"."id")))
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("t"."incident_id" = "mcs_incidents"."id") AND (("t"."assigned_to_email" = "p"."email") OR ("d"."name" = "p"."department")))))));



CREATE POLICY "Users view relevant tasks" ON "public"."mcs_incident_tasks" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))) OR ("assigned_to_email" = "auth"."email"()) OR (EXISTS ( SELECT 1
   FROM ("public"."mcs_departments" "d"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("mcs_incident_tasks"."department_id" = "d"."id") AND ("d"."name" = "p"."department"))))));



ALTER TABLE "public"."colaboradores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mcs_comissoes_lancamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mcs_comissoes_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mcs_incident_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mcs_incidents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mcs_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."worker_discounts" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "core_common" TO "authenticator";
GRANT USAGE ON SCHEMA "core_common" TO "anon";
GRANT USAGE ON SCHEMA "core_common" TO "authenticated";
GRANT USAGE ON SCHEMA "core_common" TO "service_role";



GRANT USAGE ON SCHEMA "core_personal" TO "authenticator";
GRANT USAGE ON SCHEMA "core_personal" TO "anon";
GRANT USAGE ON SCHEMA "core_personal" TO "authenticated";
GRANT USAGE ON SCHEMA "core_personal" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "authenticator";



GRANT ALL ON FUNCTION "core_common"."has_role"("p_empresa_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "core_common"."has_role"("p_empresa_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "core_common"."has_role"("p_empresa_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "core_common"."is_admin_of_empresa"("check_empresa_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "core_common"."is_admin_of_empresa"("check_empresa_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "core_common"."is_admin_of_empresa"("check_empresa_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "core_common"."is_member"("p_empresa_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "core_common"."is_member"("p_empresa_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "core_common"."is_member"("p_empresa_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."fn_get_active_client_for_worker"("p_cod_colab" "text") TO "anon";
GRANT ALL ON FUNCTION "core_personal"."fn_get_active_client_for_worker"("p_cod_colab" "text") TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."fn_get_active_client_for_worker"("p_cod_colab" "text") TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."fn_get_active_client_for_worker_json"("p_cod_colab" "text") TO "anon";
GRANT ALL ON FUNCTION "core_personal"."fn_get_active_client_for_worker_json"("p_cod_colab" "text") TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."fn_get_active_client_for_worker_json"("p_cod_colab" "text") TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."fn_import_ibans_batch"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "core_personal"."fn_import_ibans_batch"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."fn_import_ibans_batch"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."fn_kanban_updates_worker_status"() TO "anon";
GRANT ALL ON FUNCTION "core_personal"."fn_kanban_updates_worker_status"() TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."fn_kanban_updates_worker_status"() TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."fn_worker_status_triggers_kanban"() TO "anon";
GRANT ALL ON FUNCTION "core_personal"."fn_worker_status_triggers_kanban"() TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."fn_worker_status_triggers_kanban"() TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."get_client_worker_kpis"("p_empresa_id" "uuid", "p_cliente_nombre" "text") TO "anon";
GRANT ALL ON FUNCTION "core_personal"."get_client_worker_kpis"("p_empresa_id" "uuid", "p_cliente_nombre" "text") TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."get_client_worker_kpis"("p_empresa_id" "uuid", "p_cliente_nombre" "text") TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."get_client_worker_kpis"("p_empresa_id" "uuid", "p_search" "text", "p_cliente_nombre" "text"[], "p_contratante" "text", "p_funcion" "text") TO "anon";
GRANT ALL ON FUNCTION "core_personal"."get_client_worker_kpis"("p_empresa_id" "uuid", "p_search" "text", "p_cliente_nombre" "text"[], "p_contratante" "text", "p_funcion" "text") TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."get_client_worker_kpis"("p_empresa_id" "uuid", "p_search" "text", "p_cliente_nombre" "text"[], "p_contratante" "text", "p_funcion" "text") TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."get_global_movement_history"() TO "anon";
GRANT ALL ON FUNCTION "core_personal"."get_global_movement_history"() TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."get_global_movement_history"() TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."get_global_movement_history"("p_empresa_id" "uuid", "p_cliente_nome" "text", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "core_personal"."get_global_movement_history"("p_empresa_id" "uuid", "p_cliente_nome" "text", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."get_global_movement_history"("p_empresa_id" "uuid", "p_cliente_nome" "text", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."get_hours_control_workers"("p_empresa_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_contratante" "text", "p_cliente_nombre" "text") TO "anon";
GRANT ALL ON FUNCTION "core_personal"."get_hours_control_workers"("p_empresa_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_contratante" "text", "p_cliente_nombre" "text") TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."get_hours_control_workers"("p_empresa_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_contratante" "text", "p_cliente_nombre" "text") TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."get_real_seguridade_status"("p_empresa_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "core_personal"."get_real_seguridade_status"("p_empresa_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."get_real_seguridade_status"("p_empresa_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."search_workers"("p_empresa_id" "uuid", "p_search" "text", "p_cliente_nombre" "text"[], "p_status_trabajador_filter" "text"[], "p_status_seguridad_filter" "text"[], "p_contratante" "text", "p_funcion" "text", "p_sort_column" "text", "p_sort_direction" "text", "p_page" integer, "p_page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "core_personal"."search_workers"("p_empresa_id" "uuid", "p_search" "text", "p_cliente_nombre" "text"[], "p_status_trabajador_filter" "text"[], "p_status_seguridad_filter" "text"[], "p_contratante" "text", "p_funcion" "text", "p_sort_column" "text", "p_sort_direction" "text", "p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."search_workers"("p_empresa_id" "uuid", "p_search" "text", "p_cliente_nombre" "text"[], "p_status_trabajador_filter" "text"[], "p_status_seguridad_filter" "text"[], "p_contratante" "text", "p_funcion" "text", "p_sort_column" "text", "p_sort_direction" "text", "p_page" integer, "p_page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "core_personal"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "core_personal"."update_seguridade_status_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "core_personal"."update_seguridade_status_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "core_personal"."update_seguridade_status_updated_at"() TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."clean_licencia_conducir_trigger_fn"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_licencia_conducir_trigger_fn"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_licencia_conducir_trigger_fn"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_active_client_for_worker"("p_cod_colab" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_active_client_for_worker"("p_cod_colab" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_active_client_for_worker"("p_cod_colab" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_active_client_for_worker_json"("p_cod_colab" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_active_client_for_worker_json"("p_cod_colab" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_active_client_for_worker_json"("p_cod_colab" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_import_ibans_batch"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_import_ibans_batch"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_import_ibans_batch"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_sharepoint_worker"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_sharepoint_worker"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_sharepoint_worker"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sys_execute_sql"("q" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sys_execute_sql"("q" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sys_execute_sql"("q" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unique_clients"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_unique_clients"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unique_clients"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unique_contratantes"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_unique_contratantes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unique_contratantes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unique_funciones"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_unique_funciones"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unique_funciones"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mcs_create_incident_from_reemplazo"("p_reemplazo_sp_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."mcs_create_incident_from_reemplazo"("p_reemplazo_sp_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mcs_create_incident_from_reemplazo"("p_reemplazo_sp_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_incident_creator"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_incident_creator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_incident_creator"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_sync_state"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_sync_state"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_sync_state"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_contratados_alta"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_contratados_alta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_contratados_alta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_reemplazados_baja"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_reemplazados_baja"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_reemplazados_baja"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_role"("target_user_id" "uuid", "new_role" "text", "new_managed_departments" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_role"("target_user_id" "uuid", "new_role" "text", "new_managed_departments" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_role"("target_user_id" "uuid", "new_role" "text", "new_managed_departments" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_access_to_incident"("p_incident_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_access_to_incident"("p_incident_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_access_to_incident"("p_incident_id" "uuid") TO "service_role";












GRANT SELECT ON TABLE "core_common"."empresas" TO "authenticator";
GRANT ALL ON TABLE "core_common"."empresas" TO "anon";
GRANT ALL ON TABLE "core_common"."empresas" TO "authenticated";
GRANT ALL ON TABLE "core_common"."empresas" TO "service_role";



GRANT SELECT ON TABLE "core_common"."user_memberships" TO "authenticator";
GRANT ALL ON TABLE "core_common"."user_memberships" TO "anon";
GRANT ALL ON TABLE "core_common"."user_memberships" TO "authenticated";
GRANT ALL ON TABLE "core_common"."user_memberships" TO "service_role";



GRANT ALL ON TABLE "core_personal"."benefit_categories" TO "anon";
GRANT ALL ON TABLE "core_personal"."benefit_categories" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."benefit_categories" TO "service_role";



GRANT ALL ON TABLE "core_personal"."discount_categories" TO "anon";
GRANT ALL ON TABLE "core_personal"."discount_categories" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."discount_categories" TO "service_role";



GRANT ALL ON TABLE "core_personal"."holerite_eventos" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."holerite_eventos" TO "anon";
GRANT ALL ON TABLE "core_personal"."holerite_eventos" TO "service_role";



GRANT ALL ON TABLE "core_personal"."holerites" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."holerites" TO "anon";
GRANT ALL ON TABLE "core_personal"."holerites" TO "service_role";



GRANT SELECT ON TABLE "core_personal"."ledger_types" TO "authenticator";
GRANT ALL ON TABLE "core_personal"."ledger_types" TO "anon";
GRANT ALL ON TABLE "core_personal"."ledger_types" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."ledger_types" TO "service_role";



GRANT ALL ON TABLE "core_personal"."seguridade_status" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."seguridade_status" TO "service_role";
GRANT ALL ON TABLE "core_personal"."seguridade_status" TO "anon";



GRANT SELECT ON TABLE "core_personal"."workers" TO "authenticator";
GRANT ALL ON TABLE "core_personal"."workers" TO "anon";
GRANT ALL ON TABLE "core_personal"."workers" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."workers" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."contratados" TO "anon";
GRANT ALL ON TABLE "public"."contratados" TO "authenticated";
GRANT ALL ON TABLE "public"."contratados" TO "service_role";



GRANT ALL ON TABLE "public"."pedidos" TO "anon";
GRANT ALL ON TABLE "public"."pedidos" TO "authenticated";
GRANT ALL ON TABLE "public"."pedidos" TO "service_role";



GRANT ALL ON TABLE "public"."reemplazos" TO "anon";
GRANT ALL ON TABLE "public"."reemplazos" TO "authenticated";
GRANT ALL ON TABLE "public"."reemplazos" TO "service_role";



GRANT ALL ON TABLE "core_personal"."worker_alocacoes_history" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."worker_alocacoes_history" TO "service_role";
GRANT ALL ON TABLE "core_personal"."worker_alocacoes_history" TO "anon";



GRANT ALL ON TABLE "core_personal"."worker_beneficios_history" TO "anon";
GRANT ALL ON TABLE "core_personal"."worker_beneficios_history" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."worker_beneficios_history" TO "service_role";



GRANT ALL ON TABLE "core_personal"."worker_beneficios_settings" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."worker_beneficios_settings" TO "anon";
GRANT ALL ON TABLE "core_personal"."worker_beneficios_settings" TO "service_role";



GRANT SELECT ON TABLE "core_personal"."worker_benefit_housing" TO "authenticator";
GRANT ALL ON TABLE "core_personal"."worker_benefit_housing" TO "anon";
GRANT ALL ON TABLE "core_personal"."worker_benefit_housing" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."worker_benefit_housing" TO "service_role";



GRANT ALL ON TABLE "core_personal"."worker_discounts" TO "anon";
GRANT ALL ON TABLE "core_personal"."worker_discounts" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."worker_discounts" TO "service_role";



GRANT ALL ON TABLE "core_personal"."worker_hours" TO "anon";
GRANT ALL ON TABLE "core_personal"."worker_hours" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."worker_hours" TO "service_role";



GRANT ALL ON TABLE "core_personal"."worker_ibans" TO "anon";
GRANT ALL ON TABLE "core_personal"."worker_ibans" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."worker_ibans" TO "service_role";



GRANT SELECT ON TABLE "core_personal"."worker_ledger_entries" TO "authenticator";
GRANT ALL ON TABLE "core_personal"."worker_ledger_entries" TO "anon";
GRANT ALL ON TABLE "core_personal"."worker_ledger_entries" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."worker_ledger_entries" TO "service_role";



GRANT ALL ON TABLE "core_personal"."worker_status_history" TO "anon";
GRANT ALL ON TABLE "core_personal"."worker_status_history" TO "authenticated";
GRANT ALL ON TABLE "core_personal"."worker_status_history" TO "service_role";









GRANT ALL ON TABLE "public"."asignaciones_grupo" TO "anon";
GRANT ALL ON TABLE "public"."asignaciones_grupo" TO "authenticated";
GRANT ALL ON TABLE "public"."asignaciones_grupo" TO "service_role";



GRANT ALL ON TABLE "public"."asignaciones_ocupantes" TO "anon";
GRANT ALL ON TABLE "public"."asignaciones_ocupantes" TO "authenticated";
GRANT ALL ON TABLE "public"."asignaciones_ocupantes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clientes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clientes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clientes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."coches" TO "anon";
GRANT ALL ON TABLE "public"."coches" TO "authenticated";
GRANT ALL ON TABLE "public"."coches" TO "service_role";



GRANT ALL ON TABLE "public"."colaborador_por_pedido" TO "anon";
GRANT ALL ON TABLE "public"."colaborador_por_pedido" TO "authenticated";
GRANT ALL ON TABLE "public"."colaborador_por_pedido" TO "service_role";



GRANT ALL ON SEQUENCE "public"."colaborador_por_pedido_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."colaborador_por_pedido_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."colaborador_por_pedido_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."colaboradores" TO "anon";
GRANT ALL ON TABLE "public"."colaboradores" TO "authenticated";
GRANT ALL ON TABLE "public"."colaboradores" TO "service_role";



GRANT ALL ON SEQUENCE "public"."colaboradores_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."colaboradores_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."colaboradores_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."colaboradores_reemplazados" TO "anon";
GRANT ALL ON TABLE "public"."colaboradores_reemplazados" TO "authenticated";
GRANT ALL ON TABLE "public"."colaboradores_reemplazados" TO "service_role";



GRANT ALL ON SEQUENCE "public"."colaboradores_reemplazados_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."colaboradores_reemplazados_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."colaboradores_reemplazados_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."colaboradores_reubicados" TO "anon";
GRANT ALL ON TABLE "public"."colaboradores_reubicados" TO "authenticated";
GRANT ALL ON TABLE "public"."colaboradores_reubicados" TO "service_role";



GRANT ALL ON SEQUENCE "public"."colaboradores_reubicados_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."colaboradores_reubicados_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."colaboradores_reubicados_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contas_receber" TO "anon";
GRANT ALL ON TABLE "public"."contas_receber" TO "authenticated";
GRANT ALL ON TABLE "public"."contas_receber" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contas_receber_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contas_receber_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contas_receber_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contratados_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contratados_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contratados_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."empresas" TO "anon";
GRANT ALL ON TABLE "public"."empresas" TO "authenticated";
GRANT ALL ON TABLE "public"."empresas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."empresas_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."empresas_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."empresas_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."estimaciones" TO "anon";
GRANT ALL ON TABLE "public"."estimaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."estimaciones" TO "service_role";



GRANT ALL ON SEQUENCE "public"."estimaciones_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."estimaciones_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."estimaciones_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."funcion" TO "anon";
GRANT ALL ON TABLE "public"."funcion" TO "authenticated";
GRANT ALL ON TABLE "public"."funcion" TO "service_role";



GRANT ALL ON SEQUENCE "public"."funcion_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."funcion_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."funcion_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."itens_pedido" TO "anon";
GRANT ALL ON TABLE "public"."itens_pedido" TO "authenticated";
GRANT ALL ON TABLE "public"."itens_pedido" TO "service_role";



GRANT ALL ON SEQUENCE "public"."itens_pedido_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."itens_pedido_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."itens_pedido_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."itens_reemplazo" TO "anon";
GRANT ALL ON TABLE "public"."itens_reemplazo" TO "authenticated";
GRANT ALL ON TABLE "public"."itens_reemplazo" TO "service_role";



GRANT ALL ON SEQUENCE "public"."itens_reemplazo_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."itens_reemplazo_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."itens_reemplazo_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mantenimientos" TO "anon";
GRANT ALL ON TABLE "public"."mantenimientos" TO "authenticated";
GRANT ALL ON TABLE "public"."mantenimientos" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_comissoes_lancamentos" TO "anon";
GRANT ALL ON TABLE "public"."mcs_comissoes_lancamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_comissoes_lancamentos" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_comissoes_settings" TO "anon";
GRANT ALL ON TABLE "public"."mcs_comissoes_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_comissoes_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mcs_comissoes_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mcs_comissoes_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mcs_comissoes_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_department_members" TO "anon";
GRANT ALL ON TABLE "public"."mcs_department_members" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_department_members" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_departments" TO "anon";
GRANT ALL ON TABLE "public"."mcs_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_departments" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_entity_links" TO "anon";
GRANT ALL ON TABLE "public"."mcs_entity_links" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_entity_links" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_incident_tasks" TO "anon";
GRANT ALL ON TABLE "public"."mcs_incident_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_incident_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_incidents" TO "anon";
GRANT ALL ON TABLE "public"."mcs_incidents" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_incidents" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_notifications" TO "anon";
GRANT ALL ON TABLE "public"."mcs_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_playbook_steps" TO "anon";
GRANT ALL ON TABLE "public"."mcs_playbook_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_playbook_steps" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_playbooks" TO "anon";
GRANT ALL ON TABLE "public"."mcs_playbooks" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_playbooks" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_task_templates" TO "anon";
GRANT ALL ON TABLE "public"."mcs_task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_task_templates" TO "service_role";



GRANT ALL ON TABLE "public"."mcs_users" TO "anon";
GRANT ALL ON TABLE "public"."mcs_users" TO "authenticated";
GRANT ALL ON TABLE "public"."mcs_users" TO "service_role";



GRANT ALL ON TABLE "public"."multas" TO "anon";
GRANT ALL ON TABLE "public"."multas" TO "authenticated";
GRANT ALL ON TABLE "public"."multas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pedidos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pedidos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pedidos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reemplazos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reemplazos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reemplazos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reubicaciones" TO "anon";
GRANT ALL ON TABLE "public"."reubicaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."reubicaciones" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reubicaciones_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reubicaciones_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reubicaciones_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sync_state" TO "anon";
GRANT ALL ON TABLE "public"."sync_state" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_state" TO "service_role";



GRANT ALL ON TABLE "public"."tax_rules" TO "anon";
GRANT ALL ON TABLE "public"."tax_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_rules" TO "service_role";



GRANT ALL ON TABLE "public"."trabajadores" TO "anon";
GRANT ALL ON TABLE "public"."trabajadores" TO "authenticated";
GRANT ALL ON TABLE "public"."trabajadores" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."vw_comissoes_geradas" TO "anon";
GRANT ALL ON TABLE "public"."vw_comissoes_geradas" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_comissoes_geradas" TO "service_role";



GRANT ALL ON TABLE "public"."vw_mcs_servicos_unificados" TO "anon";
GRANT ALL ON TABLE "public"."vw_mcs_servicos_unificados" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_mcs_servicos_unificados" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reemplazos_context" TO "anon";
GRANT ALL ON TABLE "public"."vw_reemplazos_context" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reemplazos_context" TO "service_role";



GRANT ALL ON TABLE "public"."worker_discounts" TO "anon";
GRANT ALL ON TABLE "public"."worker_discounts" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_discounts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_common" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_common" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_common" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_common" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_common" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_common" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_common" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_common" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_common" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_personal" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_personal" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_personal" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_personal" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_personal" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_personal" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_personal" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_personal" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "core_personal" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































