const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function testContratanteFiltering() {
    const { data: workers, error } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, contratante, cliente');

    console.log("Total workers fetched:", workers?.length, error?.message || 'NONE');

    const contratanteMap = {};
    workers?.forEach(w => {
        const c = String(w.contratante || 'SEM_EMPRESA').toUpperCase().trim();
        contratanteMap[c] = (contratanteMap[c] || 0) + 1;
    });

    console.log("Distribution by contratante:", contratanteMap);
}

testContratanteFiltering();
