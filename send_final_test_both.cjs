require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function sendFinalTests() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const resendApiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  const appUrl = 'https://mcs.gestaologinpro.com';

  // 1. Resetar Valter e Alex para Estágio 2 (E-mail Enviado)
  const stage2 = await c.query("SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85' AND order_index = 2;");
  const stage2Id = stage2.rows[0]?.id;

  await c.query(`
    UPDATE core_comercial.leads 
    SET stage_id = $1, updated_at = NOW() 
    WHERE email IN ('thevalter@gmail.com', 'fenix9926@gmail.com');
  `, [stage2Id]);
  console.log("✅ Valter e Alex resetados para a coluna 'E-mail Enviado' (Estágio 2)!");

  // Buscar os dados reais dos leads
  const leads = await c.query("SELECT id, name, email, company_name FROM core_comercial.leads WHERE email IN ('thevalter@gmail.com', 'fenix9926@gmail.com');");

  // Buscar os dois templates
  const tmplExecRes = await c.query("SELECT subject, html_content FROM core_comercial.marketing_templates WHERE title = 'Luminous Executivo - Alex Carmona (Alta Conversão)';");
  const execTemplate = tmplExecRes.rows[0];

  const tmplTier1Res = await c.query("SELECT subject, html_content FROM core_comercial.marketing_templates WHERE title = 'Luminous Tier 1 - Acordos Marco & Grandes Obras (Diretoria & EPC)';");
  const tier1Template = tmplTier1Res.rows[0];

  for (const lead of leads.rows) {
    const isValter = lead.email === 'thevalter@gmail.com';
    const recipientCompany = isValter ? 'Teles Montajes Industriales S.L.' : 'Carmona Piping & Soldadura S.L.';

    // Enviar 1: Modelo Executivo Alta Conversão
    let execHtml = execTemplate.html_content
      .replace(/\{\{\s*name\s*\}\}/g, lead.name)
      .replace(/\{\{\s*company_name\s*\}\}/g, recipientCompany)
      .replace(/\{\{\s*email\s*\}\}/g, lead.email)
      .replace(/\{\{\s*presupuesto_url\s*\}\}/g, `${appUrl}/public/solicitar-presupuesto?lead_id=${lead.id}&empresa_id=847796c4-b253-4e53-9e6b-34a127ec7d85`)
      .replace(/\{\{\s*whatsapp_url\s*\}\}/g, `${appUrl}/public/whatsapp?lead_id=${lead.id}`)
      .replace(/\{\{\s*opt_out_url\s*\}\}/g, `${appUrl}/public/coleta-dados/${lead.id}?opt_out=1`);

    let execSubject = `[TESTE ALTA CONVERSÃO] ` + execTemplate.subject.replace(/\{\{\s*company_name\s*\}\}/g, recipientCompany);

    console.log(`\n1. Disparando Modelo Executivo para ${lead.name} (${lead.email})...`);
    const res1 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'LUMINOUS · Alex Carmona <comercial1@mail.luminousalley.com>',
        to: [lead.email],
        subject: execSubject,
        html: execHtml,
        tags: [
          { name: 'lead_id', value: lead.id },
          { name: 'campaign_id', value: 'c7f04ca1-d119-4275-adf5-252198aee2c2' }
        ]
      })
    });
    const d1 = await res1.json();
    console.log(`✅ Resultado Executivo (${lead.email}):`, d1);

    if (d1.id) {
      await c.query(`
        INSERT INTO core_comercial.marketing_campaign_queue (campaign_id, lead_id, status, sent_at, resend_email_id)
        VALUES ('c7f04ca1-d119-4275-adf5-252198aee2c2', $1, 'sent', NOW(), $2);
      `, [lead.id, d1.id]);
    }

    // Enviar 2: Modelo Grandes Empresas (Tier 1 & EPC)
    let tier1Html = tier1Template.html_content
      .replace(/\{\{\s*name\s*\}\}/g, lead.name)
      .replace(/\{\{\s*company_name\s*\}\}/g, recipientCompany)
      .replace(/\{\{\s*email\s*\}\}/g, lead.email)
      .replace(/\{\{\s*presupuesto_url\s*\}\}/g, `${appUrl}/public/solicitar-presupuesto?lead_id=${lead.id}&empresa_id=847796c4-b253-4e53-9e6b-34a127ec7d85`)
      .replace(/\{\{\s*whatsapp_url\s*\}\}/g, `${appUrl}/public/whatsapp?lead_id=${lead.id}`)
      .replace(/\{\{\s*opt_out_url\s*\}\}/g, `${appUrl}/public/coleta-dados/${lead.id}?opt_out=1`);

    let tier1Subject = `[TESTE GRANDES EMPRESAS EPC] ` + tier1Template.subject.replace(/\{\{\s*company_name\s*\}\}/g, recipientCompany);

    console.log(`2. Disparando Modelo Tier 1 para ${lead.name} (${lead.email})...`);
    const res2 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'LUMINOUS · Alex Carmona <comercial1@mail.luminousalley.com>',
        to: [lead.email],
        subject: tier1Subject,
        html: tier1Html,
        tags: [
          { name: 'lead_id', value: lead.id },
          { name: 'campaign_id', value: 'c7f04ca1-d119-4275-adf5-252198aee2c2' }
        ]
      })
    });
    const d2 = await res2.json();
    console.log(`✅ Resultado Tier 1 (${lead.email}):`, d2);

    if (d2.id) {
      await c.query(`
        INSERT INTO core_comercial.marketing_campaign_queue (campaign_id, lead_id, status, sent_at, resend_email_id)
        VALUES ('c7f04ca1-d119-4275-adf5-252198aee2c2', $1, 'sent', NOW(), $2);
      `, [lead.id, d2.id]);
    }
  }

  await c.end();
  console.log("\n=== DISPAROS DE TESTE FINALIZADOS COM SUCESSO! ===");
}

sendFinalTests();
