require('dotenv').config();
const { Client } = require('pg');

async function inspectCarmona() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const camp = await c.query(`
    SELECT c.id, c.title, t.title as template_title, t.html_content
    FROM core_comercial.marketing_campaigns c
    LEFT JOIN core_comercial.marketing_templates t ON t.id = c.template_id
    WHERE c.id = 'e727266f-ae34-46a6-9e01-47623c892597';
  `);

  console.log('Campaign:', camp.rows[0]?.title);
  console.log('Template Title:', camp.rows[0]?.template_title);
  
  const html = camp.rows[0]?.html_content || '';
  const regex = /href=["']([^"']+)["']/g;
  let match;
  const links = [];
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }
  console.log('Links in template:', links);

  await c.end();
}

inspectCarmona();
