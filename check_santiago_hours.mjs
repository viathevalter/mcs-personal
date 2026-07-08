import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);
const supabaseUrl = urlMatch ? urlMatch[1] : '';
const supabaseKey = keyMatch ? keyMatch[1] : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const santiagoId = 'faf87cf3-7c36-480f-b60a-916a08947bd3';
  try {
    const { data: hours, error } = await supabase
      .schema('core_finance')
      .from('horas_trabalhadas')
      .select('*')
      .eq('worker_id', santiagoId)
      .gte('data_trabalho', '2026-06-01')
      .lte('data_trabalho', '2026-06-30');

    if (error) {
      console.error(error);
    } else {
      console.log(`FOUND ${hours?.length} HOURS FOR SANTIAGO IN JUNE 2026:`, hours);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
