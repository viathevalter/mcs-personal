const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const obs = {
      conta_receber_id: "1",
      usuario: 'TestUserString',
      descricao: 'Teste manual string ID',
      tipo: 'teste',
      data: new Date().toISOString()
  };
  
  const { error } = await supabase.from('cobranca_observacoes').insert([obs]);
  console.log('Insert error with string ID:', error);
}
check();
