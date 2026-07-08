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

        // 1. Fetch active workers
        const resWorkers = await client.query(`
            SELECT id, nome, cliente_nombre, status_trabajador
            FROM core_personal.get_hours_control_workers($1, $2, $3, null, null)
        `, [empresaId, periodYear, periodMonth]);
        const activeWorkers = resWorkers.rows;
        console.log(`Luminous active workers count: ${activeWorkers.length}`);

        const uniqueClientNames = Array.from(new Set(activeWorkers.map(w => w.cliente_nombre).filter(Boolean)));
        console.log("Unique worker client names:", uniqueClientNames);

        // 2. Fetch clients of Luminous
        const resClients = await client.query(`
            SELECT id, trade_name, empresa_id
            FROM core_common.clients
            WHERE empresa_id = $1
        `, [empresaId]);
        const clientsList = resClients.rows;
        console.log(`Luminous registered clients count: ${clientsList.length}`);

        const normalizeName = (n) => {
            if (!n) return '';
            return n
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '')
                .replace(/(s[alr]u?|lda|unipessoal|su)$/g, '');
        };

        const matched = [];
        const unmatched = [];

        for (const name of uniqueClientNames) {
            const exists = clientsList.some(c => {
                const normC = normalizeName(c.trade_name);
                const normN = normalizeName(name);
                return normC === normN || (normC.length > 3 && normN.includes(normC)) || (normN.length > 3 && normC.includes(normN));
            });
            if (exists) {
                matched.push(name);
            } else {
                unmatched.push(name);
            }
        }

        console.log(`Matched clients count: ${matched.length}`);
        console.log(`Unmatched clients count: ${unmatched.length}`);
        if (unmatched.length > 0) {
            console.log("Unmatched names:", unmatched);
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
