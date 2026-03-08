import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const env: Record<string, string> = {};
for (const line of envLines) {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
        env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
    }
}

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'] || supabaseKey;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkTariffs() {
    console.log("Checking records in core_personal.worker_beneficios_settings...");

    // First let's just count
    const { count, error: countError } = await supabase
        .schema('core_personal')
        .from('worker_beneficios_settings')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("Error counting:", countError);
    } else {
        console.log(`Total rows in worker_beneficios_settings: ${count}`);
    }

    // Now get a sample
    const { data: sample, error: fetchError } = await supabase
        .schema('core_personal')
        .from('worker_beneficios_settings')
        .select('*')
        .limit(3);

    if (fetchError) {
        console.error("Error fetching sample:", fetchError);
    } else {
        console.log("Sample rows:");
        console.log(JSON.stringify(sample, null, 2));
    }
}

checkTariffs();
