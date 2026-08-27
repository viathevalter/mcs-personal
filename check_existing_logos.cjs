require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function check() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const tmpls = await c.query("SELECT id, title, html_content FROM core_comercial.marketing_templates WHERE title = 'Luminous 01';");
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(tmpls.rows[0]?.html_content || '')) !== null) {
    console.log('Logo/Imagem:', match[1]);
  }

  await c.end();
}

check();
