const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('contas_receber').select('id, contas_receber_pagamentos(valor)').limit(1);
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}
check();
