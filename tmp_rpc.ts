import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

// The app's exact query
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.rpc('search_workers', {
        p_empresa_id: 'default_or_actual_id', // Might need a real ID, let's omit if not required
        p_page: 1,
        p_page_size: 1
    });

    console.log("Error:", error);
    if (data && data.length > 0) {
        console.log("Column keys returned by RPC:", Object.keys(data[0]));
    }
}
check();
