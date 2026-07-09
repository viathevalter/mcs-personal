const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Counting by status...');
  const { data, error } = await supabase
    .from('contas_receber')
    .select('status');
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const counts = {};
  data.forEach(r => {
    const s = r.status || 'null';
    counts[s] = (counts[s] || 0) + 1;
  });

  console.log('Status counts in DEV:', counts);
}

run();
