require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function sendTest() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const tmpl = await c.query("SELECT subject, html_content FROM core_comercial.marketing_templates WHERE title = 'Luminous Executivo - Alex Carmona (Alta Conversão)';");
  const template = tmpl.rows[0];

  const resendApiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  console.log('Resend API Key presente?', !!resendApiKey);

  const testRecipients = [
    { email: 'thevalter@gmail.com', name: 'Valter Teles', company: 'Teles Montajes Industriales' },
    { email: 'fenix9926@gmail.com', name: 'Alex Carmona', company: 'Carmona Piping & Soldadura' }
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

    console.log(`\nEnviando e-mail de teste para ${r.name} (${r.email})...`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'LUMINOUS · Alex Carmona <comercial1@mail.luminousalley.com>',
        to: [r.email],
        subject: subject,
        html: html,
        tags: [
          { name: 'test', value: 'executive_template_preview' }
        ]
      })
    });

    const data = await res.json();
    console.log(`✅ Resultado do envio para ${r.email}:`, data);
  }

  await c.end();
}

sendTest();
