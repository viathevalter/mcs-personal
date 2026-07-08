import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.vercel.pull', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);
const supabaseUrl = urlMatch ? urlMatch[1] : '';
const supabaseKey = keyMatch ? keyMatch[1] : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data, error } = await supabase
      .schema('core_finance')
      .from('faturas')
      .select('id, client_id, status, created_at, magic_link_token');
      
    if (error) {
      console.error(error);
    } else {
      console.log("FATURAS IN DB:", data);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
