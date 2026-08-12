const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function inspectWorkersTable() {
    const { data: sample, error } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('*')
        .limit(3);

    if (error) console.error("Error:", error);
    else console.log("Sample worker keys:", Object.keys(sample?.[0] || {}));

    const { data: allWorkers } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, cliente_nombre, contratante, status_trabajador, data_ingresso, data_baixa');

    console.log("Total workers count:", allWorkers?.length);

    const intuymaWorkers = allWorkers?.filter(w => (w.cliente_nombre || '').toUpperCase().includes('INTUYMA'));
    console.log(`\nWorkers with cliente_nombre including INTUYMA (${intuymaWorkers?.length}):`);
    intuymaWorkers?.forEach(w => {
        console.log(`  ${w.nome.padEnd(35)} | Contratante: ${w.contratante} | Status: ${w.status_trabajador} | Ingresso: ${w.data_ingresso} | Baixa: ${w.data_baixa}`);
    });
}

inspectWorkersTable();
