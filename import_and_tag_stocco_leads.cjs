const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const FOLDER = path.resolve('temp-operacoes', 'STOCCO CAPTACIÓN');
const VALID_EXCEL = path.join(FOLDER, 'MAILING_STOCCO_VALIDOS_PRONTOS.xlsx');

const STOCCO_EMPRESA_ID = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco, Lda
const STOCCO_STAGE_1 = '9e6cb389-f89b-4c44-b6e1-b283bf4de1cd'; // Novo / Sem Contato (Stocco)
const ALEX_USER_ID = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7'; // Alex Carmona
const SPAIN_COUNTRY_ID = '2f487ab4-c7f5-4b70-9c37-995dc4cda125'; // Espanha

async function run() {
  console.log(`⚡ INICIANDO IMPORTAÇÃO E TAGUEAMENTO DOS LEADS DE ALEX STOCCO`);

  const wb = XLSX.readFile(VALID_EXCEL);
  const leads = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`📋 Total de leads válidos no arquivo: ${leads.length}`);

  const client = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await client.connect();

  // 1. Obter mapa de e-mails existentes no banco
  const existingMap = new Map(); // email -> id
  const existingRes = await client.query('SELECT id, LOWER(email) as email, tags FROM core_comercial.leads WHERE email IS NOT NULL;');
  existingRes.rows.forEach(r => existingMap.set(r.email.trim(), { id: r.id, tags: r.tags || [] }));
  console.log(`💾 Base do CRM carregada: ${existingMap.size} leads no banco.`);

  let insertedCount = 0;
  let taggedCount = 0;

  const toInsert = [];
  const toTag = [];

  for (const item of leads) {
    const emailNorm = item.Email.toLowerCase().trim();
    if (existingMap.has(emailNorm)) {
      // Lead já existe -> Taguear
      const existing = existingMap.get(emailNorm);
      const currentTags = Array.isArray(existing.tags) ? existing.tags : [];
      const newTags = Array.from(new Set([...currentTags, 'Alex Stocco', 'Estoko', 'Mailing Stocco']));
      if (newTags.length > currentTags.length) {
        toTag.push({ id: existing.id, tags: newTags });
      }
    } else {
      // Novo lead inédito
      toInsert.push(item);
    }
  }

  console.log(`\n📦 Lotes calculados:`);
  console.log(`- Novos leads a cadastrar: ${toInsert.length}`);
  console.log(`- Leads existentes a taguear com 'Alex Stocco': ${toTag.length}`);

  // 2. Inserir novos leads em lote
  if (toInsert.length > 0) {
    console.log(`🚀 Inserindo ${toInsert.length} novos leads na empresa Stocco...`);
    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const chunk = toInsert.slice(i, i + batchSize);
      const valueTuples = [];
      const params = [];
      let pIdx = 1;

      for (const row of chunk) {
        const email = row.Email.toLowerCase().trim();
        const companyName = row.Nome_Empresa_Estimado || 'Empresa';
        const contactName = companyName;
        const notes = `Lead importado do Mailing Stocco Captación (Outlook). Servidor MX: ${row.Servidor_MX_Principal || 'OK'}`;
        const tags = ['Alex Stocco', 'Estoko', 'Mailing Stocco', 'Espanha'];

        valueTuples.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
        params.push(
          STOCCO_EMPRESA_ID,
          contactName,
          companyName,
          email,
          notes,
          STOCCO_STAGE_1,
          ALEX_USER_ID,
          tags
        );
      }

      const insertSql = `
        INSERT INTO core_comercial.leads 
          (empresa_id, name, company_name, email, notes, stage_id, assigned_to, tags)
        VALUES ${valueTuples.join(', ')}
      `;

      await client.query(insertSql, params);
      insertedCount += chunk.length;
      process.stdout.write(`Progresso Inserção: ${insertedCount}/${toInsert.length} leads criados...\r`);
    }
    console.log(`\n✅ Inserção de novos leads concluída!`);
  }

  // 3. Taguear leads existentes
  if (toTag.length > 0) {
    console.log(`🏷️ Tagueando ${toTag.length} leads existentes com 'Alex Stocco' e 'Estoko'...`);
    const batchSize = 100;
    for (let i = 0; i < toTag.length; i += batchSize) {
      const chunk = toTag.slice(i, i + batchSize);
      for (const item of chunk) {
        await client.query('UPDATE core_comercial.leads SET tags = $1 WHERE id = $2', [item.tags, item.id]);
        taggedCount++;
      }
      process.stdout.write(`Progresso Tagueamento: ${taggedCount}/${toTag.length} leads atualizados...\r`);
    }
    console.log(`\n✅ Tagueamento concluído!`);
  }

  // 4. Conferir total no banco com a tag Alex Stocco
  const verifyRes = await client.query(`
    SELECT COUNT(*) as count FROM core_comercial.leads WHERE 'Alex Stocco' = ANY(tags);
  `);
  console.log(`\n======================================================`);
  console.log(`🎉 PÚBLICO 'Alex Stocco' CRIADO COM SUCESSO!`);
  console.log(`Total de leads tagueados no CRM: ${verifyRes.rows[0].count}`);
  console.log(`======================================================\n`);

  await client.end();
}

run();
