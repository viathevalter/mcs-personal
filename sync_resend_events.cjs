require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function syncResendEvents() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const key = process.env.VITE_RESEND_API_KEY;
  console.log('=== SINCRONIZANDO EVENTOS DIRETAMENTE DA API DA RESEND ===\n');

  // Buscar itens da campanha PRIMER ENVÍO
  const queue = await c.query(`
    SELECT q.id, q.lead_id, q.resend_email_id, l.name, l.email, l.stage_id, s.name as stage_name, s.order_index
    FROM core_comercial.marketing_campaign_queue q
    JOIN core_comercial.leads l ON l.id = q.lead_id
    LEFT JOIN core_comercial.kanban_stages s ON s.id = l.stage_id
    WHERE q.campaign_id = 'c7f04ca1-d119-4275-adf5-252198aee2c2' AND q.resend_email_id IS NOT NULL
    ORDER BY q.sent_at ASC;
  `);

  console.log(`Total de e-mails para auditar na Resend: ${queue.rows.length}`);

  // Stage 3 da Luminous: E-mail Lido / Clicado
  const stage3Res = await c.query(`
    SELECT id, order_index FROM core_comercial.kanban_stages
    WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85' AND order_index = 3;
  `);
  const stage3Id = stage3Res.rows[0]?.id;

  let checkedCount = 0;
  let openedCount = 0;
  let clickedCount = 0;
  let updatedCount = 0;

  // Processar em lotes com paralelismo moderado para respeitar limites de taxa da API
  const batchSize = 15;
  for (let i = 0; i < queue.rows.length; i += batchSize) {
    const chunk = queue.rows.slice(i, i + batchSize);
    
    await Promise.all(chunk.map(async (item) => {
      try {
        const res = await fetch(`https://api.resend.com/emails/${item.resend_email_id}`, {
          headers: { Authorization: `Bearer ${key}` }
        });
        if (!res.ok) return;

        const data = await res.json();
        checkedCount++;

        const isOpened = data.last_event === 'opened';
        const isClicked = data.last_event === 'clicked';

        if (isOpened) openedCount++;
        if (isClicked) clickedCount++;

        if (isOpened || isClicked) {
          console.log(`🎯 [RESEND] ${item.email} -> Status: ${data.last_event}`);
          
          // Se o lead ainda estiver no estágio 1 ou 2, promove para estágio 3
          if (item.order_index < 3) {
            await c.query(`
              UPDATE core_comercial.leads 
              SET stage_id = '${stage3Id}', updated_at = NOW() 
              WHERE id = '${item.lead_id}';
            `);
            updatedCount++;
            console.log(`   ➔ Card do lead ${item.name} (${item.email}) promovido para 'E-mail Lido / Clicado'!`);
          }
        }
      } catch (err) {
        // Silently continue batch
      }
    }));

    if (i > 0 && i % 300 === 0) {
      console.log(`Progresso: ${i}/${queue.rows.length} verificados... (Abertos: ${openedCount}, Clicados: ${clickedCount}, Atualizados: ${updatedCount})`);
    }
  }

  console.log('\n=== AUDITORIA COMPLETA CONCLUÍDA ===');
  console.log(`Total Auditados: ${checkedCount}`);
  console.log(`E-mails Abertos: ${openedCount}`);
  console.log(`E-mails Clicados: ${clickedCount}`);
  console.log(`Cards Promovidos para 'E-mail Lido / Clicado': ${updatedCount}`);

  await c.end();
}

syncResendEvents();
