const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function testCorrectedSummaryLogic() {
    const startDateStr = '2026-06-01';
    const endDateStr = '2026-07-31';

    // 1. Fetch all rows in July 2026
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

        if (error) break;

        if (data && data.length > 0) {
            allRows = [...allRows, ...data];
            if (data.length < pageSize) hasMore = false;
            else pageIndex++;
        } else hasMore = false;
    }

    // 2. Fetch all faturas
    const { data: faturas } = await prodSupabase
        .schema('core_finance')
        .from('faturas')
        .select('id, status, ajustes_json');

    const globalDisputedHours = new Map();
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

    // Corrected grouping logic:
    // First, group raw hours by worker_id + dateKey to sum raw hours for that date.
    // THEN, if globalDisputedHours has the key, override the entire day's hours with the disputed value!
    const dailyRawMap = new Map(); // key: workerId_dateStr -> raw sum
    const dailyEffectiveMap = new Map(); // key: workerId_dateStr -> effective sum
    const adjustedWorkerIds = new Set();

    allRows.forEach(row => {
        if (row.worker_id && row.data_trabalho) {
            const dateKey = row.data_trabalho.includes('T') ? row.data_trabalho.split('T')[0] : row.data_trabalho;
            if (!dateKey.startsWith('2026-07')) return;

            const key = `${row.worker_id}_${dateKey}`;
            const rawH = Number(row.horas_totais || 0);

            const prevRaw = dailyRawMap.get(key) || 0;
            dailyRawMap.set(key, prevRaw + rawH);
        }
    });

    dailyRawMap.forEach((rawDayVal, key) => {
        const [wId] = key.split('_');
        let effectiveDayVal = rawDayVal;

        if (globalDisputedHours.has(key)) {
            effectiveDayVal = globalDisputedHours.get(key);
            adjustedWorkerIds.add(wId);
        }

        dailyEffectiveMap.set(key, effectiveDayVal);
    });

    // Now sum totals per worker
    const sumMap = new Map();
    const rawSumMap = new Map();

    dailyRawMap.forEach((rawVal, key) => {
        const [wId] = key.split('_');
        rawSumMap.set(wId, (rawSumMap.get(wId) || 0) + rawVal);
    });

    dailyEffectiveMap.forEach((effVal, key) => {
        const [wId] = key.split('_');
        sumMap.set(wId, (sumMap.get(wId) || 0) + effVal);
    });

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

    console.log("\n--- Corrected Totals for Segorbe Workers in July 2026 ---");
    segorbeWorkerNames.forEach(name => {
        const w = workers?.find(w => w.nome?.toUpperCase().includes(name));
        if (w) {
            const raw = rawSumMap.get(w.id) || 0;
            const eff = sumMap.get(w.id) || 0;
            const isAdj = adjustedWorkerIds.has(w.id);
            console.log(`Worker: ${w.nome.padEnd(35)} | Raw: ${String(raw).padStart(6)}h ==> Effective Billed: ${String(eff).padStart(6)}h | Adjusted: ${isAdj}`);
        }
    });
}

testCorrectedSummaryLogic();
