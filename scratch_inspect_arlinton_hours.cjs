const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function inspectHoursTables() {
    const { data: arlinton } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('*')
        .ilike('nome', '%ARLINTON%');

    console.log("Arlinton worker details:", arlinton);

    if (!arlinton || arlinton.length === 0) return;
    const workerId = arlinton[0].id;

    // Check all tables where hours might be stored:
    // 1. core_operacoes.horas_trabalhadas
    const { data: ht } = await prodSupabase
        .schema('core_operacoes')
        .from('horas_trabalhadas')
        .select('*')
        .eq('trabalhador_id', workerId);
    console.log("horas_trabalhadas for Arlinton:", ht);

    // 2. core_personal.holerite_eventos
    const { data: he } = await prodSupabase
        .schema('core_personal')
        .from('holerite_eventos')
        .select('*')
        .eq('trabalhador_id', workerId);
    console.log("holerite_eventos for Arlinton:", he);

    // 3. Let's check timesheet tables or any other table containing hours
    const { data: publicHt } = await prodSupabase
        .from('horas_trabalhadas')
        .select('*')
        .eq('trabalhador_id', workerId);
    console.log("public.horas_trabalhadas for Arlinton:", publicHt);
}

inspectHoursTables();
