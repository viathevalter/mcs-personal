const { createClient } = require('@supabase/supabase-js');

const url = 'https://unbepkdzvsfvylnysrcq.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw';

const supabase = createClient(url, anonKey);

async function run() {
    const selectedEmpresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco
    
    console.log("Running inactive workers query...");
    const { data, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, nif, dni, email, movil, funcion, cod_colab, status_trabajador')
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
