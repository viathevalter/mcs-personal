import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('core_personal.discount_categories').select('*').limit(1);
    console.log('discount_categories:', data ? 'Exists' : 'Error', error?.message);

    const { data: d2, error: e2 } = await supabase.from('core_personal.benefit_categories').select('*').limit(1);
    console.log('benefit_categories:', d2 ? 'Exists' : 'Error', e2?.message);

    const { data: d3, error: e3 } = await supabase.from('discount_categories').select('*').limit(1);
    console.log('public.discount_categories:', d3 ? 'Exists' : 'Error', e3?.message);
}

check();
