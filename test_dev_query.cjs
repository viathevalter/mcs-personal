const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying cobranca_observacoes...');
  const { data, error } = await supabase
    .from('cobranca_observacoes')
    .select('conta_receber_id, data');
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Query succeeded! Loaded', data.length, 'observations.');
  }
}

run();
