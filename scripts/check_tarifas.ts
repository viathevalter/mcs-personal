import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://omfbslzvcdqydpsivbhm.supabase.co'; // Default from project usually
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '...'; // I will read .env.local

import * as fs from 'fs';
import * as path from 'path';

function getEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const urlMatch = content.match(/VITE_SUPABASE_URL=(.*)/);
    const keyMatch = content.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
    return {
        url: urlMatch ? urlMatch[1].trim() : '',
        key: keyMatch ? keyMatch[1].trim() : ''
    };
}

async function check() {
    const env = getEnv();
    const supabase = createClient(env.url, env.key);

    // Check how many rows exist in worker_beneficios_settings
    const { count, error: countErr } = await supabase
        .schema('core_personal')
        .from('worker_beneficios_settings')
        .select('*', { count: 'exact', head: true });

    console.log('Total worker_beneficios_settings rows:', count, countErr);

    const { data: sample, error: sampleErr } = await supabase
        .schema('core_personal')
        .from('worker_beneficios_settings')
        .select('worker_id, tarifa_hora')
        .limit(10);

    console.log('Sample rows:', sample, sampleErr);
}

check();
