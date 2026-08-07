const { createClient } = require('@supabase/supabase-js');

const prodSupabase = createClient(
    'https://unbepkdzvsfvylnysrcq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

async function testWithAllStatuses() {
    const { data: withStatuses, error } = await prodSupabase
        .schema('core_personal')
        .rpc('search_workers', {
            p_empresa_id: null,
            p_search: null,
            p_cliente_nombre: null,
            p_status_trabajador_filter: ['ativos', 'pendientes_ingreso', 'inativos', 'baixa', 'Inativo', 'INATIVO', 'Ativo', 'ATIVO'],
            p_status_seguridad_filter: null,
            p_contratante: null,
            p_funcion: null,
            p_sort_column: 'nome',
            p_sort_direction: 'asc',
            p_page: 1,
            p_page_size: 1000
        });

    console.log("Total search_workers with explicit status array:", withStatuses?.length, error?.message || '');

    const targetNames = ["ARLINTON", "LUIS MIGUEL VEGA", "NICXON", "GABRIEL CORREIA"];
    const found = withStatuses?.filter(w => targetNames.some(tn => w.nome.includes(tn)));
    console.log("Found in search_workers with explicit statuses:", found?.map(w => `${w.nome} (status: ${w.status_trabajador})`));
}

testWithAllStatuses();
