import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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
// Using anon key to simulate exactly what the frontend does
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function runSim() {
    console.log("Simulating frontend fetch for E0088...");

    // 1. Get Nivaldo
    const { data: workers, error: wErr } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('*')
        .eq('cod_colab', 'E0088');

    if (wErr || !workers || workers.length === 0) {
        console.log("Could not find worker E0088", wErr);
        return;
    }

    const worker = workers[0];
    console.log("Worker:", worker.id, worker.nome);

    // 2. Get his settings
    const { data: settings, error: sErr } = await supabase
        .schema('core_personal')
        .from('worker_beneficios_settings')
        .select('*')
        .eq('worker_id', worker.id);

    console.log("Settings query error:", sErr);
    console.log("Settings data:", settings);
}

runSim();
