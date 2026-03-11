import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: d1, error: e1 } = await supabase.from('discount_categories').select('*').limit(1);
    console.log('public.discount_categories data:', JSON.stringify(d1, null, 2));

    const { data: d2, error: e2 } = await supabase.from('benefit_categories').select('*').limit(1);
    console.log('public.benefit_categories:', d2 ? 'Exists' : 'Error', e2?.message || '');
    if (d2) console.log('public.benefit_categories data:', JSON.stringify(d2, null, 2));
}

check();
