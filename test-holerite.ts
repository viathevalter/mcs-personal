import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function main() {
    const envFile = fs.readFileSync('.env.local', 'utf-8');
    const lines = envFile.split('\n');
    const supabaseUrl = lines.find(line => line.startsWith('VITE_SUPABASE_URL'))?.split('=')[1]?.trim();
    const supabaseKey = lines.find(line => line.startsWith('VITE_SUPABASE_ANON_KEY'))?.split('=')[1]?.trim();
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const { data: workers } = await supabase.schema('core_personal').from('workers').select('id, nome').ilike('nome', '%ADRIAN CARLOSAMA%');
    console.log('workers:', workers);
    if (!workers || workers.length === 0) return;
    const workerId = workers[0].id;
    
    const {data, error} = await supabase.schema('core_personal').from('worker_discounts').select('*').eq('worker_id', workerId);
    console.log('worker_discounts:', data);
    
    const {data: data2, error: error2} = await supabase.schema('core_personal').from('worker_beneficios_settings').select('*').eq('worker_id', workerId);
    console.log('beneficios:', data2);
    
    const {data: data3, error: error3} = await supabase.schema('core_personal').from('worker_benefit_housing').select('*').eq('worker_id', workerId);
    console.log('housing:', data3);
}

main();
