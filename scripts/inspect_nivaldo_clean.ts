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
    console.log("== CHECKING NIVALDO TARIFF ==");
    const workerId = "5406d631-0ec0-421a-a729-c1a0e8efdf5c";

    try {
        const resSettings = await fetch(`${supabaseUrl}/rest/v1/worker_beneficios_settings?worker_id=eq.${workerId}&select=*`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Accept-Profile': 'core_personal',
            }
        });

        const settingsData = await resSettings.json();
        console.log(JSON.stringify(settingsData, null, 2));
    } catch (err) {
        console.error(err);
    }
}

checkRest();
