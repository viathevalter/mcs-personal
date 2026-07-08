const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        console.log("Connected to PRODUCTION DB.");

        const empresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco
        const periodYear = 2026;
        const periodMonth = 6; // Junho

        // 1. Fetch active workers using the RPC
        const resWorkers = await client.query(`
            SELECT id, nome, cliente_nombre, status_trabajador
            FROM core_personal.get_hours_control_workers($1, $2, $3, null, null)
        `, [empresaId, periodYear, periodMonth]);
        console.log(`Stocco workers in PRODUCTION in June 2026: ${resWorkers.rows.length}`);
        const activeWorkers = resWorkers.rows;

        // 2. Fetch all clients
        const resClients = await client.query(`
            SELECT id, trade_name, empresa_id
            FROM core_common.clients
        `);
        console.log(`Total clients in PRODUCTION globally: ${resClients.rows.length}`);
        const clientsList = resClients.rows;

        // 3. Filter clients
        const normalizeName = (n) => {
            if (!n) return '';
            return n
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '')
                .replace(/(s[alr]u?|lda|unipessoal|su)$/g, '');
        };

        // 4. Fetch validated hours in core_finance.horas_trabalhadas for the period
        const resHt = await client.query(`
            SELECT * FROM core_finance.horas_trabalhadas
            WHERE data_trabalho BETWEEN '2026-06-01' AND '2026-06-30'
        `);
        const horasTrabalhadasList = resHt.rows;

        const belongsToCompany = (wId) => {
          return activeWorkers.some(w => w.id === wId);
        };
        const hoursList = horasTrabalhadasList.filter(h => belongsToCompany(h.worker_id));

        const relevantClients = clientsList.filter(client => {
          if (client.empresa_id !== empresaId) return false;
          const clientNameLower = client.trade_name?.trim().toLowerCase();
          const hasWorkers = activeWorkers.some(w => w.cliente_nombre?.trim().toLowerCase() === clientNameLower);
          const hasHours = hoursList.some(h => h.client_id === client.id);
          return hasWorkers || hasHours;
        });

        console.log(`Matched Stocco Clients in PRODUCTION for June 2026: ${relevantClients.length}`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
