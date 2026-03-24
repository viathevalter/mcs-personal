const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    
    // 1. get_unique_clients
    await prodClient.query(`
        CREATE OR REPLACE FUNCTION public.get_unique_clients()
        RETURNS TABLE(cliente_nombre text)
        LANGUAGE plpgsql
        AS $function$
        BEGIN
            RETURN QUERY
            SELECT DISTINCT w.cliente AS cliente_nombre 
            FROM core_personal.workers w 
            WHERE w.cliente IS NOT NULL AND w.cliente != ''
            ORDER BY 1;
        END;
        $function$;
    `);

    // 2. get_unique_contratantes
    await prodClient.query(`
        CREATE OR REPLACE FUNCTION public.get_unique_contratantes()
        RETURNS TABLE(contratante text)
        LANGUAGE plpgsql
        AS $function$
        BEGIN
            RETURN QUERY
            SELECT DISTINCT w.contratante
            FROM core_personal.workers w
            WHERE w.contratante IS NOT NULL AND w.contratante != ''
            ORDER BY 1 ASC;
        END;
        $function$;
    `);

    // 3. get_unique_funciones
    await prodClient.query(`
        CREATE OR REPLACE FUNCTION public.get_unique_funciones()
        RETURNS TABLE(funcion text)
        LANGUAGE plpgsql
        AS $function$
        BEGIN
            RETURN QUERY
            SELECT DISTINCT w.funcion
            FROM core_personal.workers w
            WHERE w.funcion IS NOT NULL AND w.funcion != ''
            ORDER BY 1 ASC;
        END;
        $function$;
    `);

    console.log("Banco modernizado com sucesso! (Dropdowns Restaurados)");
    await prodClient.end();
}
run();
