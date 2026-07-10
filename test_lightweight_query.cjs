const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const activeEmpresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // STO - Stocco

        // Step 1: Fetch active contract worker IDs
        const { rows: contracts } = await client.query(`
            SELECT worker_id 
            FROM core_personal.contracts 
            WHERE empresa_id = $1
        `, [activeEmpresaId]);

        console.log(`Contracts found for Stocco: ${contracts.length}`);
        if (contracts.length === 0) return;

        const workerIds = Array.from(new Set(contracts.map(c => c.worker_id).filter(Boolean)));
        console.log(`Distinct worker IDs: ${workerIds.length}`);

        // Step 2: Fetch worker profiles
        const { rows: workers } = await client.query(`
            SELECT id, nome, cod_colab 
            FROM core_personal.workers 
            WHERE id = ANY($1)
              AND (status_trabajador ILIKE 'Ativo' OR status_trabajador ILIKE 'Activo')
        `, [workerIds]);

        console.log(`Workers found: ${workers.length}`);
        workers.forEach(w => {
            console.log(` - ${w.nome} (${w.cod_colab})`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
