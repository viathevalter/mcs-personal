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

async function checkWorkerHours() {
    const { data: workers } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome, status_trabajador, data_baixa');

    const matched = workers?.filter(w => workerNames.some(name => w.nome && w.nome.trim().toUpperCase().includes(name.trim().toUpperCase())));

    const workerIds = matched?.map(w => w.id) || [];

    const { data: workerHours, error } = await prodSupabase
        .schema('core_personal')
        .from('worker_hours')
        .select('*')
        .in('worker_id', workerIds)
        .eq('period_year', 2026)
        .eq('period_month', 7);

    console.log(`Found ${workerHours?.length} worker_hours records for July 2026!`, error?.message || '');

    for (const w of matched || []) {
        const wh = workerHours?.filter(h => h.worker_id === w.id) || [];
        console.log(`Worker: ${w.nome} | Status: ${w.status_trabajador} | Data Baixa: ${w.data_baixa || 'N/A'}`);
        for (const h of wh) {
            console.log(`   -> Record ID: ${h.id} | Status: ${h.status} | Horas Total/Extracao:`, h.hours_summary || h.total_horas || h);
        }
    }
}

checkWorkerHours();
