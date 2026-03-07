require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function getDefinitions() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

    const { data: w } = await supabase.schema('core_personal').from('workers').select('id, nome, empresa_id').ilike('nome', '%WILLIAM MORAIS%').limit(1);
    console.log("Worker:", w);

    if (w && w.length > 0) {
        const { data, error } = await supabase.schema('core_personal').rpc('search_workers', {
            p_empresa_id: w[0].empresa_id,
            p_search: "WILLIAM MORAIS"
        });
        console.log(`Payload for William:`, JSON.stringify(data, null, 2));
    }
}

getDefinitions();
