require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const WISEOWE_EMPRESA_ID = 'dae64d51-2181-4510-b14f-e63d2f111a8e';
const WISEOWE_STAGE_ID = '048f4587-f416-4fc2-b3c9-09c42347df95'; // Novo / Sem Contato

// Known valid consumer / ISP email providers (no need to query DNS repeatedly)
const KNOWN_VALID_DOMAINS = new Set([
  'gmail.com', 'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'laposte.net',
  'yahoo.fr', 'yahoo.com', 'hotmail.fr', 'hotmail.com', 'outlook.com', 'outlook.fr',
  'bbox.fr', 'neuf.fr', 'numericable.fr', 'live.fr'
]);

// Domain MX Cache: Map<domain, boolean>
const domainMxCache = new Map();

async function checkDomainMx(domain) {
  const cleanDomain = domain.toLowerCase().trim();
  if (KNOWN_VALID_DOMAINS.has(cleanDomain)) return true;
  if (domainMxCache.has(cleanDomain)) return domainMxCache.get(cleanDomain);

  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=MX`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      domainMxCache.set(cleanDomain, false);
      return false;
    }
    const data = await res.json();
    // Status 0 is NOERROR
    const isValid = data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
    domainMxCache.set(cleanDomain, isValid);
    return isValid;
  } catch (err) {
    // If timeout or error, attempt fallback to A record
    try {
      const aUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`;
      const aRes = await fetch(aUrl, { signal: AbortSignal.timeout(3000) });
      const aData = await aRes.json();
      const hasA = aData.Status === 0 && Array.isArray(aData.Answer) && aData.Answer.length > 0;
      domainMxCache.set(cleanDomain, hasA);
      return hasA;
    } catch {
      domainMxCache.set(cleanDomain, false);
      return false;
    }
  }
}

// Clean and prioritize multiple emails from cell
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function scoreEmailPrefix(email) {
  const prefix = email.split('@')[0].toLowerCase();
  if (prefix.startsWith('contact') || prefix.startsWith('direction') || prefix.startsWith('commercial')) return 100;
  if (prefix.startsWith('info') || prefix.startsWith('devis') || prefix.startsWith('bureau') || prefix.startsWith('accueil')) return 90;
  if (prefix.startsWith('ste') || prefix.startsWith('atelier') || prefix.startsWith('technique')) return 80;
  if (prefix.startsWith('compta') || prefix.startsWith('facturation') || prefix.startsWith('rh')) return 10;
  return 50; // generic personal name
}

function extractAndPrioritizeEmails(rawEmailCell) {
  if (!rawEmailCell) return [];
  const matches = String(rawEmailCell).match(EMAIL_REGEX);
  if (!matches) return [];
  const unique = Array.from(new Set(matches.map(e => e.toLowerCase().trim())));
  unique.sort((a, b) => scoreEmailPrefix(b) - scoreEmailPrefix(a));
  return unique;
}

// Clean and format French phone numbers
function cleanFrenchPhone(rawPhone) {
  if (!rawPhone) return null;
  let p = String(rawPhone).trim();
  // Remove non-breaking spaces and spaces
  p = p.replace(/[\u00a0\u200B\s]/g, ' ');
  // Check for dummy phone numbers
  if (/0{4,}/.test(p.replace(/\D/g, ''))) return null;

  // Handle +33 (0)X XX XX XX XX
  p = p.replace(/\+33\s*\(0\)/g, '+33 ');
  p = p.replace(/^\+33\(0\)/g, '+33 ');
  
  // Digits only
  const digits = p.replace(/\D/g, '');
  if (digits.length < 9) return null;

  // Format nicely if 10 digits starting with 0
  if (digits.length === 10 && digits.startsWith('0')) {
    return `+33 ${digits[1]} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  // Format nicely if 11 digits starting with 33
  if (digits.length === 11 && digits.startsWith('33')) {
    return `+33 ${digits[2]} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
  }

  return p.trim();
}

// Clean Website
function cleanWebsite(rawSite, primaryEmail) {
  if (!rawSite) {
    if (primaryEmail) {
      const domain = primaryEmail.split('@')[1];
      if (!KNOWN_VALID_DOMAINS.has(domain)) {
        return `https://www.${domain}`;
      }
    }
    return null;
  }
  let s = String(rawSite).trim();
  const lower = s.toLowerCase();
  if (lower === 'no hay' || lower === 'pas de site' || lower === '-' || lower === 'att' || lower === 'no') {
    if (primaryEmail) {
      const domain = primaryEmail.split('@')[1];
      if (!KNOWN_VALID_DOMAINS.has(domain)) {
        return `https://www.${domain}`;
      }
    }
    return null;
  }

  if (!s.startsWith('http://') && !s.startsWith('https://')) {
    s = 'https://' + s;
  }
  return s;
}

// Determine industrial sector
function classifySector(companyName, notes, website) {
  const text = `${companyName} ${notes} ${website}`.toLowerCase();

  if (text.includes('navale') || text.includes('naval') || text.includes('bateau') || text.includes('marine') || text.includes('maritime')) {
    return 'Construção & Reparação Naval';
  }
  if (text.includes('usinage') || text.includes('decolletage') || text.includes('décolletage') || text.includes('tournage') || text.includes('fraisage') || text.includes('mecanique de precision') || text.includes('mécanique de précision')) {
    return 'Mecanizado CNC & Tornería';
  }
  if (text.includes('charpente') || text.includes('serrurerie') || text.includes('metallerie') || text.includes('métallerie') || text.includes('structure metallique') || text.includes('structures metalliques') || text.includes('bardage')) {
    return 'Estructuras Metálicas & Montajes';
  }
  if (text.includes('chaudiere') || text.includes('chaudière') || text.includes('echangeur') || text.includes('échangeur') || text.includes('thermique') || text.includes('maintenance')) {
    return 'Mantenimiento Industrial & Calderas';
  }
  if (text.includes('inox') || text.includes('agroalimentaire') || text.includes('vinicole') || text.includes('viticole') || text.includes('laiterie')) {
    return 'Tubería Inox & Agroalimentaria';
  }
  if (text.includes('tuyauterie') || text.includes('piping') || text.includes('tubiste') || text.includes('canalisation')) {
    return 'Tuyauterie Industrielle & Piping';
  }
  // Default for sheet FRANCE
  return 'Tuyauterie & Chaudronnerie Industrielle';
}

async function run() {
  console.log('====================================================================');
  console.log('🚀 INICIANDO AUDITORIA & IMPORTAÇÃO DE LEADS DA FRANÇA (WISEOWE)');
  console.log('====================================================================\n');

  const filePath = path.resolve('temp-operacoes', 'Clientes FRANCIA.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error('Arquivo não encontrado:', filePath);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets['FRANCE'];
  if (!ws) {
    console.error('Aba FRANCE não encontrada na planilha!');
    process.exit(1);
  }

  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`Linhas totais na aba FRANCE: ${rawRows.length}`);

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();
  console.log('Conectado com sucesso ao Supabase PostgreSQL.');

  // Fetch all existing leads
  console.log('Carregando leads existentes no banco para deduplicação...');
  const existingRes = await client.query(`
    SELECT id, LOWER(TRIM(email)) as email, company_name, phone, website, tags, empresa_id 
    FROM core_comercial.leads 
    WHERE email IS NOT NULL AND email != '';
  `);
  const existingMap = new Map();
  for (const r of existingRes.rows) {
    existingMap.set(r.email, r);
  }
  console.log(`Total de leads com e-mail no CRM: ${existingMap.size}\n`);

  // Collect and parse rows
  let totalCandidates = 0;
  let discardedNoEmail = 0;
  let discardedInvalidMx = 0;
  let existingUpdated = 0;
  let newLeadsInserted = 0;
  const sectorCount = {};

  const rowsToProcess = [];

  for (let i = 2; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || !r.some(c => c !== null && c !== undefined && String(c).trim() !== '')) continue;
    totalCandidates++;

    const dateEmail = String(r[0] || '').trim();
    const companyName = String(r[1] || '').trim();
    const rawPhone = String(r[2] || '').trim();
    const rawEmail = String(r[3] || '').trim();
    const contact = String(r[4] || '').trim();
    const rawSite = String(r[5] || '').trim();
    const address = String(r[6] || '').trim();
    const ville = String(r[7] || '').trim();
    const notes = String(r[8] || '').trim();

    const emails = extractAndPrioritizeEmails(rawEmail);
    if (emails.length === 0) {
      discardedNoEmail++;
      continue;
    }

    rowsToProcess.push({
      rowIdx: i,
      companyName,
      emails,
      rawPhone,
      contact,
      rawSite,
      address,
      ville,
      notes,
      dateEmail
    });
  }

  console.log(`Candidatos com e-mail para validar MX e processar: ${rowsToProcess.length}`);
  console.log(`Descartados sem e-mail válido no Excel: ${discardedNoEmail}\n`);

  // Step 1: Pre-validate MX for all unique domains in parallel batches
  const uniqueDomains = new Set();
  for (const item of rowsToProcess) {
    for (const em of item.emails) {
      const dom = em.split('@')[1];
      if (dom) uniqueDomains.add(dom.toLowerCase().trim());
    }
  }
  console.log(`Total de domínios corporativos únicos para verificação de MX: ${uniqueDomains.size}`);
  
  const domainList = Array.from(uniqueDomains);
  const DOMAIN_BATCH = 20;
  for (let i = 0; i < domainList.length; i += DOMAIN_BATCH) {
    const batch = domainList.slice(i, i + DOMAIN_BATCH);
    await Promise.all(batch.map(d => checkDomainMx(d)));
    if ((i + DOMAIN_BATCH) % 100 === 0 || i + DOMAIN_BATCH >= domainList.length) {
      console.log(`  Verificados MX de ${Math.min(i + DOMAIN_BATCH, domainList.length)}/${domainList.length} domínios...`);
    }
  }
  console.log('Verificação de MX concluída!\n');

  // Step 2: Process leads and insert/update sequentially to prevent pg connection collisions
  console.log('Iniciando inserção e atualização no banco de dados...');
  for (let i = 0; i < rowsToProcess.length; i++) {
    const item = rowsToProcess[i];

    // Find the first email that has valid MX
    let validEmail = null;
    let secondaryEmail = null;

    for (const email of item.emails) {
      const domain = email.split('@')[1];
      const isMxOk = await checkDomainMx(domain);
      if (isMxOk) {
        if (!validEmail) {
          validEmail = email;
        } else if (!secondaryEmail) {
          secondaryEmail = email;
        }
      }
    }

    if (!validEmail) {
      discardedInvalidMx++;
      continue;
    }

    // Check if lead already exists
    const existing = existingMap.get(validEmail);
    const cleanPhone = cleanFrenchPhone(item.rawPhone);
    const cleanSite = cleanWebsite(item.rawSite, validEmail);
    const sector = classifySector(item.companyName, item.notes, cleanSite || '');
    sectorCount[sector] = (sectorCount[sector] || 0) + 1;

    const combinedNotesParts = [];
    if (item.dateEmail) combinedNotesParts.push(`1st Email: ${item.dateEmail}`);
    if (item.notes) combinedNotesParts.push(`Status: ${item.notes}`);
    if (secondaryEmail) combinedNotesParts.push(`E-mail Secundário: ${secondaryEmail}`);
    const combinedNotes = combinedNotesParts.join(' | ');

    if (existing) {
      if (!existing.id || !/^[0-9a-fA-F-]{36}$/.test(existing.id)) {
        continue;
      }
      // Update existing lead without duplicating
      const existingTags = Array.isArray(existing.tags) ? existing.tags : [];
      const newTags = Array.from(new Set([...existingTags, 'Base Clientes França', '🇫🇷 França', sector]));

      await client.query(`
        UPDATE core_comercial.leads 
        SET 
          phone = COALESCE(leads.phone, $1),
          website = COALESCE(leads.website, $2),
          address_line = COALESCE(leads.address_line, $3),
          city = COALESCE(leads.city, $4),
          tags = $5,
          notes = CASE 
            WHEN leads.notes IS NULL OR leads.notes = '' THEN $6 
            WHEN $6 != '' AND NOT (leads.notes LIKE '%' || $6 || '%') THEN leads.notes || ' | ' || $6
            ELSE leads.notes 
          END,
          empresa_id = $7,
          stage_id = COALESCE(leads.stage_id, $8),
          region = 'França',
          country_id = NULL,
          updated_at = NOW()
        WHERE id = $9;
      `, [
        cleanPhone,
        cleanSite,
        item.address || null,
        item.ville || null,
        newTags,
        combinedNotes,
        WISEOWE_EMPRESA_ID,
        WISEOWE_STAGE_ID,
        existing.id
      ]);
      existingUpdated++;
    } else {
      // Insert new lead into core_comercial.leads
      const leadTags = ['Prospecção Autônoma B2B', '🇫🇷 França', 'Base Clientes França', sector];
      const contactName = item.contact || item.companyName;

      const insertRes = await client.query(`
        INSERT INTO core_comercial.leads (
          empresa_id,
          stage_id,
          name,
          company_name,
          email,
          billing_email,
          phone,
          website,
          address_line,
          city,
          region,
          country_id,
          sector,
          origen_lead,
          notes,
          tags,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, $12, $13, $14, $15, NOW(), NOW())
        RETURNING id;
      `, [
        WISEOWE_EMPRESA_ID,
        WISEOWE_STAGE_ID,
        contactName,
        item.companyName,
        validEmail,
        secondaryEmail,
        cleanPhone,
        cleanSite,
        item.address || null,
        item.ville || null,
        'França',
        sector,
        'prospeccao_b2b',
        combinedNotes,
        leadTags
      ]);
      newLeadsInserted++;
      if (insertRes.rows && insertRes.rows[0]) {
        existingMap.set(validEmail, { id: insertRes.rows[0].id, email: validEmail, tags: leadTags });
      }
    }

    if ((i + 1) % 50 === 0 || i + 1 === rowsToProcess.length) {
      console.log(`Progresso: ${i + 1}/${rowsToProcess.length} linhas avaliadas... (Novos inseridos: ${newLeadsInserted}, Existentes enriquecidos: ${existingUpdated}, MX descartados: ${discardedInvalidMx})`);
    }
  }

  console.log('\n====================================================================');
  console.log('✅ AUDITORIA & IMPORTAÇÃO CONCLUÍDAS COM SUCESSO!');
  console.log('====================================================================');
  console.log(`Total de empresas na planilha: ${totalCandidates}`);
  console.log(`Descartados sem e-mail válido: ${discardedNoEmail}`);
  console.log(`Descartados por falha de MX/DNS (domínio sem e-mail ativo): ${discardedInvalidMx}`);
  console.log(`Leads que já existiam e foram enriquecidos/vinculados: ${existingUpdated}`);
  console.log(`Novos leads auditados e inseridos no CRM (Wiseowe): ${newLeadsInserted}`);
  console.log('\n📊 Distribuição Setorial dos Leads Processados:');
  for (const [sec, cnt] of Object.entries(sectorCount)) {
    console.log(` - ${sec}: ${cnt} leads`);
  }

  // Final check on Wiseowe leads count
  const wiseCount = await client.query('SELECT count(1) FROM core_comercial.leads WHERE empresa_id = $1;', [WISEOWE_EMPRESA_ID]);
  console.log(`\n🎯 Total consolidado de leads vinculados à Wiseowe no CRM: ${wiseCount.rows[0].count}`);

  await client.end();
}

run().catch(err => {
  console.error('❌ Erro fatal durante a importação:', err);
  process.exit(1);
});
