require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function auditCampaigns() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const resendApiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;

  console.log("=================================================");
  console.log("📊 AUDITORIA DAS CAMPANHAS DAS ÚLTIMAS 24/48 HORAS");
  console.log("=================================================\n");

  // 1. Campanhas recentes
  const camps = await c.query(`
    SELECT 
      mc.id, 
      mc.title, 
      mc.status, 
      mc.scheduled_at,
      mc.created_at,
      COUNT(q.id) as total_na_fila,
      COUNT(CASE WHEN q.status = 'sent' THEN 1 END) as enviados,
      COUNT(CASE WHEN q.status = 'pending' THEN 1 END) as pendentes,
      COUNT(CASE WHEN q.status = 'failed' THEN 1 END) as falhas
    FROM core_comercial.marketing_campaigns mc
    LEFT JOIN core_comercial.marketing_campaign_queue q ON q.campaign_id = mc.id
    WHERE mc.created_at >= NOW() - INTERVAL '48 hours'
    GROUP BY mc.id, mc.title, mc.status, mc.scheduled_at, mc.created_at
    ORDER BY mc.created_at DESC;
  `);

  console.log("📋 1. Status das Campanhas Recentes no Banco:");
  console.table(camps.rows);

  // 2. Se houver falhas, quais os erros?
  const errors = await c.query(`
    SELECT q.error_message, COUNT(*) as qtd
    FROM core_comercial.marketing_campaign_queue q
    WHERE q.status = 'failed' AND q.created_at >= NOW() - INTERVAL '48 hours'
    GROUP BY q.error_message;
  `);
  console.log("\n⚠️ 2. Resumo de Erros / Falhas na Fila:");
  console.table(errors.rows);

  // 3. Status atual do Funil / Kanban da Luminous
  const stages = await c.query(`
    SELECT s.name, s.order_index, COUNT(l.id) as total_leads
    FROM core_comercial.kanban_stages s
    LEFT JOIN core_comercial.leads l ON l.stage_id = s.id
    WHERE s.empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85'
    GROUP BY s.id, s.name, s.order_index
    ORDER BY s.order_index ASC;
  `);
  console.log("\n📊 3. Funil de Vendas Atual (Kanban da Luminous):");
  console.table(stages.rows);

  // 4. Checagem direta na API da Resend
  console.log("\n🔍 4. Checagem da API da Resend (Status de Domínio e Limite):");
  if (resendApiKey) {
    try {
      // Listar domínios
      const domRes = await fetch('https://api.resend.com/domains', {
        headers: { 'Authorization': `Bearer ${resendApiKey}` }
      });
      const domains = await domRes.json();
      console.log("🌐 Domínios configurados no Resend:");
      console.table(domains.data || domains);

      // Listar últimos e-mails disparados via Resend
      const emailsRes = await fetch('https://api.resend.com/emails', {
        headers: { 'Authorization': `Bearer ${resendApiKey}` }
      });
      const emails = await emailsRes.json();
      if (emails.data && emails.data.length > 0) {
        console.log(`\n📬 Últimos e-mails processados pela API do Resend (Amostra de ${emails.data.length}):`);
        console.table(emails.data.slice(0, 8).map((e) => ({
          id: e.id,
          to: Array.isArray(e.to) ? e.to.join(', ') : e.to,
          from: e.from,
          subject: e.subject?.slice(0, 40) + '...',
          created_at: e.created_at,
          last_event: e.last_event
        })));
      }
    } catch (apiErr) {
      console.error("Erro ao consultar API Resend:", apiErr.message);
    }
  } else {
    console.log("Resend API Key não encontrada nas variáveis.");
  }

  // 5. Verificar se há campanhas com status 'sending' ou 'pending' agora
  const pendingJobs = await c.query(`
    SELECT mc.id, mc.title, mc.status, count(q.id) as pendentes
    FROM core_comercial.marketing_campaigns mc
    JOIN core_comercial.marketing_campaign_queue q ON q.campaign_id = mc.id
    WHERE q.status = 'pending'
    GROUP BY mc.id, mc.title, mc.status;
  `);
  console.log("\n⏳ 5. Campanhas com e-mails ainda pendentes de envio na fila:");
  console.table(pendingJobs.rows);

  await c.end();
}

auditCampaigns();
