const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const bancoToSave = {
      nome_banco: "TESTE",
      empresa_id: 1,
      agencia: "",
      conta: "",
      iban: "",
      ativo: true,
  };
  const { data, error } = await supabase.from('bancos').insert([bancoToSave]).select('*');
  console.log('Error:', JSON.stringify(error, null, 2));
  console.log('Data:', data);
}
check();
