const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase
        .schema('core_personal')
        .rpc('get_real_seguridade_status', { p_empresa_id: 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d' });
    if (error) {
        console.error('ERROR FROM SUPABASE:', error);
    } else {
        console.log('DATA:', data);
    }
}
test();
