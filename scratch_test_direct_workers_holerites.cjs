const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function testDirectWorkersForHolerites() {
    const { data: workers, error } = await prodSupabase
        .schema('core_personal')
        .from('workers')
        .select('*');

    console.log("Direct workers query count:", workers?.length, error?.message || 'NONE');

    // Map `cliente` to `cliente_nombre` for frontend compatibility
    const mapped = workers?.map(w => ({
        ...w,
        cliente_nombre: w.cliente || w.cliente_nombre || null
    }));

    const targetNames = ["ARLINTON", "LUIS MIGUEL VEGA", "NICXON", "GABRIEL CORREIA", "EDINSON MANUEL DEL TORO"];
    const found = mapped?.filter(w => targetNames.some(tn => w.nome.includes(tn)));
    
    console.log("Found target workers:", found?.map(w => ({
        nome: w.nome,
        cod: w.cod_colab,
        status: w.status_trabajador,
        data_baixa: w.data_baixa,
        cliente_nombre: w.cliente_nombre,
        contratante: w.contratante
    })));
}

testDirectWorkersForHolerites();
