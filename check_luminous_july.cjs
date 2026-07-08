const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // Luminous
        const periodYear = 2026;
        const periodMonth = 7; // Julho

        // 1. Fetch active workers using the RPC
        const resWorkers = await client.query(`
            SELECT * FROM core_personal.get_hours_control_workers($1, $2, $3, null, null)
        `, [empresaId, periodYear, periodMonth]);
        console.log(`Luminous workers in July 2026: ${resWorkers.rows.length}`);

        // 2. Count active workers of Luminous in workers table
        const resStatusAtivo = await client.query(`
            SELECT COUNT(*) FROM core_personal.workers
            WHERE empresa_id = $1 AND (status_trabajador ILIKE 'Ativo' OR status_trabajador ILIKE 'Activo')
        `, [empresaId]);
        console.log(`Total Luminous workers with status = Ativo/Activo: ${resStatusAtivo.rows[0].count}`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
