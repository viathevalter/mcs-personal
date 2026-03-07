require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkBachiller() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

    const { data: kpis } = await supabase.rpc('get_client_worker_kpis', {
        p_empresa_id: 'dbbd4a3a-1ed4-4c8d-8a8b-118fa3fc31b8',
        p_cliente_nombre: 'BACHILLER, SA'
    }).schema('core_personal');

    console.log('KPIs for Bachiller:', kpis);

    const { data: w } = await supabase.schema('core_personal').rpc('search_workers', {
        p_empresa_id: "dbbd4a3a-1ed4-4c8d-8a8b-118fa3fc31b8",
        p_cliente_nombre: "BACHILLER",
        p_page: 1,
        p_page_size: 1000
    });

    console.log(`Search Workers returned ${w ? w.length : 0} items for Bachiller.`);
}

checkBachiller();
