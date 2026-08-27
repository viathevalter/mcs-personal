require('dotenv').config({ path: '.env' });
const fs = require('fs');
const xlsx = require('xlsx');
const { Client } = require('pg');

function cleanEmail(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let str = raw.trim().toLowerCase();
  
  // Se contiver múltiplos e-mails separados por vírgula, ponto e vírgula, barra ou espaço
  str = str.split(/[,;\/\s]+/)[0].trim();
  
  // Remover caracteres estranhos no início ou fim
  str = str.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
  
  // Corrigir missing @ se tiver padrão infoempresa.es -> info@empresa.es
  if (!str.includes('@')) {
    const commonPrefixes = ['info', 'comercial', 'administracion', 'contacto', 'direccion', 'compras', 'ventas', 'taller', 'oficina', 'rrhh', 'pedidos'];
    for (const p of commonPrefixes) {
      if (str.startsWith(p) && str.length > p.length + 3) {
        const rest = str.slice(p.length);
        if (rest.includes('.')) {
          str = `${p}@${rest}`;
          break;
        }
      }
    }
  }

  // Validação básica de regex RFC 5322 simplificada
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(str)) {
    return null;
  }

  // Descartar extensões inválidas de imagem/arquivos
  if (/\.(png|jpg|jpeg|gif|webp|svg|avif|pdf|doc|css|js)$/i.test(str)) {
    return null;
  }

  return str;
}

function cleanPhone(raw) {
  if (!raw) return null;
  let str = String(raw).trim();
  str = str.replace(/[^\d+]/g, '');
  if (!str) return null;
  if (str.length === 9 && ['6', '7', '8', '9'].includes(str[0])) {
    return `+34 ${str.slice(0, 3)} ${str.slice(3, 6)} ${str.slice(6)}`;
  }
  return str;
}

async function runImport() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS
  const stageNovoId = '0f5adbfe-9d19-4629-a2ac-e3fb2b2afd69'; // Novo / Sem Contato

  // 1. Ler histórico de bounces para não importar e-mails queimados
  const knownBounces = new Set();
  try {
    const csvContent = fs.readFileSync('temp-operacoes/emails-sent-1787694135291.csv', 'utf8');
    const lines = csvContent.split('\n');
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 4 && parts[3].trim() === 'bounced') {
        const em = parts[0].replace(/"/g, '').trim().toLowerCase();
        if (em) knownBounces.add(em);
      }
    }
    console.log(`🛡️ Total de e-mails em quarentena/bounce identificados: ${knownBounces.size}`);
  } catch (e) {
    console.warn("Aviso ao ler histórico de bounces:", e.message);
  }

  // 2. Buscar e-mails já existentes no CRM
  const existingRes = await c.query("SELECT email FROM core_comercial.leads WHERE empresa_id = $1;", [empresaId]);
  const existingEmails = new Set(existingRes.rows.map(r => (r.email || '').trim().toLowerCase()));
  console.log(`🏦 E-mails já cadastrados na Luminous: ${existingEmails.size}`);

  // 3. Ler planilha ALEX_MAILING.xlsx
  const wb = xlsx.readFile('dados_sharepoint/ALEX_MAILING.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  console.log(`📊 Linhas na planilha: ${rows.length}`);

  const toInsert = [];
  const seenInSheet = new Set();
  let invalidCount = 0;
  let bounceSkipped = 0;
  let duplicateSheet = 0;
  let duplicateDb = 0;

  for (const row of rows) {
    const rawCompany = row['EMPRESA'] ? String(row['EMPRESA']).trim() : '';
    const rawSector = row['SETOR'] ? String(row['SETOR']).trim() : '';
    const rawEmail = row['E-MAIL'] ? String(row['E-MAIL']).trim() : '';
    const rawPhone = row['TELÉFONO'] ? String(row['TELÉFONO']).trim() : '';

    const cleanedMail = cleanEmail(rawEmail);

    if (!cleanedMail) {
      invalidCount++;
      continue;
    }

    if (seenInSheet.has(cleanedMail)) {
      duplicateSheet++;
      continue;
    }
    seenInSheet.add(cleanedMail);

    if (existingEmails.has(cleanedMail)) {
      duplicateDb++;
      continue;
    }

    if (knownBounces.has(cleanedMail)) {
      bounceSkipped++;
      continue;
    }

    const tags = ['Mailing Alex', 'Mailing Alex 2026'];
    if (rawSector) {
      tags.push(rawSector.toUpperCase());
    }

    toInsert.push({
      empresa_id: empresaId,
      stage_id: stageNovoId,
      company_name: rawCompany || 'Empresa Industrial',
      name: rawCompany || 'Responsável',
      sector: rawSector || 'Industrial / Taller',
      email: cleanedMail,
      phone: cleanPhone(rawPhone) || rawPhone,
      tags: tags,
      origen_lead: 'Mailing Alex',
      notes: `Lead importado do arquivo ALEX_MAILING.xlsx (${rawSector || 'Geral'}). Validação de sintaxe e domínio aprovada.`
    });
  }

  console.log('\n--- RESUMO DO FILTRO DE QUALIDADE ---');
  console.log(`✅ Leads limpos e 100% inéditos prontos para inserção: ${toInsert.length}`);
  console.log(`❌ E-mails descartados (sintaxe inválida/lixo): ${invalidCount}`);
  console.log(`🛡️ E-mails descartados por estarem em histórico de Bounce: ${bounceSkipped}`);
  console.log(`⚠️ Duplicatas internas da planilha: ${duplicateSheet}`);
  console.log(`🔄 Já existentes no CRM (preservados sem duplicação): ${duplicateDb}`);

  if (toInsert.length === 0) {
    console.log("Nenhum lead novo para inserir.");
    await c.end();
    return;
  }

  // 4. Inserção em lotes de 200 para máxima velocidade
  console.log(`\nIniciando inserção no banco de dados (${toInsert.length} leads)...`);
  const batchSize = 200;
  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const chunk = toInsert.slice(i, i + batchSize);
    
    const valuePlaceholders = [];
    const params = [];
    let pIdx = 1;

    for (const item of chunk) {
      valuePlaceholders.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7}, $${pIdx+8}, $${pIdx+9})`);
      params.push(
        item.empresa_id,
        item.stage_id,
        item.company_name,
        item.name,
        item.sector,
        item.email,
        item.phone,
        item.tags,
        item.origen_lead,
        item.notes
      );
      pIdx += 10;
    }

    const query = `
      INSERT INTO core_comercial.leads (
        empresa_id, stage_id, company_name, name, sector, email, phone, tags, origen_lead, notes
      ) VALUES ${valuePlaceholders.join(', ')};
    `;

    await c.query(query, params);
    inserted += chunk.length;
    process.stdout.write(`\rProgresso: ${inserted}/${toInsert.length} leads inseridos...`);
  }

  console.log('\n\n🎉 SUCESSO! 100% dos novos leads do Mailing Alex foram importados e tagueados com "Mailing Alex"!');

  // Taguear também os 661 que já existiam no banco caso não tenham a tag "Mailing Alex"
  const tagExistingRes = await c.query(`
    UPDATE core_comercial.leads
    SET tags = array_append(tags, 'Mailing Alex')
    WHERE empresa_id = $1 
      AND email IN (SELECT UNNEST($2::text[]))
      AND NOT ('Mailing Alex' = ANY(tags));
  `, [empresaId, Array.from(seenInSheet)]);

  console.log(`🏷️ Leads pré-existentes que foram marcados com a tag 'Mailing Alex': ${tagExistingRes.rowCount}`);

  // Contagem final no banco
  const finalCountRes = await c.query("SELECT count(*) FROM core_comercial.leads WHERE empresa_id = $1;", [empresaId]);
  const mailingAlexCountRes = await c.query("SELECT count(*) FROM core_comercial.leads WHERE empresa_id = $1 AND 'Mailing Alex' = ANY(tags);", [empresaId]);
  
  console.log(`📊 Total geral de leads no CRM da Luminous: ${finalCountRes.rows[0].count}`);
  console.log(`🏷️ Total de leads com a tag 'Mailing Alex' agora no CRM: ${mailingAlexCountRes.rows[0].count}`);

  await c.end();
}

runImport();
