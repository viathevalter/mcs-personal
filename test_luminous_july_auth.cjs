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
        const periodMonth = 7; // Julho

        // 1. Fetch active workers
        const resWorkers = await client.query(`
            SELECT id, nome, cliente_nombre, status_trabajador
            FROM core_personal.get_hours_control_workers($1, $2, $3, null, null)
        `, [empresaId, periodYear, periodMonth]);
        console.log(`Luminous workers as Valter: ${resWorkers.rows.length}`);

        // 2. Fetch all clients
        const resClients = await client.query(`
            SELECT id, trade_name, empresa_id
            FROM core_common.clients
        `);
        console.log(`Clients as Valter: ${resClients.rows.length}`);

        // 3. Filter clients
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

        console.log(`Matched Luminous Clients for July 2026: ${matchedClients.length}`);
        matchedClients.slice(0, 5).forEach((c, i) => {
            console.log(` - ${i+1}. ${c.trade_name}`);
        });

        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
