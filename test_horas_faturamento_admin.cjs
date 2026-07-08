const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DB as superuser.");

        const empresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco
        const periodYear = 2026;
        const periodMonth = 6; // Junho

        // 1. Fetch active workers for period via sql
        const resWorkers = await client.query(`
            SELECT DISTINCT w.id, w.nome, wh.cliente_nombre, w.empresa_id
            FROM core_personal.workers w
            JOIN core_personal.worker_hours wh ON wh.worker_id = w.id
            WHERE w.empresa_id = $1
              AND wh.period_year = $2
              AND wh.period_month = $3
              AND wh.status = 'Validado'
        `, [empresaId, periodYear, periodMonth]);
        console.log(`Active workers in period: ${resWorkers.rows.length}`);
        const santiago = resWorkers.rows.find(w => w.nome.includes('SANTIAGO'));
        console.log("Is Santiago in active workers of period?", santiago);

        // 2. Fetch all clients
        const resClients = await client.query(`
            SELECT id, trade_name, empresa_id, vies_applicable, vies_valid
            FROM core_common.clients
        `);
        console.log(`Total clients: ${resClients.rows.length}`);
        const goitek = resClients.rows.find(c => c.trade_name.includes('GOITEK'));
        console.log("Is Goitek in clients table?", goitek);

        // 3. Fetch hours in core_finance.horas_trabalhadas for the period
        const startDateStr = '2026-06-01';
        const endDateStr = '2026-06-30';
        const resHours = await client.query(`
            SELECT id, worker_id, client_id, horas_totais, status, fatura_id
            FROM core_finance.horas_trabalhadas
            WHERE data_trabalho BETWEEN $1 AND $2
        `, [startDateStr, endDateStr]);
        console.log(`Total horas_trabalhadas in June 2026: ${resHours.rows.length}`);

        const santiagoHours = resHours.rows.filter(h => h.worker_id === 'faf87cf3-7c36-480f-b60a-916a08947bd3');
        console.log(`Santiago hours in June 2026: ${santiagoHours.length}`);
        if (santiagoHours.length > 0) {
            console.log("Santiago first hour row:", santiagoHours[0]);
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
