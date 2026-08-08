const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function inspectFaturasDetailed() {
    const { data: faturas } = await prodSupabase
        .schema('core_finance')
        .from('faturas')
        .select('*');

    for (const f of faturas || []) {
        console.log(`Fatura #${f.numero_fatura || f.id} | Status: ${f.status} | ClientID: ${f.client_id} | TotalHoras: ${f.total_horas}`);
        if (f.ajustes_json) {
            console.log("   ajustes_json:", JSON.stringify(f.ajustes_json).substring(0, 300));
        }
    }
}

inspectFaturasDetailed();
