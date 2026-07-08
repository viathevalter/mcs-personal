import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);
const supabaseUrl = urlMatch ? urlMatch[1] : '';
const supabaseKey = keyMatch ? keyMatch[1] : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const stoccoId = '441f1f5d-aed3-40e3-8c77-7b1217757251';
  try {
    const { data: workers, error } = await supabase
      .schema('core_personal')
      .rpc('get_hours_control_workers', {
        p_empresa_id: stoccoId,
        p_period_year: 2026,
        p_period_month: 6,
        p_contratante: null,
        p_cliente_nombre: null
      });

    if (error) {
      console.error("RPC ERROR:", error);
    } else {
      console.log("WORKERS FROM RPC:", workers);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
