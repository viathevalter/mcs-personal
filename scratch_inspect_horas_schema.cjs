const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function inspectHorasSchemaAndClients() {
    // 1. Inspect columns of core_finance.horas_trabalhadas
    const { data: sampleRow } = await prodSupabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .select('*')
        .limit(5);

    console.log("Sample rows in core_finance.horas_trabalhadas:");
    console.log(Object.keys(sampleRow?.[0] || {}));
    console.log(sampleRow?.[0]);

    // 2. Check if there are workers with hours at multiple clients/faturas in July 2026
    const { data: julyHours } = await prodSupabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .select('worker_id, fatura_id, cliente, cliente_id, empresa_id, horas_totais, data_trabalho')
        .gte('data_trabalho', '2026-07-01')
        .lte('data_trabalho', '2026-07-31');

    console.log(`\nTotal July 2026 hours records: ${julyHours?.length}`);

    // Map worker_id -> Set of clients or fatura_ids
    const workerClients = new Map();
    const workerFaturas = new Map();

    julyHours?.forEach(h => {
        if (!workerClients.has(h.worker_id)) workerClients.set(h.worker_id, new Set());
        if (!workerFaturas.has(h.worker_id)) workerFaturas.set(h.worker_id, new Set());

        if (h.cliente || h.cliente_id) workerClients.get(h.worker_id).add(h.cliente || h.cliente_id);
        if (h.fatura_id) workerFaturas.get(h.worker_id).add(h.fatura_id);
    });

    console.log("\nWorkers with multiple faturas in July 2026:");
    let multiFaturaCount = 0;
    workerFaturas.forEach((faturas, wId) => {
        if (faturas.size > 1) {
            multiFaturaCount++;
            console.log(`  Worker ID ${wId} worked across ${faturas.size} faturas:`, Array.from(faturas));
        }
    });
    console.log(`Total multi-fatura workers: ${multiFaturaCount}`);

    // 3. Inspect specific workers mentioned in screenshot:
    // JORGE ENRIQUE SANABRIA MORENO, RAUL AUGUSTO MIRANDA
    const { data: targetWorkers } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, cliente_nombre, contratante, status_trabajador, data_ingresso, data_baixa')
        .or('nome.ilike.%SANABRIA MORENO%,nome.ilike.%RAUL AUGUSTO MIRANDA%');

    console.log("\nTarget workers inspect:");
    targetWorkers?.forEach(w => {
        console.log(`\nWorker: ${w.nome} | ID: ${w.id}`);
        console.log(`  Profile Cliente: ${w.cliente_nombre} | Contratante: ${w.contratante} | Status: ${w.status_trabajador} | Ingresso: ${w.data_ingresso} | Baixa: ${w.data_baixa}`);

        const wHours = julyHours?.filter(h => h.worker_id === w.id);
        console.log(`  July 2026 worked hours count: ${wHours?.length}`);
        const clients = new Set(wHours?.map(h => h.cliente || h.fatura_id));
        console.log(`  Distinct clients/faturas in July 2026:`, Array.from(clients));
    });
}

inspectHorasSchemaAndClients();
