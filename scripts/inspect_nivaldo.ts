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
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'] || supabaseKey;

async function checkRest() {
    console.log("Checking Nivaldo in worker table...");

    // Check Nivaldo
    const res = await fetch(`${supabaseUrl}/rest/v1/workers?nome=ilike.*nivaldo*&select=id,nome,cod_colab`, {
        method: 'GET',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Accept-Profile': 'core_personal',
        }
    });

    const data = await res.json();
    console.log("Workers matched:", data);

    if (data && data.length > 0) {
        const workerId = data[0].id;
        const cod = data[0].cod_colab;

        console.log(`Worker ID: ${workerId}`);
        console.log(`cod_colab: "${cod}" (length: ${cod.length})`);
        for (let i = 0; i < cod.length; i++) {
            console.log(`Char ${i}: ${cod[i]} (code: ${cod.charCodeAt(i)})`);
        }

        console.log(`Checking tariff for worker_id: ${workerId}`);
        const resSettings = await fetch(`${supabaseUrl}/rest/v1/worker_beneficios_settings?worker_id=eq.${workerId}&select=*`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Accept-Profile': 'core_personal',
            }
        });
        const settingsData = await resSettings.json();
        console.log("Settings found:", settingsData);
    }
}

checkRest();
