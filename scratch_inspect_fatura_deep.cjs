const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function inspectFaturaDetailDeep() {
    const { data: fatura } = await prodSupabase
        .schema('core_finance')
        .from('faturas')
        .select('*')
        .eq('id', '0a13c056-613f-4d2f-bf9a-8cca12746797')
        .single();

    console.log("Fatura keys:", Object.keys(fatura));
    console.log("ajustes_json:", JSON.stringify(fatura.ajustes_json, null, 2));

    // Check if there are other tables in core_finance related to faturas
    const { data: items } = await prodSupabase
        .schema('core_finance')
        .from('fatura_itens')
        .select('*')
        .eq('fatura_id', fatura.id);

    console.log("fatura_itens count:", items?.length);
    if (items?.length) console.log("fatura_itens sample:", items[0]);
}

inspectFaturaDetailDeep();
