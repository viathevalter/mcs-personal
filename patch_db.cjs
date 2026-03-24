const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    // 1. Inserir empresa Luminous se nao existir
    await prodClient.query(`
        INSERT INTO core_common.empresas (codigo, nome, is_active) 
        VALUES ('LUM', 'Luminous', true)
        ON CONFLICT DO NOTHING;
    `);
    
    // 2. Adicionar colunas em core_personal.workers
    await prodClient.query(`
        ALTER TABLE core_personal.workers
        ADD COLUMN IF NOT EXISTS contratante text,
        ADD COLUMN IF NOT EXISTS funcion text,
        ADD COLUMN IF NOT EXISTS cliente text;
    `);

    // 3. Atualizar a RPC search_workers para LER AS COLUNAS DIRETAMENTE de core_personal.workers
    await prodClient.query(`
    CREATE OR REPLACE FUNCTION core_personal.search_workers(
        p_empresa_id uuid DEFAULT NULL,
        p_status_seguridad text DEFAULT NULL,
        p_status_trabajador text DEFAULT NULL,
        p_contratante text DEFAULT NULL,
        p_funcion text DEFAULT NULL,
        p_search_query text DEFAULT NULL
    )
    RETURNS SETOF json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, core_personal
    AS $$
    BEGIN
        -- O usuário relata que LoginPro e SuperAdmins não viam os trabalhadores adequadamente
        -- Portanto, se a empresa principal (LoginPro) for selecionada, ou null for passado, 
        -- apenas ignore o filtro da empresa principal a menos que seja especificamente de uma.
        RETURN QUERY
        SELECT row_to_json(result)
        FROM (
            SELECT 
            w.id,
            w.empresa_id,
            w.cod_colab,
            w.nome,
            w.nif,
            w.status_seguridad,
            w.status_trabajador,
            w.contratante,
            w.funcion,
            w.cliente
            FROM core_personal.workers w
            WHERE (p_empresa_id IS NULL OR w.empresa_id = p_empresa_id OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid)
            AND (p_status_seguridad IS NULL OR p_status_seguridad = '' OR p_status_seguridad = 'Todos' OR w.status_seguridad = p_status_seguridad)
            AND (p_status_trabajador IS NULL OR p_status_trabajador = '' OR p_status_trabajador = 'Todos' OR w.status_trabajador = p_status_trabajador)
            AND (p_contratante IS NULL OR p_contratante = '' OR w.contratante = p_contratante)
            AND (p_funcion IS NULL OR p_funcion = '' OR w.funcion = p_funcion)
            AND (
                p_search_query IS NULL 
                OR p_search_query = ''
                OR w.nome ILIKE '%' || p_search_query || '%'
                OR w.cod_colab ILIKE '%' || p_search_query || '%'
                OR w.nif ILIKE '%' || p_search_query || '%'
            )
            ORDER BY w.nome ASC
        ) result;
    END;
    $$;
    `);

    console.log("Banco modernizado com sucesso.");
    await prodClient.end();
}
run();
