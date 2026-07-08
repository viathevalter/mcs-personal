const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const empresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco
        const periodYear = 2026;
        const periodMonth = 6; // Junho

        // 1. Fetch active workers (replicating get_hours_control_workers)
        const resWorkers = await client.query(`
            SELECT DISTINCT w.id, w.nome, wh.cliente_nombre, w.empresa_id, w.status_trabajador, w.data_baixa, w.funcion
            FROM core_personal.workers w
            JOIN core_personal.worker_hours wh ON wh.worker_id = w.id
            WHERE w.empresa_id = $1
              AND wh.period_year = $2
              AND wh.period_month = $3
        `, [empresaId, periodYear, periodMonth]);
        const activeWorkers = resWorkers.rows;
        console.log(`Active workers: ${activeWorkers.length}`);

        // 2. Fetch all clients
        const resClients = await client.query(`
            SELECT id, trade_name, empresa_id, vies_applicable, vies_valid
            FROM core_common.clients
        `);
        const clientsList = resClients.rows;
        console.log(`Total clients in DB: ${clientsList.length}`);

        // 3. Fetch worker_hours status for validated check
        const resWh = await client.query(`
            SELECT worker_id, status, observacoes
            FROM core_personal.worker_hours
            WHERE period_year = $1 AND period_month = $2
        `, [periodYear, periodMonth]);
        const workerHoursList = resWh.rows;

        const workerHoursMap = new Map(workerHoursList.map(wh => [wh.worker_id, wh]));

        // 4. Fetch hours in core_finance.horas_trabalhadas
        const resHt = await client.query(`
            SELECT id, worker_id, client_id, horas_totais, status, fatura_id, tarifa_faturada, data_trabalho
            FROM core_finance.horas_trabalhadas
            WHERE data_trabalho BETWEEN '2026-06-01' AND '2026-06-30'
        `);
        const horasTrabalhadasList = resHt.rows;
        console.log(`Total horas_trabalhadas in June: ${horasTrabalhadasList.length}`);

        const belongsToCompany = (wId) => {
            if (activeWorkers.some(w => w.id === wId)) return true;
            return false;
        };

        const hoursList = horasTrabalhadasList.filter(h => belongsToCompany(h.worker_id));
        console.log(`Hours belonging to company workers: ${hoursList.length}`);

        // Replicate loop
        const clientSummaries = [];

        for (const c of clientsList) {
            const clientNameLower = c.trade_name?.trim().toLowerCase();
            const clientWorkers = activeWorkers.filter(w => w.cliente_nombre?.trim().toLowerCase() === clientNameLower);
            const clientHours = hoursList.filter(h => h.client_id === c.id);

            if (clientWorkers.length > 0 || clientHours.length > 0) {
                console.log(`Matched Client: "${c.trade_name}" (ID: ${c.id})`);
                console.log(`  - clientWorkers: ${clientWorkers.length}`);
                console.log(`  - clientHours: ${clientHours.length}`);
                
                // Let's print if they would get processed or skipped
                const validatedWorkersCount = clientWorkers.filter(w => {
                    const whObj = workerHoursMap.get(w.id);
                    return whObj?.status === 'validado';
                }).length;
                console.log(`  - validatedWorkers: ${validatedWorkersCount} out of ${clientWorkers.length}`);
            }
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
