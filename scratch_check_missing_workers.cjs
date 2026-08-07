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

async function checkMissingWorkers() {
    const { data: workers, error } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome, status_trabajador, data_baixa');

    console.log("Total DB workers:", workers?.length, error?.message || '');

    const matched = workers?.filter(w => workerNames.some(name => w.nome && w.nome.trim().toUpperCase().includes(name.trim().toUpperCase())));

    console.log(`Matched ${matched?.length} out of ${workerNames.length} workers in DB.`);

    const workerIds = matched?.map(w => w.id) || [];

    // Check July 2026 hours in core_operacoes.horas_trabalhadas
    const { data: hours } = await prodSupabase
        .schema('core_operacoes')
        .from('horas_trabalhadas')
        .select('trabalhador_id, total_horas, mes, ano')
        .in('trabalhador_id', workerIds)
        .eq('mes', 7)
        .eq('ano', 2026);

    console.log(`Found ${hours?.length} hours records for these workers in July 2026.`);

    for (const w of matched || []) {
        const wHours = hours?.filter(h => h.trabalhador_id === w.id) || [];
        const totalH = wHours.reduce((acc, curr) => acc + (Number(curr.total_horas) || 0), 0);
        console.log(`Worker: ${w.nome} | Status: ${w.status_trabajador} | Data Baixa: ${w.data_baixa || 'N/A'} | July 2026 Hours: ${totalH}h`);
    }
}

checkMissingWorkers();
