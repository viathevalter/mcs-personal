require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const EMPRESA_ID = '827bbf0d-5119-4e60-bc47-2938a2782472';

async function checkKpis() {
    const { data, error } = await supabase.schema('core_personal').rpc('search_workers', {
        p_empresa_id: EMPRESA_ID,
        p_status_trabajador_filter: ['ativos'],
        p_page_size: 5000
    });

    if (error) {
        console.error('Erro fatal:', error);
        return;
    }

    if (!data) {
        console.log('Nenhum dado retornado.');
        return;
    }

    console.log(`Buscados ${data.length} trabalhadores ativos via RPC.`);

    const clientCount = {};
    for (const d of data) {
        const cnome = d.cliente_nombre ? d.cliente_nombre.toUpperCase() : 'SEM CLIENTE';
        clientCount[cnome] = (clientCount[cnome] || 0) + 1;
    }

    console.log(clientCount);
}

checkKpis();
