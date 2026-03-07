require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function getWilliam() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

    const { data, error } = await supabase
        .from('colaborador_por_pedido')
        .select('*')
        .eq('cod_colab', 'E0091');

    console.log(JSON.stringify(data, null, 2));
}

getWilliam();
