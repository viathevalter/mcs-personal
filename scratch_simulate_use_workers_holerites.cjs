const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function simulateUseWorkersForHolerites() {
    const { data: rawWorkers, error } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('*')
        .order('nome', { ascending: true });

    if (error) {
        console.error("Error:", error);
        return;
    }

    const allWorkersData = rawWorkers
        .filter(w => w.nome && w.nome.trim() !== '')
        .map(w => ({
            ...w,
            cliente_nombre: w.cliente || w.cliente_nombre || null
        }));

    const workerIds = allWorkersData.map(w => w.id).filter(Boolean);

    const chunkSize = 150;
    const settingsMap = new Map();

    for (let i = 0; i < workerIds.length; i += chunkSize) {
        const chunk = workerIds.slice(i, i + chunkSize);
        const { data: settings } = await prodSupabase
            .schema('core_personal')
            .from('worker_beneficios_settings')
            .select('*')
            .in('worker_id', chunk);

        if (settings) {
            settings.forEach(s => settingsMap.set(s.worker_id, s));
        }
    }

    const finalWorkers = allWorkersData.map(w => ({
        ...w,
        worker_beneficios_settings: settingsMap.get(w.id) || null
    }));

    console.log("Total workers loaded for Holerites:", finalWorkers.length);

    // Let's check how many of the 36 user workers are loaded and have hours!
    const targetNames = [
        "ARLINTON", "LUIS MIGUEL VEGA", "NICXON", "GABRIEL CORREIA", "EDINSON MANUEL DEL TORO",
        "PERENGUEZ", "ZULUAGA", "VASQUEZ", "GABRIEL RIBEIRO"
    ];

    const foundTargets = finalWorkers.filter(w => targetNames.some(tn => w.nome.includes(tn)));
    console.log("Target workers in Holerites list:", foundTargets.map(w => ({
        nome: w.nome,
        status: w.status_trabajador,
        data_baixa: w.data_baixa,
        cliente: w.cliente_nombre,
        tarifa: w.worker_beneficios_settings?.tarifa_hora ?? 0
    })));
}

simulateUseWorkersForHolerites();
