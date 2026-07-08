const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const empresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco
        const startDateStr = '2026-06-01';
        const endDateStr = '2026-06-30';

        // Count how many Stocco workers have active allocations in colaborador_por_pedido in June 2026
        const resAllocated = await client.query(`
            SELECT COUNT(DISTINCT w.id) as count
            FROM core_personal.workers w
            JOIN public.colaborador_por_pedido cpp ON cpp.cod_colab = w.cod_colab
            WHERE w.empresa_id = $1
              AND (cpp.fechainiciopedido IS NULL OR cpp.fechainiciopedido <= $3::date)
              AND (cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= $2::date)
              AND (cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= $2::date)
        `, [empresaId, startDateStr, endDateStr]);
        console.log("Stocco workers with active allocations in June 2026:", resAllocated.rows[0].count);

        // Count how many workers have status = 'Ativo' and no allocations
        const resStatusAtivo = await client.query(`
            SELECT COUNT(*) FROM core_personal.workers
            WHERE empresa_id = $1 AND status_trabajador ILIKE 'Ativo'
        `, [empresaId]);
        console.log("Total Stocco workers with status = 'Ativo' in DB:", resStatusAtivo.rows[0].count);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
