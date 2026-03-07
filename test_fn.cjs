require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testCache() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data, error } = await supabase.rpc('fn_get_active_client_for_worker', { p_cod_colab: 'E0091' });
    console.log('Result for fn:', data, error);
}

testCache();
