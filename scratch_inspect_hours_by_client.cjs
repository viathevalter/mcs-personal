const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function inspectHoursByClient() {
    // 1. Fetch all clients
    const { data: clients } = await prodSupabase
        .schema('core_master')
        .from('clients')
        .select('id, name, razonsocial');

    const clientMap = new Map();
    clients?.forEach(c => clientMap.set(c.id, c.name || c.razonsocial));
    console.log("Total clients found in core_master.clients:", clients?.length);

    // 2. Fetch July 2026 hours
    let allHours = [];
    let pageIndex = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await prodSupabase
            .schema('core_finance')
            .from('horas_trabalhadas')
            .select('id, worker_id, client_id, fatura_id, data_trabalho, horas_totais')
            .gte('data_trabalho', '2026-07-01')
            .lte('data_trabalho', '2026-07-31')
            .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

        if (error) {
            console.error("Error fetching hours:", error);
            break;
        }

        if (data && data.length > 0) {
            allHours = [...allHours, ...data];
            if (data.length < pageSize) hasMore = false;
            else pageIndex++;
        } else hasMore = false;
    }

    console.log(`Total July 2026 hours records loaded: ${allHours.length}`);

    // Map worker_id -> Map of client_id -> sum of hours
    const workerClientHours = new Map();
    allHours.forEach(h => {
        if (!workerClientHours.has(h.worker_id)) workerClientHours.set(h.worker_id, new Map());

        const clientKey = h.client_id || 'NO_CLIENT_ID';
        const clientHoursMap = workerClientHours.get(h.worker_id);
        const prev = clientHoursMap.get(clientKey) || 0;
        clientHoursMap.set(clientKey, prev + Number(h.horas_totais || 0));
    });

    console.log("\nWorkers who worked for MULTIPLE clients in July 2026:");
    let multiClientWorkerCount = 0;
    workerClientHours.forEach((cMap, wId) => {
        if (cMap.size > 1) {
            multiClientWorkerCount++;
            console.log(`\nWorker ID: ${wId}`);
            cMap.forEach((hrs, cId) => {
                const cName = clientMap.get(cId) || cId;
                console.log(`   Client: ${cName} -> ${hrs} h`);
            });
        }
    });
    console.log(`\nTotal workers working across multiple clients in July 2026: ${multiClientWorkerCount}`);

    // 3. Inspect Intuyma workers specifically
    const intuymaClient = clients?.find(c => (c.name || c.razonsocial || '').toUpperCase().includes('INTUYMA'));
    console.log("\nIntuyma client info:", intuymaClient);

    const { data: intuymaWorkers } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, cliente_nombre, contratante, status_trabajador, data_ingresso, data_baixa')
        .ilike('cliente_nombre', '%INTUYMA%');

    console.log(`\nWorkers with profile cliente_nombre = 'INTUYMA': ${intuymaWorkers?.length}`);
    intuymaWorkers?.forEach(w => {
        const cMap = workerClientHours.get(w.id);
        console.log(`\nWorker: ${w.nome} (ID: ${w.id})`);
        console.log(`  Profile: status=${w.status_trabajador}, ingresso=${w.data_ingresso}, baixa=${w.data_baixa}`);
        if (cMap) {
            cMap.forEach((hrs, cId) => {
                const cName = clientMap.get(cId) || cId;
                console.log(`  Hours in July 2026: Client '${cName}' -> ${hrs} h`);
            });
        } else {
            console.log(`  Hours in July 2026: NONE in core_finance.horas_trabalhadas`);
        }
    });
}

inspectHoursByClient();
