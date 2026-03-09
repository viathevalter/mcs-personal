import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://pyahcgorkvwfwmlzspnv.supabase.co',
    'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx'
);

async function run() {
    const { data: d1, error: e1 } = await supabase.schema('core_personal').from('worker_beneficios_settings').select('*').limit(1);
    console.log('worker_beneficios_settings Error:', e1 ? JSON.stringify(e1) : 'OK');

    const { data: d2, error: e2 } = await supabase.schema('core_personal').from('worker_beneficios_history').select('*').limit(1);
    console.log('worker_beneficios_history Error:', e2 ? JSON.stringify(e2) : 'OK');
}

run();
