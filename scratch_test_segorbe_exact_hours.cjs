const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function testExactSegorbeHours() {
    const faturaId = '0a13c056-613f-4d2f-bf9a-8cca12746797';

    // 1. Fetch fatura
    const { data: fatura } = await prodSupabase
        .schema('core_finance')
        .from('faturas')
        .select('*')
        .eq('id', faturaId)
        .single();

    // 2. Fetch hours linked to this fatura
    const { data: faturaHours } = await prodSupabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .select('id, worker_id, data_trabalho, horas_totais, fatura_id')
        .eq('fatura_id', faturaId);

    const disputedHoursMap = fatura.ajustes_json?.disputed_hours || {};

    const { data: workers } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome');

    const workerMap = new Map();
    workers?.forEach(w => workerMap.set(w.id, w.nome));

    // Calculate effective hours
    const workerTotals = new Map();

    // Keyed map for unique date entries
    const entryMap = new Map();

    faturaHours?.forEach(h => {
        const dateKey = h.data_trabalho ? (h.data_trabalho.includes('T') ? h.data_trabalho.split('T')[0] : h.data_trabalho) : '';
        const key = `${h.worker_id}_${dateKey}`;
        const proposed = disputedHoursMap[h.worker_id]?.[dateKey];

        if (proposed !== undefined) {
            entryMap.set(key, Number(proposed));
        } else {
            const existing = entryMap.get(key) || 0;
            entryMap.set(key, existing + Number(h.horas_totais || 0));
        }
    });

    entryMap.forEach((hrs, key) => {
        const [wId] = key.split('_');
        workerTotals.set(wId, (workerTotals.get(wId) || 0) + hrs);
    });

    console.log(`\n--- Exact Billed/Adjusted Hours for Fatura #${fatura.numero_fatura || fatura.id} ---`);
    let grandTotal = 0;

    workerTotals.forEach((totH, wId) => {
        const name = workerMap.get(wId) || wId;
        grandTotal += totH;
        console.log(`Worker: ${name.padEnd(35)} => ${totH}h`);
    });

    console.log(`\nGRAND TOTAL ADJUSTED BILLED HOURS: ${grandTotal}h (Exact Expected: 1239.5h)`);
}

testExactSegorbeHours();
