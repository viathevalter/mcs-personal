const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

const workerNames = [
    "JOSE HERNAN RODRIGUEZ",
    "LUIS MIGUEL VEGA FUENTES",
    "CRISTIAN CAMILO BORRE SILVA",
    "HECTOR FABIO VASQUEZ MAYORGA",
    "SERGIO ALONSO ANDRADE CASTRILLON",
    "YEFFERSON ZULUAGA BUITRAGO",
    "BLADIMIRO DIAZ MARTINEZ",
    "JOHN HAROLD PERENGUEZ CUARAN",
    "WILLIAM NORBERTO MELO MELO",
    "GERMAN JOSE GAMBOA FARIAS",
    "GABRIEL CORREIA CARDOZO",
    "ATIRSON JULIACE DA SILVA",
    "ANDRÉ DE MELLO COSTA",
    "ANGINSON ARTURO PETRO SUAREZ",
    "GUBERNEY HURTADO SAUCEDO",
    "ALVARO ENRIQUE ROJAS DE LA OSSA",
    "JIM PAUL CHUNGA LUJAN",
    "NICXON GARCIA FIERRO",
    "CARLOS EDUARDO DE RESENDE SILVA",
    "JHOBERGS JESUS PARRA DE ARCO",
    "YEISON HUGO ANGEL CALDERON",
    "ANDRES CAMILO ALVAREZ CUERVO",
    "ALEX DAVID GOMEZ VILLADA",
    "HERNAN RODRIGUEZ CUY",
    "OSCAR EDUARDO ORTEGA LOPEZ",
    "EDDIE DE JESUS ZARATE IGUARAN",
    "WILMER DE JESUS ARIZA MUÑOZ",
    "ANDRES FELIPE GOMEZ PUERTA",
    "MIGUEL ANGEL CHUQUIZAPON VASQUEZ",
    "LUIS FERNANDO MARTINEZ MACOTT",
    "ARLINTON ENRIQUE CABALLERO PEDROZO",
    "WILSON ALEXANDER HERRERA CHAPARRO",
    "GABRIEL RIBEIRO MARTINS",
    "EDINSON MANUEL DEL TORO MIRANDA",
    "PEDRO ALEXANDER ROJAS RODRIGUES",
    "ALEXANDER GIL HERRERA"
];

async function checkAllHoursSources() {
    const { data: workers } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome, status_trabajador, data_baixa');

    const matched = workers?.filter(w => workerNames.some(name => w.nome && w.nome.trim().toUpperCase().includes(name.trim().toUpperCase())));
    const workerIds = matched?.map(w => w.id) || [];

    // 1. core_finance.horas_trabalhadas (used in HoleritesPage)
    const { data: cfHoras } = await prodSupabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .select('*')
        .gte('data_trabalho', '2026-07-01')
        .lte('data_trabalho', '2026-07-31')
        .in('worker_id', workerIds);

    // 2. core_personal.holerite_eventos
    const { data: eventos } = await prodSupabase
        .schema('core_personal')
        .from('holerite_eventos')
        .select('*')
        .eq('mes_referencia', '2026-07')
        .in('trabalhador_id', workerIds);

    // 3. core_personal.worker_hours (Controle de Horas)
    const { data: workerHours } = await prodSupabase
        .schema('core_personal')
        .from('worker_hours')
        .select('*')
        .eq('period_year', 2026)
        .eq('period_month', 7)
        .in('worker_id', workerIds);

    console.log(`Summary for ${matched?.length} workers in July 2026:`);
    console.log(`core_finance.horas_trabalhadas records: ${cfHoras?.length}`);
    console.log(`core_personal.holerite_eventos records: ${eventos?.length}`);
    console.log(`core_personal.worker_hours records: ${workerHours?.length}`);

    for (const w of matched || []) {
        const cf = cfHoras?.filter(h => h.worker_id === w.id) || [];
        const ev = eventos?.filter(e => e.trabalhador_id === w.id) || [];
        const wh = workerHours?.filter(h => h.worker_id === w.id) || [];

        const cfTotal = cf.reduce((acc, c) => acc + Number(c.horas_totais || 0), 0);
        
        console.log(`Worker: ${w.nome} | Status: ${w.status_trabajador} | Data Baixa: ${w.data_baixa || 'N/A'}`);
        console.log(`   -> core_finance hours sum: ${cfTotal}h (${cf.length} days)`);
        console.log(`   -> holerite_eventos: ${ev.length} events`);
        console.log(`   -> worker_hours (Controle): ${wh.length} records (status: ${wh.map(h => h.status).join(', ')})`);
    }
}

checkAllHoursSources();
