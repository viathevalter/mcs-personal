import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

async function run() {
    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/`, { headers });
    const spec = await res.json();
    fs.writeFileSync('spec.json', JSON.stringify(spec, null, 2));
    console.log('Spec written to spec.json, keys:', Object.keys(spec));
}

run();
