const { createClient } = require('@supabase/supabase-js');

const url = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const anonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

const supabase = createClient(url, anonKey);

async function run() {
    const selectedEmpresaId = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'; // Stocco
    
    console.log("Running inactive workers query in DEV...");
    const { data, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, nif, status_trabajador')
        .eq('empresa_id', selectedEmpresaId)
        .or('status_trabajador.is.null,status_trabajador.not.in.("Ativo","Activo","ATIVO","ACTIVO")');

    if (error) {
        console.error("QUERY ERROR:", error);
    } else {
        console.log("QUERY SUCCESS! Found count:", data ? data.length : 0);
        console.log("First 3 rows:", data ? data.slice(0, 3) : []);
    }
}
run();
