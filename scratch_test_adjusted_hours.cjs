const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function testAdjustedHoursCalculation() {
    const startDateStr = '2026-06-01';
    const endDateStr = '2026-07-31';

    // 1. Fetch ALL raw hours in July 2026 with pagination
    let allRows = [];
    let pageIndex = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await prodSupabase
            .schema('core_finance')
            .from('horas_trabalhadas')
            .select('id, worker_id, data_trabalho, horas_totais, fatura_id')
            .gte('data_trabalho', startDateStr)
            .lte('data_trabalho', endDateStr)
            .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

        if (error) {
            console.error("Error fetching horas_trabalhadas:", error);
            break;
        }

        if (data && data.length > 0) {
            allRows = [...allRows, ...data];
            if (data.length < pageSize) {
                hasMore = false;
            } else {
                pageIndex++;
            }
        } else {
            hasMore = false;
        }
    }

    // 2. Fetch all faturas
    const { data: faturas, error: faturesErr } = await prodSupabase
        .schema('core_finance')
        .from('faturas')
        .select('id, status, ajustes_json');

    if (faturesErr) {
        console.error("Error faturas:", faturesErr);
    }

    // Build a map of disputed hours across all faturas
    const globalDisputedHours = new Map(); // key: workerId_dateStr -> hoursVal
    faturas?.forEach(f => {
        const disp = f.ajustes_json?.disputed_hours;
        if (disp && typeof disp === 'object') {
            Object.keys(disp).forEach(wId => {
                const datesObj = disp[wId];
                if (datesObj && typeof datesObj === 'object') {
                    Object.keys(datesObj).forEach(dateStr => {
                        const val = Number(datesObj[dateStr]);
                        globalDisputedHours.set(`${wId}_${dateStr}`, val);
                    });
                }
            });
        }
    });

    console.log(`Loaded ${allRows.length} raw hours rows, ${faturas?.length} faturas, ${globalDisputedHours.size} disputed date entries.`);

    // 3. Compute adjusted hours per worker
    const sumMapRaw = new Map();
    const sumMapAdjusted = new Map();

    allRows.forEach((row) => {
        if (row.worker_id) {
            // Filter strictly for July 2026 for this comparison
            if (!row.data_trabalho?.startsWith('2026-07')) return;

            const rawH = Number(row.horas_totais || 0);
            sumMapRaw.set(row.worker_id, (sumMapRaw.get(row.worker_id) || 0) + rawH);

            const key = `${row.worker_id}_${row.data_trabalho}`;
            let effectiveH = rawH;

            if (globalDisputedHours.has(key)) {
                effectiveH = globalDisputedHours.get(key);
            }

            sumMapAdjusted.set(row.worker_id, (sumMapAdjusted.get(row.worker_id) || 0) + effectiveH);
        }
    });

    // Verify for Segorbe workers
    const segorbeWorkerNames = [
        "SERGIO ANDRES FLOREZ MARIN",
        "EDINSON LOZANO TELLEZ",
        "SEVERO PABON CASTRO",
        "JESUS HEYBER YELA MELO",
        "CARLOS URIEL CASTRO NIEVA",
        "MILTON OMAR MEDINA PANTA"
    ];

    const { data: workers } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome');

    console.log("\n--- Comparison for Segorbe Workers in July 2026 ---");
    let totalRawSum = 0;
    let totalAdjSum = 0;

    segorbeWorkerNames.forEach(name => {
        const w = workers?.find(w => w.nome?.toUpperCase().includes(name));
        if (w) {
            const raw = sumMapRaw.get(w.id) || 0;
            const adj = sumMapAdjusted.get(w.id) || 0;
            totalRawSum += raw;
            totalAdjSum += adj;
            console.log(`Worker: ${w.nome.padEnd(35)} | Raw: ${String(raw).padStart(6)}h  ===>  Adjusted Billed: ${String(adj).padStart(6)}h`);
        } else {
            console.log(`Worker NOT found: ${name}`);
        }
    });

    console.log(`\nTOTAL SEGORBE RAW HOURS: ${totalRawSum}h`);
    console.log(`TOTAL SEGORBE ADJUSTED BILLED HOURS: ${totalAdjSum}h (Exact Expected: 1239.5h)`);
}

testAdjustedHoursCalculation();
