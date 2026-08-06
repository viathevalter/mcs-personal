const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSeguridadeStatus() {
  console.log('=== CHECKING STATUS_SEGURIDAD IN WORKERS ===');
  const { data: workers } = await supabase
    .schema('core_personal')
    .from('workers')
    .select('id, cod_colab, nome, status_seguridad, status_trabajador')
    .limit(20);

  console.log('Sample workers:', workers);

  const { data: rpcWorkers } = await supabase
    .schema('core_personal')
    .rpc('get_hours_control_workers', {
      p_empresa_id: null,
      p_period_year: 2026,
      p_period_month: 7,
      p_contratante: null,
      p_cliente_nombre: null
    });

  const statuses = new Set((rpcWorkers || []).map(w => w.status_seguridad));
  console.log('Distinct status_seguridad values in RPC:', Array.from(statuses));
}

checkSeguridadeStatus();
