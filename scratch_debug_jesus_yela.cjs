const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function debugJesusYela() {
    const { data: worker } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('*')
        .ilike('nome', '%JESUS HEYBER YELA MELO%')
        .single();

    console.log("Worker found:", worker.nome, "ID:", worker.id);

    // 1. Check holerite_eventos for July 2026
    const { data: eventos } = await prodSupabase
        .schema('core_personal')
        .from('holerite_eventos')
        .select('*')
        .eq('trabalhador_id', worker.id)
        .eq('mes_referencia', '2026-07');

    console.log(`\nholerite_eventos for ${worker.nome} in 2026-07:`, eventos?.length);
    eventos?.forEach(e => {
        console.log(`  Event ID: ${e.id} | Categoria: ${e.categoria} | Tipo: ${e.tipo} | Desc: ${e.descricao} | Valor: ${e.valor} | Ref/Hrs: ${e.horas_referencia || e.referencia_dias_horas}`);
    });

    // 2. Check horas_trabalhadas for July 2026
    const { data: horas } = await prodSupabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .select('*')
        .eq('worker_id', worker.id)
        .gte('data_trabalho', '2026-07-01')
        .lte('data_trabalho', '2026-07-31');

    console.log(`\nhoras_trabalhadas count for ${worker.nome} in 2026-07:`, horas?.length);

    let rawSum = 0;
    horas?.forEach(h => {
        rawSum += Number(h.horas_totais || 0);
        console.log(`  Date: ${h.data_trabalho} | Hours: ${h.horas_totais} | FaturaID: ${h.fatura_id}`);
    });
    console.log(`Raw horas sum: ${rawSum}h`);

    // 3. Check faturas linked to these fatura_ids
    const faturaIds = Array.from(new Set(horas?.map(h => h.fatura_id).filter(Boolean)));
    console.log("\nFatura IDs linked:", faturaIds);

    const { data: faturas } = await prodSupabase
        .schema('core_finance')
        .from('faturas')
        .select('*')
        .in('id', faturaIds);

    faturas?.forEach(f => {
        console.log(`\nFatura ID: ${f.id} | Status: ${f.status} | Numero: ${f.fatura_numero || f.numero_fatura}`);
        console.log("   disputed_hours for Jesus:", JSON.stringify(f.ajustes_json?.disputed_hours?.[worker.id], null, 2));
    });
}

debugJesusYela();
