import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
}

async function check() {
    const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

    console.log('URL:', supabaseUrl);

    const res1 = await fetch(`${supabaseUrl}/rest/v1/discount_categories?select=*&limit=1`, { headers });
    console.log('public.discount_categories:', res1.status);

    const res2 = await fetch(`${supabaseUrl}/rest/v1/benefit_categories?select=*&limit=1`, { headers });
    console.log('public.benefit_categories:', res2.status);

    const res3 = await fetch(`${supabaseUrl}/rest/v1/core_personal.discount_categories?select=*&limit=1`, { headers });
    console.log('core_personal.discount_categories:', res3.status);

    const res4 = await fetch(`${supabaseUrl}/rest/v1/core_personal.benefit_categories?select=*&limit=1`, { headers });
    console.log('core_personal.benefit_categories:', res4.status);
}
check();
