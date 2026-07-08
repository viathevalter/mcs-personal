const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const empresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco
        const v_start_date = '2026-06-01';
        const v_end_date = '2026-06-30';

        // Replicate valid_allocations
        const resAlloc = await client.query(`
            WITH valid_allocations AS (
                SELECT DISTINCT ON (cpp.cod_colab)
                  cpp.cod_colab,
                  cpp.contratante,
                  cpp.cliente_nombre
                FROM public.colaborador_por_pedido cpp
                WHERE 
                  (cpp.fechainiciopedido IS NULL OR cpp.fechainiciopedido <= $2::date)
                  AND (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= $1::date)
                  AND (cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= $1::date)
                ORDER BY cpp.cod_colab, 
                         COALESCE(cpp.fechasalidatrabajador, cpp.fechafinpedido, $2::date) DESC,
                         cpp.inserted_at DESC
            )
            SELECT w.id, w.nome, w.cod_colab, w.status_trabajador, w.data_baixa,
                   COALESCE(va.contratante, c.contratante) as contratante,
                   COALESCE(va.cliente_nombre, public.fn_get_active_client_for_worker(w.cod_colab), 'NÃO DEFINIDO') as cliente_nombre
            FROM core_personal.workers w
            LEFT JOIN public.colaboradores c ON c.cod_colab = w.cod_colab
            LEFT JOIN valid_allocations va ON va.cod_colab = w.cod_colab
            WHERE w.empresa_id = $3
              AND (
                 -- Worker is active
                 (w.status_trabajador ILIKE 'Ativo' OR w.status_trabajador ILIKE 'Activo')
                 OR
                 -- Worker was deactivated during or after this period
                 ((w.status_trabajador ILIKE 'Inativo' OR w.status_trabajador ILIKE 'Desligado' OR w.status_trabajador ILIKE 'Pendente Baixa') AND w.data_baixa >= $1::date)
              )
        `, [v_start_date, v_end_date, empresaId]);

        console.log(`Corrected Active Workers count: ${resAlloc.rows.length}`);
        resAlloc.rows.forEach((w, i) => {
            console.log(`${i+1}. ${w.nome} (${w.cod_colab}) - Client: "${w.cliente_nombre}" - Status: "${w.status_trabajador}" - Baixa: ${w.data_baixa}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
