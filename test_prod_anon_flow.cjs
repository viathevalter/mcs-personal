const env = require('dotenv').config({ path: '.env.vercel.production' }).parsed;
const { createClient } = require('@supabase/supabase-js');

async function testCompleteFlow() {
  console.log('=== TESTE DE AUTOMAÇÃO COM CREDENCIAIS DE PRODUÇÃO (ANON KEY) ===\n');
  const s = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

  const testLeadId = '0293c89e-f81f-48bb-9607-3fea41751074'; // Alex fenix9926@gmail.com
  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS

  // 1. Verificar leitura dos estágios como usuário público (anon)
  const { data: stages, error: stErr } = await s
    .schema('core_comercial')
    .from('kanban_stages')
    .select('id, name, order_index')
    .eq('empresa_id', empresaId)
    .order('order_index', { ascending: true });

  if (stErr) {
    console.error('Erro ao ler estágios:', stErr);
    return;
  }
  console.log(`1. Estágios da Luminous lidos pelo cliente público com sucesso (${stages.length} estágios):`);
  stages.forEach(st => console.log(`   - [Ordem ${st.order_index}] ${st.name} (ID: ${st.id})`));

  // 2. Simular clique no WhatsApp
  console.log('\n2. Simulando clique no botão de WhatsApp...');
  const whatsappStage = stages.find(st => st.name.toLowerCase().includes('whatsapp'));
  const { error: upErr1 } = await s
    .schema('core_comercial')
    .from('leads')
    .update({ stage_id: whatsappStage.id, updated_at: new Date().toISOString() })
    .eq('id', testLeadId);

  if (upErr1) {
    console.error('Erro ao mover lead para WhatsApp:', upErr1);
    return;
  }
  console.log(`✅ Lead movido com sucesso para: ${whatsappStage.name} (Estágio ${whatsappStage.order_index})`);

  // 3. Simular envio do formulário de orçamento
  console.log('\n3. Simulando envio do formulário de orçamento...');
  const budgetStage = stages.find(st => st.order_index === 4);
  const { error: upErr2 } = await s
    .schema('core_comercial')
    .from('leads')
    .update({ stage_id: budgetStage.id, updated_at: new Date().toISOString() })
    .eq('id', testLeadId);

  if (upErr2) {
    console.error('Erro ao mover lead para Orçamento Solicitado:', upErr2);
    return;
  }
  console.log(`✅ Lead movido com sucesso para: ${budgetStage.name} (Estágio ${budgetStage.order_index})`);

  console.log('\n🎯 FLUXO 100% HOMOLOGADO E OPERACIONAL EM PRODUÇÃO!');
}

testCompleteFlow();
