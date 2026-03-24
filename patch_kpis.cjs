const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();

    // Remove old versions just in case
    try { await prodClient.query("DROP FUNCTION IF EXISTS core_personal.get_client_worker_kpis(uuid, text);"); } catch(e) {}
    try { await prodClient.query("DROP FUNCTION IF EXISTS core_personal.get_client_worker_kpis(uuid, text, text[], text, text);"); } catch(e) {}
    try { await prodClient.query("DROP FUNCTION IF EXISTS core_personal.get_client_worker_kpis(uuid, text, text[], text, text, text);"); } catch(e) {}
    
    // Create new correct version
    await prodClient.query(`
    CREATE OR REPLACE FUNCTION core_personal.get_client_worker_kpis(
        p_empresa_id uuid,
        p_search text DEFAULT NULL,
        p_cliente_nombre text[] DEFAULT NULL,
        p_contratante text DEFAULT NULL,
        p_funcion text DEFAULT NULL
    )
    RETURNS SETOF json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, core_personal
    AS $$
    BEGIN
        RETURN QUERY
        SELECT row_to_json(result)
        FROM (
            WITH filtered_kpis AS (
                SELECT w.*
                FROM core_personal.workers w
                WHERE 
                    (p_empresa_id IS NULL OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid OR w.empresa_id = p_empresa_id)
                    AND (
                        p_search IS NULL OR p_search = '' 
                        OR w.nome ILIKE '%' || p_search || '%' 
                        OR w.cod_colab ILIKE '%' || p_search || '%' 
                        OR w.dni ILIKE '%' || p_search || '%' 
                        OR w.pasaporte ILIKE '%' || p_search || '%' 
                        OR w.niss ILIKE '%' || p_search || '%' 
                        OR w.nie ILIKE '%' || p_search || '%'
                    )
                    AND (p_contratante IS NULL OR p_contratante = '' OR w.contratante = p_contratante)
                    AND (p_funcion IS NULL OR p_funcion = '' OR w.funcion = p_funcion)
                    AND (p_cliente_nombre IS NULL OR array_length(p_cliente_nombre, 1) IS NULL OR w.cliente = ANY(p_cliente_nombre))
            )
            SELECT 
                COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Ativo' OR wk.status_trabajador ILIKE 'Activo') AS ativos,
                COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Inativo' OR wk.status_trabajador ILIKE 'Inactivo') AS inativos,
                COUNT(*) FILTER (WHERE wk.status_trabajador ILIKE 'Pendente Ingresso' OR wk.status_trabajador ILIKE 'Pendiente Ingresar') AS pendentes_ingreso,
                COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Alta') AS seguridade_alta,
                COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendente Alta' OR wk.status_seguridad ILIKE 'Pendiente Alta') AS seguridade_pendente_alta,
                COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Em Regularização' OR wk.status_seguridad ILIKE 'En Regularizacion') AS seguridade_em_regularizacao,
                COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Baixa' OR wk.status_seguridad ILIKE 'Baja' OR wk.status_seguridad ILIKE 'Anulado') AS seguridade_baixa,
                COUNT(*) FILTER (WHERE wk.status_seguridad ILIKE 'Pendente Baixa' OR wk.status_seguridad ILIKE 'Pendiente Baja') AS seguridade_pendente_baixa
            FROM filtered_kpis wk
        ) result;
    END;
    $$;
    `);

    console.log("Banco modernizado com sucesso! (KPIs Blindados e Desvinculados do Passado)");
    await prodClient.end();
}
run();
