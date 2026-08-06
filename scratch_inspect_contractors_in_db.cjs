const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkAnyContractor() {
  const { data: wList } = await supabase
    .schema('core_personal')
    .from('workers')
    .select('id, nome, contractor, created_at')
    .not('contractor', 'is', null);

  console.log('Workers with non-null contractor count:', wList ? wList.length : 0);

  const { data: cppList } = await supabase
    .from('colaborador_por_pedido')
    .select('id, nome_colab, sp_created_by')
    .not('sp_created_by', 'is', null);

  console.log('CPP with non-null sp_created_by count:', cppList ? cppList.length : 0);
}

checkAnyContractor();
