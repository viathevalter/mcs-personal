const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkHiringUserFields() {
  console.log('=== CHECKING WORKER_ASSIGNMENTS SCHEMA ===');
  const { data: cols } = await supabase
    .rpc('get_hours_control_workers', { p_empresa_id: null, p_period_year: 2026, p_period_month: 7, p_contratante: null, p_cliente_nombre: null })
    .limit(5);

  // Check information_schema for worker_assignments
  const { data: assignCols } = await supabase
    .from('colaborador_por_pedido')
    .select('id, sp_created_by, sp_created, contratante, nome_colab')
    .not('sp_created_by', 'is', null)
    .limit(10);

  console.log('CPP with non-null sp_created_by:', assignCols);

  // Check auth profiles or users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email');

  console.log('Profiles in DB:', profiles);
}

checkHiringUserFields();
