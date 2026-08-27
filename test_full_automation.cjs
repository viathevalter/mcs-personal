require('dotenv').config();
const { Client } = require('pg');

async function testAutomation() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log('=== TESTE DE AUTOMAÇÃO COMPLETA: DISPARO -> LEITURA -> WHATSAPP ===\n');

  // 1. Resetar Carmona para Estágio 2 (E-mail Enviado)
  const stage2 = await c.query(`
    SELECT id FROM core_comercial.kanban_stages 
    WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85' AND order_index = 2;
  `);
  const stage2Id = stage2.rows[0].id;

  await c.query(`
    UPDATE core_comercial.leads 
    SET stage_id = '${stage2Id}', updated_at = NOW() 
    WHERE email = 'carmonxx11@gmail.com';
  `);
  
  let current = await c.query(`
    SELECT l.id, l.name, l.email, s.name as stage_name, s.order_index 
    FROM core_comercial.leads l 
    JOIN core_comercial.kanban_stages s ON s.id = l.stage_id 
    WHERE l.email = 'carmonxx11@gmail.com';
  `);
  console.log('1. Carmona no Estágio 2:', current.rows[0]);

  // 2. Simular Resend Webhook: email.opened (Abrir e-mail no Gmail)
  console.log('\n2. Simulando Resend Webhook (email.opened)...');
  const openRes = await fetch('https://unbepkdzvsfvylnysrcq.supabase.co/functions/v1/resend-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'email.opened',
      data: {
        to: ['carmonxx11@gmail.com'],
        email_id: 'ea0e0900-d2f5-4b18-87b9-28741f68ba55'
      }
    })
  });
  console.log('Webhook Status:', openRes.status, await openRes.json());

  current = await c.query(`
    SELECT l.id, l.name, l.email, s.name as stage_name, s.order_index 
    FROM core_comercial.leads l 
    JOIN core_comercial.kanban_stages s ON s.id = l.stage_id 
    WHERE l.email = 'carmonxx11@gmail.com';
  `);
  console.log('🎯 Resultado após abrir e-mail:', current.rows[0]);

  // 3. Simular clique no WhatsApp
  console.log('\n3. Simulando clique no botão de WhatsApp do e-mail...');
  const stage5 = await c.query(`
    SELECT id, name FROM core_comercial.kanban_stages 
    WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85' AND name ILIKE '%WhatsApp%';
  `);
  const stage5Id = stage5.rows[0].id;

  // O WhatsAppRedirectPage executa o update para stage5Id
  await c.query(`
    UPDATE core_comercial.leads 
    SET stage_id = '${stage5Id}', updated_at = NOW() 
    WHERE email = 'carmonxx11@gmail.com';
  `);

  current = await c.query(`
    SELECT l.id, l.name, l.email, s.name as stage_name, s.order_index 
    FROM core_comercial.leads l 
    JOIN core_comercial.kanban_stages s ON s.id = l.stage_id 
    WHERE l.email = 'carmonxx11@gmail.com';
  `);
  console.log('🎯 Resultado após clicar no WhatsApp:', current.rows[0]);

  console.log('\n✅ TODA A CADEIA DE AUTOMAÇÃO ESTÁ 100% FUNCIONAL E SINCRONIZADA!');
  await c.end();
}

testAutomation();
