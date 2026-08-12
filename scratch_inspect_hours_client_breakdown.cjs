const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function inspectHoursClientBreakdown() {
    // 1. Fetch faturas to get client names and company names
    const { data: faturas } = await prodSupabase
        .schema('core_finance')
        .from('faturas')
        .select('id, client_id, cliente_nombre, empresa_id, empresa_nombre, ajustes_json');

    const faturaClientMap = new Map();
    faturas?.forEach(f => faturaClientMap.set(f.id, f.cliente_nombre || f.client_id));

    // 2. Fetch July 2026 hours
    let allHours = [];
    let pageIndex = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await prodSupabase
            .schema('core_finance')
            .from('horas_trabalhadas')
            .select('id, worker_id, client_id, fatura_id, data_trabalho, horas_totais, tarifa_faturada')
            .gte('data_trabalho', '2026-07-01')
            .lte('data_trabalho', '2026-07-31')
            .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

        if (error) break;

        if (data && data.length > 0) {
            allHours = [...allHours, ...data];
            if (data.length < pageSize) hasMore = false;
            else pageIndex++;
        } else hasMore = false;
    }

    console.log(`Loaded ${allHours.length} hours records for July 2026`);

    // Fetch workers
    const { data: workers } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, cliente, contratante, data_ingresso, data_baixa');

    const workerMap = new Map();
    workers?.forEach(w => workerMap.set(w.id, w));

    // Check how many workers have hours under different fatura_ids / clients
    const workerClientSummary = new Map();

    allHours.forEach(h => {
        const w = workerMap.get(h.worker_id);
        if (!w) return;

        if (!workerClientSummary.has(h.worker_id)) {
            workerClientSummary.set(h.worker_id, {
                worker: w,
                clients: new Map() // clientName -> sum of hours
            });
        }

        const summary = workerClientSummary.get(h.worker_id);
        const clientName = faturaClientMap.get(h.fatura_id) || 'Cliente Directo';
        const prev = summary.clients.get(clientName) || 0;
        summary.clients.set(clientName, prev + Number(h.horas_totais || 0));
    });

    console.log("\n--- Multi-Client Worked Hours Summary in July 2026 ---");
    let countMulti = 0;
    workerClientSummary.forEach(({ worker, clients }) => {
        if (clients.size > 1) {
            countMulti++;
            console.log(`\nWorker: ${worker.nome} (Profile client: ${worker.cliente})`);
            clients.forEach((hrs, cName) => {
                console.log(`   - Client '${cName}': ${hrs} h`);
            });
        }
    });

    console.log(`\nTotal workers with multi-client hours in July 2026: ${countMulti}`);
}

inspectHoursClientBreakdown();
