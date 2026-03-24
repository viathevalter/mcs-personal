const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    // 1. Corrigindo get_hours_control_workers
    await prodClient.query(`
    CREATE OR REPLACE FUNCTION core_personal.get_hours_control_workers(p_empresa_id uuid, p_period_year integer, p_period_month integer, p_contratante text DEFAULT NULL::text, p_cliente_nombre text DEFAULT NULL::text)
    RETURNS TABLE(total_count bigint, id uuid, empresa_id uuid, cod_colab text, nome text, email text, movil text, niss text, nif text, nie text, dni text, pasaporte text, status_seguridad text, status_trabajador text, contratante text, funcion text, cliente_nombre text, data_baixa date, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $function$
    DECLARE
    v_start_date date := make_date(p_period_year, p_period_month, 1);
    v_end_date date := (v_start_date + interval '1 month' - interval '1 day')::date;
    BEGIN
    RETURN QUERY
    WITH base_workers AS (
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
        w.contratante,
        w.funcion,
        COALESCE(w.cliente, 'NÃO DEFINIDO') AS cliente_nombre,
        w.data_baixa,
        w.created_at
        FROM core_personal.workers w
        WHERE w.empresa_id = p_empresa_id
        AND (
            (w.status_trabajador ILIKE 'Ativo' OR w.status_trabajador ILIKE 'Activo')
            OR
            ((w.status_trabajador ILIKE 'Inativo' OR w.status_trabajador ILIKE 'Desligado') AND w.data_baixa >= v_start_date)
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
    `);

    // 2. Corrigindo o search_workers (Adicionando em_regularizacao)
    await prodClient.query(`
    CREATE OR REPLACE FUNCTION core_personal.search_workers(
        p_empresa_id uuid,
        p_search_query text DEFAULT NULL::text,
        p_status_trabajador_filter text[] DEFAULT NULL::text[],
        p_status_seguridad_filter text[] DEFAULT NULL::text[],
        p_cliente_nombre_filter text[] DEFAULT NULL::text[],
        p_funcion_filter text[] DEFAULT NULL::text[],
        p_contratante_filter text[] DEFAULT NULL::text[],
        p_sort_column text DEFAULT 'nome'::text,
        p_sort_direction text DEFAULT 'asc'::text,
        p_page_size integer DEFAULT 20,
        p_page_number integer DEFAULT 1
    )
    RETURNS TABLE(total_count bigint, id uuid, empresa_id uuid, cod_colab text, nome text, email text, movil text, niss text, nif text, nie text, dni text, pasaporte text, status_seguridad text, status_trabajador text, observacoes text, data_nascimento date, data_alta date, data_baixa date, data_vencimento_doc text, selected_profile text, auth_user_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, is_archived boolean, docs_portugal jsonb, docs_espanha jsonb, local_nascimento text, morada text, codigo_postal text, cidade text, pais text, iban text, numero_conta text, banco text, swift_bic text, cliente text, funcion text, contratante text)
    LANGUAGE plpgsql
    AS $function$
    DECLARE
        v_offset integer;
    BEGIN
        v_offset := (p_page_number - 1) * p_page_size;

        RETURN QUERY
        WITH filtered_workers AS (
            SELECT w.*
            FROM core_personal.workers w
            WHERE w.empresa_id = p_empresa_id
                AND (p_search_query IS NULL OR p_search_query = '' OR (
                    w.nome ILIKE '%' || p_search_query || '%' OR
                    w.cod_colab ILIKE '%' || p_search_query || '%' OR
                    w.niss ILIKE '%' || p_search_query || '%' OR
                    w.pasaporte ILIKE '%' || p_search_query || '%' OR
                    w.nif ILIKE '%' || p_search_query || '%' OR
                    w.nie ILIKE '%' || p_search_query || '%' OR
                    w.dni ILIKE '%' || p_search_query || '%'
                ))
                AND (p_status_trabajador_filter IS NULL OR array_length(p_status_trabajador_filter, 1) IS NULL OR (
                    EXISTS (
                        SELECT 1 FROM unnest(p_status_trabajador_filter) AS sf
                        WHERE (sf = 'ativos' AND (w.status_trabajador ILIKE 'Ativo' OR w.status_trabajador ILIKE 'Activo')) OR
                              (sf = 'inativos' AND (w.status_trabajador ILIKE 'Inativo' OR w.status_trabajador ILIKE 'Desligado')) OR
                              (sf = 'pendentes_ingreso' AND (w.status_trabajador ILIKE 'Pendente Ingresso' OR w.status_trabajador ILIKE 'Pendiente Ingreso'))
                    )
                ))
                AND (p_status_seguridad_filter IS NULL OR array_length(p_status_seguridad_filter, 1) IS NULL OR (
                    EXISTS (
                        SELECT 1 FROM unnest(p_status_seguridad_filter) AS sf
                        WHERE (sf = 'alta' AND w.status_seguridad ILIKE 'Alta') OR
                              (sf = 'pendentes_alta' AND (w.status_seguridad ILIKE 'Pendente Alta' OR w.status_seguridad ILIKE 'Pendiente Alta')) OR
                              (sf = 'baixa' AND (w.status_seguridad ILIKE 'Baixa' OR w.status_seguridad ILIKE 'Baja' OR w.status_seguridad ILIKE 'Anulado')) OR
                              (sf = 'pendentes_baixa' AND (w.status_seguridad ILIKE 'Pendente Baixa' OR w.status_seguridad ILIKE 'Pendiente Baja')) OR
                              (sf = 'em_regularizacao' AND (w.status_seguridad ILIKE 'Em Regularização' OR w.status_seguridad ILIKE 'Em Regularizacion' OR w.status_seguridad ILIKE 'En Regularización' OR w.status_seguridad ILIKE 'En Regularizacion'))
                    )
                ))
                AND (p_cliente_nombre_filter IS NULL OR array_length(p_cliente_nombre_filter, 1) IS NULL OR w.cliente = ANY(p_cliente_nombre_filter))
                AND (p_funcion_filter IS NULL OR array_length(p_funcion_filter, 1) IS NULL OR w.funcion = ANY(p_funcion_filter))
                AND (p_contratante_filter IS NULL OR array_length(p_contratante_filter, 1) IS NULL OR w.contratante = ANY(p_contratante_filter))
        ),
        total AS (
            SELECT COUNT(*) AS exact_count FROM filtered_workers
        )
        SELECT 
            (SELECT exact_count FROM total) AS total_count_col,
            fw.id, fw.empresa_id, fw.cod_colab, fw.nome, fw.email, fw.movil, fw.niss, fw.nif, fw.nie, fw.dni, fw.pasaporte, fw.status_seguridad, fw.status_trabajador, fw.observacoes, fw.data_nascimento, fw.data_alta, fw.data_baixa, fw.data_vencimento_doc, fw.selected_profile, fw.auth_user_id, fw.created_at, fw.updated_at, fw.is_archived, fw.docs_portugal, fw.docs_espanha, fw.local_nascimento, fw.morada, fw.codigo_postal, fw.cidade, fw.pais, fw.iban, fw.numero_conta, fw.banco, fw.swift_bic, fw.cliente, fw.funcion, fw.contratante
        FROM filtered_workers fw
        ORDER BY
            CASE WHEN p_sort_direction = 'asc' THEN
                CASE
                    WHEN p_sort_column = 'nome' THEN fw.nome
                    WHEN p_sort_column = 'cod_colab' THEN fw.cod_colab
                    WHEN p_sort_column = 'status_trabajador' THEN fw.status_trabajador
                    WHEN p_sort_column = 'status_seguridad' THEN fw.status_seguridad
                    WHEN p_sort_column = 'contratante' THEN fw.contratante
                    WHEN p_sort_column = 'funcion' THEN fw.funcion
                    WHEN p_sort_column = 'cliente_nombre' THEN fw.cliente
                    ELSE fw.nome
                END
            END ASC,
            CASE WHEN p_sort_direction = 'desc' THEN
                CASE
                    WHEN p_sort_column = 'nome' THEN fw.nome
                    WHEN p_sort_column = 'cod_colab' THEN fw.cod_colab
                    WHEN p_sort_column = 'status_trabajador' THEN fw.status_trabajador
                    WHEN p_sort_column = 'status_seguridad' THEN fw.status_seguridad
                    WHEN p_sort_column = 'contratante' THEN fw.contratante
                    WHEN p_sort_column = 'funcion' THEN fw.funcion
                    WHEN p_sort_column = 'cliente_nombre' THEN fw.cliente
                    ELSE fw.nome
                END
            END DESC
        LIMIT p_page_size
        OFFSET v_offset;
    END;
    $function$;
    `);

    console.log("Banco modernizado para Relatório de Horas e Filtro de Segurança com Sucesso!");
    await prodClient.end();
}
run();
