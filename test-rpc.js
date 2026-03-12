import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  db: { schema: 'core_personal' }
});

async function run() {
  const { data, error } = await supabase.rpc('fn_get_active_client_for_worker_json', { p_cod_colab: 'E0075' });
  console.log('Error:', error);
  console.log('Data Type:', typeof data);
  console.log('Is Array?', Array.isArray(data));
  console.log('Data:', JSON.stringify(data, null, 2));
}

run();
