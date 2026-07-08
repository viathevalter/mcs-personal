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
    const { data: wh, error } = await supabase
      .schema('core_personal')
      .from('worker_hours')
      .select('*')
      .eq('worker_id', santiagoId)
      .eq('period_year', 2026)
      .eq('period_month', 6);

    if (error) {
      console.error(error);
    } else {
      console.log("WORKER_HOURS RECORD:", wh);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
