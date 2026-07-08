const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: obsData } = await supabase.from('cobranca_observacoes').select('*').order('data', { ascending: false }).limit(10);
  console.log('Observations:', obsData);
}
check();
