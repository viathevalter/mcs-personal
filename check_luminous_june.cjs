const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB.");

        const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // Luminous
        const periodYear = 2026;
        const periodMonth = 6; // Junho

        // 1. Fetch active workers using the RPC
        const resWorkers = await client.query(`
            SELECT * FROM core_personal.get_hours_control_workers($1, $2, $3, null, null)
        `, [empresaId, periodYear, periodMonth]);
        console.log(`Luminous workers in June 2026: ${resWorkers.rows.length}`);

        // 2. Fetch all clients
        const resClients = await client.query(`
            SELECT id, trade_name, empresa_id
            FROM core_common.clients
        `);
        const clientsList = resClients.rows;
        const activeWorkers = resWorkers.rows;

        const normalizeName = (n) => {
            if (!n) return '';
            return n
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '')
                .replace(/(s[alr]u?|lda|unipessoal|su)$/g, '');
        };

        const matchedClients = clientsList.filter(client => {
            if (client.empresa_id !== empresaId) return false;
            const clientNameLower = client.trade_name?.trim().toLowerCase();
            const hasWorkers = activeWorkers.some(w => w.cliente_nombre?.trim().toLowerCase() === clientNameLower);
            return hasWorkers;
        });

        console.log(`Matched Luminous Clients for June 2026: ${matchedClients.length}`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
