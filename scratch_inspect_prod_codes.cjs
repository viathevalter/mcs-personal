const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function testProdFixed() {
    const { data: prodWorkers, error } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome, cliente, contratante');

    console.log("PROD Total workers fetched:", prodWorkers?.length || 0, "Error:", error?.message || 'NONE');

    const targetCodes = ['E2199', 'E2193', 'E0462', 'E0449', 'E1454', 'E1726'];
    
    for (const t of targetCodes) {
        const match = prodWorkers?.find(w => w.cod_colab === t || (w.cod_colab && w.cod_colab.includes(t.replace('E', ''))));
        console.log(`Searching PROD for '${t}':`, match ? `${match.cod_colab} (${match.nome}) - contratante: ${match.contratante}` : 'NOT FOUND IN PROD!');
    }
}

testProdFixed();
