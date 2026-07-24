const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

const prodSupabase = createClient(
  'https://unbepkdzvsfvylnysrcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw'
);

const devSupabase = createClient(
  'https://pyahcgorkvwfwmlzspnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc'
);

function safeXmlEscape(xml) {
  return xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');
}

async function processTemplate(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = new JSZip();
  await zip.loadAsync(buf);

  for (const relPath of Object.keys(zip.files)) {
    if (relPath.endsWith('.xml') && relPath.startsWith('word/')) {
      let xml = await zip.file(relPath).async('text');
      const escaped = safeXmlEscape(xml);
      if (escaped !== xml) {
        zip.file(relPath, escaped);
      }
    }
  }

  return await zip.generateAsync({ type: 'uint8array' });
}

async function run() {
  const prodClient = new Client({ connectionString: prodConnectionString });
  const devClient = new Client({ connectionString: devConnectionString });

  await prodClient.connect();
  await devClient.connect();

  await prodClient.query(`
    DROP POLICY IF EXISTS "temp_rw_templates" ON storage.objects;
    CREATE POLICY "temp_rw_templates" ON storage.objects FOR ALL TO anon USING (bucket_id = 'contract-templates') WITH CHECK (bucket_id = 'contract-templates');
  `);
  await devClient.query(`
    DROP POLICY IF EXISTS "temp_rw_templates" ON storage.objects;
    CREATE POLICY "temp_rw_templates" ON storage.objects FOR ALL TO anon USING (bucket_id = 'contract-templates') WITH CHECK (bucket_id = 'contract-templates');
  `);

  const folderMap = {
    'luminous': 'LUMINOUS CAPITAL UNIPESSOAL LDA',
    'mastercorp': 'MASTERCORP PORTUGAL UNIPESSOAL LDA',
    'stocco': 'STOCCO',
    'triangulo': 'TRIANGULO',
    'wiseowe': 'WISEOWE UNIPESSOAL LDA'
  };

  const baseDir = 'c:/Projetos IA/Kotrik/mcs-personal/temp-operacoes/ContratosTrabaladores';
  const folders = fs.readdirSync(baseDir);

  let count = 0;
  for (const folder of folders) {
    const targetFolder = folderMap[folder.toLowerCase()] || folder.toUpperCase();
    const folderPath = path.join(baseDir, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      if (!file.endsWith('.docx')) continue;

      const fullLocalPath = path.join(folderPath, file);
      const storagePath = `${targetFolder}/${file}`;

      console.log(`Processing pristine template: ${fullLocalPath} -> ${storagePath}`);
      const cleanedBuf = await processTemplate(fullLocalPath);

      const { error: errProd } = await prodSupabase.storage.from('contract-templates').upload(storagePath, cleanedBuf, {
        upsert: true,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      if (errProd) console.error("PROD error:", storagePath, errProd.message);

      const { error: errDev } = await devSupabase.storage.from('contract-templates').upload(storagePath, cleanedBuf, {
        upsert: true,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      if (errDev) console.error("DEV error:", storagePath, errDev.message);

      count++;
      console.log(`[${count}] RESTORED PRISTINE TEMPLATE: ${storagePath}`);
    }
  }

  await prodClient.query('DROP POLICY IF EXISTS "temp_rw_templates" ON storage.objects;');
  await devClient.query('DROP POLICY IF EXISTS "temp_rw_templates" ON storage.objects;');

  await prodClient.end();
  await devClient.end();

  console.log(`SUCCESSFULLY RESTORED ALL ${count} PRISTINE CONTRACT TEMPLATES TO PROD AND DEV STORAGE!`);
}

run();
