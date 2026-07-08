import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);
const supabaseUrl = urlMatch ? urlMatch[1] : '';
const supabaseKey = keyMatch ? keyMatch[1] : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: client, error } = await supabase
      .schema('core_common')
      .from('clients')
      .select('*')
      .eq('id', 'a32139d5-517d-cb87-5276-6a19878273c5')
      .single();

    if (error) {
      console.error(error);
    } else {
      console.log("CLIENT DETAIL:", client);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
