const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: contas, error: err1 } = await supabase.from('contas_receber').select('id').limit(1);
  if (!contas || contas.length === 0) {
      console.log('No contas_receber found');
      return;
  }
  const id = contas[0].id;
  
  const obs = {
      conta_receber_id: id,
      usuario: 'TestUser',
      descricao: 'Teste manual de obs',
      tipo: 'teste',
      data: new Date().toISOString()
  };
  
  const { error } = await supabase.from('cobranca_observacoes').insert([obs]);
  console.log('Insert error:', error);
  
  const { data: obsData } = await supabase.from('cobranca_observacoes').select('*').limit(5);
  console.log('Observations:', obsData);
}
check();
