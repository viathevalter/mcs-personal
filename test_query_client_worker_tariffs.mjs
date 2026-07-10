import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.production.local', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);
const supabaseUrl = urlMatch ? urlMatch[1] : '';
const supabaseKey = keyMatch ? keyMatch[1] : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const clientId = '2fb4fc3c-915b-2c03-2ea7-b2b392d52059';
  try {
    const { data: tariffs, error: tariffsError } = await supabase
      .schema('core_common')
      .from('client_worker_tariffs')
      .select(`
        *,
        site:client_site_id ( id, name )
      `)
      .eq('client_id', clientId);

    if (tariffsError) {
      console.error("Tariffs query failed:", tariffsError);
      return;
    }

    console.log(`Found ${tariffs.length} exceptions. Fetching workers...`);

    const workerIds = Array.from(new Set(tariffs.map(t => t.worker_id).filter(Boolean)));
    
    let workers = [];
    if (workerIds.length > 0) {
      const { data, error: workersError } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, cod_colab, funcion')
        .in('id', workerIds);

      if (workersError) {
        console.error("Workers query failed:", workersError);
        return;
      }
      workers = data || [];
    }

    const workersMap = new Map(workers.map(w => [w.id, w]));
    const merged = tariffs.map(t => ({
      ...t,
      worker: workersMap.get(t.worker_id) || null
    }));

    console.log("Merged results:");
    console.log(JSON.stringify(merged, null, 2));

  } catch (e) {
    console.error("Crash:", e);
  }
}

test();
