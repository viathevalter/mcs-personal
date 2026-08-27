require('dotenv').config();
const { Client } = require('pg');

async function inspectPrimerEnvio() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const camp = await c.query(`
    SELECT c.id, c.title, c.created_at, t.title as template_title, t.html_content 
    FROM core_comercial.marketing_campaigns c 
    JOIN core_comercial.marketing_templates t ON t.id = c.template_id 
    WHERE c.id = 'c7f04ca1-d119-4275-adf5-252198aee2c2';
  `);

  console.log('Campanha:', camp.rows[0]?.title);
  console.log('Data de Criação:', camp.rows[0]?.created_at);

  const html = camp.rows[0]?.html_content || '';
  const regex = /href=["']([^"']+)["']/g;
  let match;
  const links = [];
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }
  console.log('Links no template da campanha:', links);

  await c.end();
}

inspectPrimerEnvio();
