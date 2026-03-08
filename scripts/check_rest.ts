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
    console.log("Checking via REST API bypassing RLS...");

    // Count exact rows
    const res = await fetch(`${supabaseUrl}/rest/v1/worker_beneficios_settings?select=worker_id`, {
        method: 'GET',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Prefer': 'count=exact',
            'Accept-Profile': 'core_personal',
            'Range': '0-0'
        }
    });

    console.log(`Status: ${res.status}`);
    const countHeader = res.headers.get('content-range');
    console.log(`Content-Range (Count): ${countHeader}`);

    if (countHeader) {
        const total = countHeader.split('/')[1];
        if (total === '0') {
            console.log("ZERO ROWS WERE INSERTED! The JOIN in the SQL script probably failed because cod_colab formats didn't match.");
        } else {
            console.log(`${total} rows are present in the table. The Data exists!`);

            // Check one worker example
            const workerReq = await fetch(`${supabaseUrl}/rest/v1/worker_beneficios_settings?select=*&limit=1`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${serviceKey}`, 'Accept-Profile': 'core_personal' }
            });
            const workerData = await workerReq.json();
            console.log("Sample Data:", workerData);
        }
    } else {
        const text = await res.text();
        console.log("Error details:", text);
    }
}

checkRest();
