const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function inspectIntuymaWorkers() {
    // Fetch all workers
    const { data: allWorkers, error } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome, cliente, contratante, status_trabajador, status_seguridad, data_ingresso, data_baixa');

    if (error) console.error("Error fetching workers:", error);

    const intuymaWorkers = allWorkers?.filter(w => (w.cliente || '').toUpperCase().includes('INTUYMA'));
    console.log(`\nWorkers with worker.cliente including INTUYMA (${intuymaWorkers?.length}):\n`);
    
    intuymaWorkers?.forEach(w => {
        console.log(`Worker: ${w.nome.padEnd(35)} | Cód: ${w.cod_colab || '-'} | Cliente: ${w.cliente} | Contratante: ${w.contratante} | Status: ${w.status_trabajador} / ${w.status_seguridad} | Ingresso: ${w.data_ingresso} | Baixa: ${w.data_baixa}`);
    });

    // Now let's fetch July 2026 hours for these workers
    const workerIds = intuymaWorkers?.map(w => w.id) || [];
    const { data: hours } = await prodSupabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .select('worker_id, client_id, data_trabalho, horas_totais')
        .in('worker_id', workerIds)
        .gte('data_trabalho', '2026-07-01')
        .lte('data_trabalho', '2026-07-31');

    console.log(`\nJuly 2026 hours count for Intuyma workers: ${hours?.length}`);

    // Map workerId -> sum of hours per client_id
    const workerHoursMap = new Map();
    hours?.forEach(h => {
        if (!workerHoursMap.has(h.worker_id)) workerHoursMap.set(h.worker_id, new Map());
        const cMap = workerHoursMap.get(h.worker_id);
        const cId = h.client_id || 'NO_CLIENT_ID';
        cMap.set(cId, (cMap.get(cId) || 0) + Number(h.horas_totais || 0));
    });

    console.log("\nHours breakdown per worker in July 2026:");
    intuymaWorkers?.forEach(w => {
        const cMap = workerHoursMap.get(w.id);
        console.log(`\n${w.nome}:`);
        if (cMap && cMap.size > 0) {
            cMap.forEach((tot, cId) => {
                console.log(`   Client ID: ${cId} -> ${tot} h`);
            });
        } else {
            console.log(`   NO HOURS in core_finance.horas_trabalhadas for July 2026`);
        }
    });
}

inspectIntuymaWorkers();
