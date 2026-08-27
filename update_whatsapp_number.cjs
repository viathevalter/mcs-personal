require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function updateWhatsAppNumberInTemplates() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const tmpls = await c.query("SELECT id, title, html_content FROM core_comercial.marketing_templates WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85';");

  for (const t of tmpls.rows) {
    if (t.html_content && t.html_content.includes('645 56 74 01')) {
      const updatedHtml = t.html_content
        .replace(/\+34 645 56 74 01/g, '+34 937 37 41 80')
        .replace(/34645567401/g, '34937374180');

      await c.query("UPDATE core_comercial.marketing_templates SET html_content = $1, updated_at = NOW() WHERE id = $2;", [updatedHtml, t.id]);
      console.log(`✅ Template "${t.title}" atualizado com o novo número de WhatsApp: +34 937 37 41 80!`);
    }
  }

  await c.end();
}

updateWhatsAppNumberInTemplates();
