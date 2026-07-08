const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        // Set local claims to Valter's user ID
        await client.query("BEGIN");
        await client.query("SELECT set_config('request.jwt.claim.sub', 'ee4320ae-2d42-419e-a4a1-6f30f41d3680', true)");
        await client.query("SELECT set_config('request.jwt.claim.role', 'authenticated', true)");

        const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // Luminous
        const periodYear = 2026;
        const periodMonth = 6; // Junho

        // 1. Fetch active company name
        const resEmp = await client.query(`SELECT nome FROM core_common.empresas WHERE id = $1`, [empresaId]);
        console.log("1. Company name:", resEmp.rows[0]?.nome);

        // 2. Fetch active workers
        const resWorkers = await client.query(`
            SELECT id, nome, cliente_nombre, status_trabajador, funcion
            FROM core_personal.get_hours_control_workers($1, $2, $3, null, null)
        `, [empresaId, periodYear, periodMonth]);
        console.log(`2. Luminous workers: ${resWorkers.rows.length}`);
        const activeWorkers = resWorkers.rows;

        // 3. Fetch all clients
        const resClients = await client.query(`
            SELECT id, trade_name, empresa_id, codigo, payment_terms, payment_term_id, billing_email, email, vies_applicable, vies_status, vies_valid, vies_last_checked_at, tax_id, country_id
            FROM core_common.clients
        `);
        console.log(`3. Clients globally: ${resClients.rows.length}`);
        const clientsList = resClients.rows;

        // 4. Fetch validation status of sheet records (worker_hours)
        const resWh = await client.query(`
            SELECT worker_id, status, observacoes
            FROM core_personal.worker_hours
            WHERE period_year = $1 AND period_month = $2
        `, [periodYear, periodMonth]);
        console.log(`4. worker_hours: ${resWh.rows.length}`);

        // 5. Fetch validated hours in core_finance.horas_trabalhadas
        const resHt = await client.query(`
            SELECT * FROM core_finance.horas_trabalhadas
            WHERE data_trabalho BETWEEN '2026-06-01' AND '2026-06-30'
        `);
        console.log(`5. horas_trabalhadas: ${resHt.rows.length}`);
        const horasTrabalhadasList = resHt.rows;

        // Fetch unknown workers (workers with hours but not in activeWorkers)
        const unknownWorkerIds = Array.from(new Set(
          horasTrabalhadasList
            .map(h => h.worker_id)
            .filter(id => id && !activeWorkers.some(w => w.id === id))
        ));

        let unknownWorkers = [];
        if (unknownWorkerIds.length > 0) {
            const resUw = await client.query(`
                SELECT id, nome, empresa_id, status_trabajador, data_baixa, funcion, cod_colab
                FROM core_personal.workers
                WHERE id = ANY($1)
            `, [unknownWorkerIds]);
            unknownWorkers = resUw.rows;
        }
        console.log(` - Unknown workers count: ${unknownWorkers.length}`);
        const unknownWorkersMap = new Map(unknownWorkers.map(w => [w.id, w]));

        const belongsToCompany = (wId) => {
          if (activeWorkers.some(w => w.id === wId)) return true;
          const uw = unknownWorkersMap.get(wId);
          return uw ? uw.empresa_id === empresaId : false;
        };

        const hoursList = horasTrabalhadasList.filter(h => belongsToCompany(h.worker_id));
        console.log(` - Hours list (filtered to Luminous workers): ${hoursList.length}`);

        // 6. Filter clients
        const relevantClients = clientsList.filter(client => {
          if (client.empresa_id !== empresaId) return false;
          const clientNameLower = client.trade_name?.trim().toLowerCase();
          const hasWorkers = activeWorkers.some(w => w.cliente_nombre?.trim().toLowerCase() === clientNameLower);
          const hasHours = hoursList.some(h => h.client_id === client.id);
          return hasWorkers || hasHours;
        });
        console.log(`6. relevantClients count: ${relevantClients.length}`);
        const relevantClientIds = relevantClients.map(c => c.id);

        // 7. Fetch client sites
        let clientSites = [];
        if (relevantClientIds.length > 0) {
            const resCs = await client.query(`
                SELECT id, name FROM core_common.client_sites WHERE client_id = ANY($1)
            `, [relevantClientIds]);
            clientSites = resCs.rows;
        }
        console.log(`7. client_sites count: ${clientSites.length}`);

        // 8. Fetch faturas
        const faturaIds = Array.from(new Set(hoursList.map(h => h.fatura_id).filter(Boolean)));
        let faturasList = [];
        if (faturaIds.length > 0) {
            const resFat = await client.query(`
                SELECT id, status, magic_link_token, data_emissao, status FROM core_finance.faturas WHERE id = ANY($1)
            `, [faturaIds]);
            faturasList = resFat.rows;
        }
        console.log(`8. faturas count: ${faturasList.length}`);

        // 9. Fetch job functions
        const funcaoIds = Array.from(new Set(hoursList.map(h => h.funcao_id).filter(Boolean)));
        const workerFuncaoIds = activeWorkers.map(w => w.funcao_id).filter(Boolean);
        const allFuncaoIds = Array.from(new Set([...funcaoIds, ...workerFuncaoIds]));
        let jobFunctions = [];
        if (allFuncaoIds.length > 0) {
            const resJf = await client.query(`
                SELECT id, name FROM core_comercial.job_functions WHERE id = ANY($1)
            `, [allFuncaoIds]);
            jobFunctions = resJf.rows;
        }
        console.log(`9. job_functions count: ${jobFunctions.length}`);

        await client.query("COMMIT");
        console.log("All queries executed successfully without any errors!");

    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Query execution failed:", e);
    } finally {
        await client.end();
    }
}

run();
