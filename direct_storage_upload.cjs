require('dotenv').config({ path: '.env' });
const fs = require('fs');
const { Client } = require('pg');

async function directStorageUpload() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const svgPath = 'C:\\Projetos IA\\Luminous\\luminous-alley-premium\\public\\assets\\logo\\luminous-logo.svg';
  const svgContent = fs.readFileSync(svgPath);

  // Upsert into storage.objects
  const name = 'public/luminous-logo-official.svg';
  const bucketId = 'company-logos';

  await c.query(`
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES ($1, $2, null, '{"mimetype":"image/svg+xml","size":${svgContent.length}}'::jsonb)
    ON CONFLICT (bucket_id, name) DO UPDATE SET
      metadata = '{"mimetype":"image/svg+xml","size":${svgContent.length}}'::jsonb,
      updated_at = NOW();
  `, [bucketId, name]);

  console.log('✅ Objeto registrado na tabela storage.objects!');

  // Também podemos colocar a logo em SVG inline ou converter em base64/PNG para renderização 100% perfeita em todos os clientes de e-mail (inclusive Outlook)
  const base64Svg = svgContent.toString('base64');
  const dataUri = `data:image/svg+xml;base64,${base64Svg}`;

  console.log('Data URI gerado (primeiros 50 chars):', dataUri.substring(0, 50));

  await c.end();
}

directStorageUpload();
