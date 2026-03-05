import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, pasaporte, empresa_id, status_trabajador, cliente_nombre')
        .ilike('nome', '%WILLIAM%');

    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', error);
}

run();
