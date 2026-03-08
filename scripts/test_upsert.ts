import { createClient } from '@supabase/supabase-js';
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

async function testUpsert() {
    try {
        const env = getEnv();
        const supabase = createClient(env.url, env.key);

        const { data: workerData } = await supabase.from('core_personal.workers').select('id, cod_colab').limit(1);
        if (workerData && workerData.length > 0) {
            const wid = workerData[0].id;
            console.log('Got worker ID:', wid);

            const { data, error } = await supabase
                .from('core_personal.worker_beneficios_settings')
                .upsert({ worker_id: wid, tarifa_hora: 15.00 }, { onConflict: 'worker_id' })
                .select();

            console.log('Upsert result:', data);
            if (error) {
                console.log('Upsert ERROR:', error);
            }
        }
    } catch (e) {
        console.error("Crash:", e);
    }
}

testUpsert();
