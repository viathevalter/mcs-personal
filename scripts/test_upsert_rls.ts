import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function getEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const urlMatch = content.match(/VITE_SUPABASE_URL=(.*)/);
    const serviceKeyMatch = content.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
    const anonKeyMatch = content.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
    return {
        url: urlMatch ? urlMatch[1].trim() : '',
        key: serviceKeyMatch ? serviceKeyMatch[1].trim() : (anonKeyMatch ? anonKeyMatch[1].trim() : '')
    };
}

async function testRLSAndUpsert() {
    try {
        const env = getEnv();
        const supabase = createClient(env.url, env.key);

        // 1. Get a single worker UUID
        const { data: workerData, error: wError } = await supabase.from('core_personal.workers').select('id, cod_colab').limit(1);

        if (wError) {
            console.error('Error fetching worker', wError);
            return;
        }

        if (workerData && workerData.length > 0) {
            const wid = workerData[0].id;
            console.log('Testing with worker ID:', wid);

            // 2. Perform Upsert EXACTLY like useUpdateWorkerBeneficios
            const { data, error } = await supabase
                .from('core_personal.worker_beneficios_settings')
                .upsert({
                    worker_id: wid,
                    tarifa_hora: 42.00,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'worker_id' })
                .select();

            if (error) {
                console.error('UPSERT ERROR (Likely RLS if not schema):', error);
            } else {
                console.log('UPSERT SUCCESS:', data);
            }
        }
    } catch (e) {
        console.error("Crash:", e);
    }
}

testRLSAndUpsert();
