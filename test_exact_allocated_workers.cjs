const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected.");

        const activeEmpresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // STO - Stocco
        const tradeName = 'SINFINES FACTORY S.L';

        // 1. Fetch allocated worker codes
        const resAlloc = await client.query(`
            SELECT DISTINCT cod_colab 
            FROM public.colaborador_por_pedido 
            WHERE cliente_nombre = $1
        `, [tradeName]);
        const allocatedWorkerCodes = resAlloc.rows.map(r => r.cod_colab).filter(Boolean);
        console.log("Allocated Worker Codes:", allocatedWorkerCodes);

        // 2. Fetch contracts
        const { rows: contracts } = await client.query(`
            SELECT DISTINCT worker_id 
            FROM core_personal.contracts 
            WHERE empresa_id = $1
        `, [activeEmpresaId]);
        const workerIds = contracts.map(c => c.worker_id).filter(Boolean);

        // 3. Fetch workersList
        const { rows: workersList } = await client.query(`
            SELECT id, nome, cod_colab, cliente_nombre 
            FROM core_personal.workers 
            WHERE id = ANY($1)
              AND (status_trabajador ILIKE 'Ativo' OR status_trabajador ILIKE 'Activo')
        `, [workerIds]);

        console.log(`workersList size: ${workersList.length}`);

        // 4. Perform filter Step 1
        const filteredByCode = workersList.filter(
            w => w.cod_colab && allocatedWorkerCodes.includes(w.cod_colab)
        );
        console.log(`filteredByCode size: ${filteredByCode.length}`);
        filteredByCode.forEach(w => console.log(` - Code: ${w.cod_colab}, Name: ${w.nome}`));

        // 5. Perform filter Step 2
        const clientNameLower = tradeName.trim().toLowerCase();
        const filteredByName = workersList.filter(
            w => w.cliente_nombre?.trim().toLowerCase() === clientNameLower
        );
        console.log(`filteredByName size: ${filteredByName.length}`);
        filteredByName.forEach(w => console.log(` - Code: ${w.cod_colab}, Name: ${w.nome}, Client: ${w.cliente_nombre}`));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
