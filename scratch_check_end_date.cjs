const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkEndDates() {
  console.log('=== CHECKING INACTIVE WORKERS IN WORKERS TABLE ===');
  const { data: inactiveWorkers } = await supabase
    .schema('core_personal')
    .from('workers')
    .select('id, cod_colab, nome, data_baixa, status_trabajador, created_at')
    .or('status_trabajador.ilike.%baja%,status_trabajador.ilike.%inativo%,data_baixa.not.is.null')
    .limit(10);

  console.log('Inactive workers sample:', inactiveWorkers);

  console.log('\n=== CHECKING COLABORADOR_POR_PEDIDO FOR INACTIVE WORKERS ===');
  const { data: cppInactive } = await supabase
    .from('colaborador_por_pedido')
    .select('cod_colab, nome_colab, fechainiciopedido, fechafinpedido, fechasalidatrabajador, updated_at')
    .not('fechasalidatrabajador', 'is', null)
    .limit(10);

  console.log('CPP inactive sample:', cppInactive);
}

checkEndDates();
