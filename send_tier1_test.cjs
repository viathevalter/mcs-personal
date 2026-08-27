require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

async function sendTier1Test() {
  const resendApiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;

  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const tmpl = await c.query("SELECT subject, html_content FROM core_comercial.marketing_templates WHERE title = 'Luminous Tier 1 - Acordos Marco & Grandes Obras (Diretoria & EPC)';");
  const template = tmpl.rows[0];

  const testRecipients = [
    { email: 'thevalter@gmail.com', name: 'Valter Teles', company: 'Técnicas Industriales EPC S.A.' },
    { email: 'fenix9926@gmail.com', name: 'Alex Carmona', company: 'Iberia Engineering & Energy S.L.' }
  ];

  const appUrl = 'https://mcs.gestaologinpro.com';

  for (const r of testRecipients) {
    let html = template.html_content
      .replace(/\{\{\s*name\s*\}\}/g, r.name)
      .replace(/\{\{\s*company_name\s*\}\}/g, r.company)
      .replace(/\{\{\s*email\s*\}\}/g, r.email)
      .replace(/\{\{\s*presupuesto_url\s*\}\}/g, `${appUrl}/public/solicitar-presupuesto?lead_id=test&empresa_id=847796c4-b253-4e53-9e6b-34a127ec7d85`)
      .replace(/\{\{\s*whatsapp_url\s*\}\}/g, `${appUrl}/public/whatsapp?lead_id=test`)
      .replace(/\{\{\s*opt_out_url\s*\}\}/g, `${appUrl}/public/coleta-dados/test?opt_out=1`);

    let subject = template.subject
      .replace(/\{\{\s*company_name\s*\}\}/g, r.company);

    console.log(`\nEnviando e-mail Tier 1 para ${r.name} (${r.email})...`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'LUMINOUS · Alex Carmona <comercial1@mail.luminousalley.com>',
        to: [r.email],
        subject: `[TIER 1 EPC] ${subject}`,
        html: html,
        tags: [
          { name: 'test', value: 'tier1_template_preview' }
        ]
      })
    });

    const data = await res.json();
    console.log(`✅ Resultado do envio para ${r.email}:`, data);
  }

  await c.end();
}

sendTier1Test();
