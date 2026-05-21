require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const namesToSearch = [
    "ELVIN ALEX POLO",
    "DAVIDSON SOARES DE SOUZA",
    "JAIR PLAZA AGUILAR",
    "RICHARD ANTONIO GUERRA HERRERA",
    "ROMER DAVID RODRIGUEZ GONZALEZ",
    "FREDY GONZALEZ MAMANI",
    "ALEJANDRO RIOS"
];

async function run() {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'valter@gestaologinpro.com',
        password: 'stkrt@2026'
    });
    
    if (authErr) {
        console.error("Auth error:", authErr.message);
        return;
    }

    console.log("Logged in Mastercorp Pro.");

    for (const name of namesToSearch) {
        console.log('\n--- Searching for ' + name + ' ---');
        
        // Let's search inside core_personal.workers
        const { data: workers, error: errW } = await supabase
            .schema('core_personal')
            .from('workers')
            .select('id, cod_colab, nome, cliente_id, empresa_id')
            .ilike('nome', '%' + name.split(' ')[0] + '%');

        if (errW) {
            console.error("Error workers:", errW.message);
        } else if (workers && workers.length > 0) {
            console.log("Found in workers:", workers.map(w => ({ cod: w.cod_colab, nome: w.nome })));
        } else {
            console.log("Not found in core_personal.workers.");
        }

        // And public.colaboradores
        const { data: cols, error: errC } = await supabase
            .schema('public')
            .from('colaboradores')
            .select('cod_colab, nombre_y_apellidos')
            .ilike('nombre_y_apellidos', '%' + name.split(' ')[0] + '%');
            
        if (cols && cols.length > 0) {
            console.log("Found in public.colaboradores:", cols.map(c => ({ cod: c.cod_colab, nome: c.nombre_y_apellidos })));
        } else {
            console.log("Not found in public.colaboradores.");
        }
    }
}

run();
