const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function findClientSchema() {
    const schemas = ['core_finance', 'core_personal', 'public'];
    for (const schema of schemas) {
        const { data, error } = await prodSupabase
            .schema(schema)
            .from('clients')
            .select('id, name, razonsocial')
            .limit(5);

        if (!error && data) {
            console.log(`Found clients in schema '${schema}':`, data);
        }
    }

    // Inspect workers with INTUYMA
    const { data: workers, error: wErr } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, cliente_nombre, contratante, status_trabajador, data_ingresso, data_baixa')
        .ilike('cliente_nombre', '%INTUYMA%');

    console.log("\nWorkers with cliente_nombre ILIKE %INTUYMA% count:", workers?.length);
    workers?.forEach(w => {
        console.log(`  ${w.nome.padEnd(35)} | ID: ${w.id} | Contratante: ${w.contratante} | Status: ${w.status_trabajador} | Ingresso: ${w.data_ingresso} | Baixa: ${w.data_baixa}`);
    });
}

findClientSchema();
