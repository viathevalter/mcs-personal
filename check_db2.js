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
    const { data, error } = await supabase.from('core_personal.discount_categories').select('*').limit(1);
    console.log('core_personal.discount_categories:', data ? 'Exists' : 'Error', error?.message || '');

    const { data: d2, error: e2 } = await supabase.from('core_personal.benefit_categories').select('*').limit(1);
    console.log('core_personal.benefit_categories:', d2 ? 'Exists' : 'Error', e2?.message || '');

    const { data: d3, error: e3 } = await supabase.from('discount_categories').select('*').limit(1);
    console.log('public.discount_categories:', d3 ? 'Exists' : 'Error', e3?.message || '');

    const { data: d4, error: e4 } = await supabase.from('discount_types').select('*').limit(1);
    console.log('public.discount_types:', d4 ? 'Exists' : 'Error', e4?.message || '');

    const { data: d5, error: e5 } = await supabase.from('core_personal.discount_types').select('*').limit(1);
    console.log('core_personal.discount_types:', d5 ? 'Exists' : 'Error', e5?.message || '');
}

check();
