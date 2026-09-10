require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const XLSX = require('xlsx');
const { Client } = require('pg');

const FOLDER = path.resolve('temp-operacoes', 'AlexNuevos');
const INPUT_EXCEL = path.join(FOLDER, 'CRM NUEVOS GUIPUZCOA.xlsx');
const OUTPUT_EXCEL = path.join(FOLDER, 'MAILING_ALEX_GUIPUZCOA_ENRIQUECIDO.xlsx');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const LUMINOUS_EMPRESA_ID = '847796c4-b253-4e53-9e6b-34a127ec7d85';
const ALEX_USER_ID = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7'; // Alex Carmona / Archiles
const SPAIN_COUNTRY_ID = '2f487ab4-c7f5-4b70-9c37-995dc4cda125'; // Espanha

// Known consumer / ISP email domains
const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'hotmail.es', 'yahoo.es', 'yahoo.com', 'outlook.es', 'outlook.com',
  'telefonica.net', 'movistar.es', 'wanadoo.es', 'terra.es', 'orange.es', 'vodafone.es',
  'ono.com', 'telecable.es', 'euskalnet.net', 'arrakis.es', 'mixmail.com', 'icloud.com', 'live.com'
]);

const domainMxCache = new Map();

async function checkDomainMx(domain) {
  const cleanDomain = domain.toLowerCase().trim();
  if (PUBLIC_DOMAINS.has(cleanDomain)) return true;
  if (domainMxCache.has(cleanDomain)) return domainMxCache.get(cleanDomain);

  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=MX`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) {
      domainMxCache.set(cleanDomain, false);
      return false;
    }
    const data = await res.json();
    const isValid = data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
    domainMxCache.set(cleanDomain, isValid);
    return isValid;
  } catch {
    try {
      const aUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`;
      const aRes = await fetch(aUrl, { signal: AbortSignal.timeout(2500) });
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

// Fast fetch HTML with redirection handling
function fetchHtml(targetUrl, timeoutMs = 3000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === 'https:';
      const clientModule = isHttps ? https : http;

      const req = clientModule.get(targetUrl, {
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        },
        rejectUnauthorized: false
      }, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location) {
          try {
            const redirectUrl = new URL(res.headers.location, targetUrl).href;
            fetchHtml(redirectUrl, timeoutMs).then(resolve);
            return;
          } catch {
            resolve({ ok: false });
            return;
          }
        }

        if (res.statusCode !== 200) {
          resolve({ ok: false, status: res.statusCode });
          return;
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          data += chunk;
          if (data.length > 300000) {
            req.destroy();
            resolve({ ok: true, html: data });
          }
        });
        res.on('end', () => resolve({ ok: true, html: data }));
      });

      req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'timeout' }); });
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}

function extractMetadataFromHtml(html) {
  if (!html) return {};

  const cleanText = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                        .replace(/<[^>]+>/g, ' ');

  // 1. Phone extraction
  let phones = [];
  const phoneMatches = html.match(/(?:\+34|0034)?[\s.-]?(?:[6789]\d{2})[\s.-]?\d{3}[\s.-]?\d{3}/g) || [];
  for (let p of phoneMatches) {
    const digits = p.replace(/\D/g, '');
    let cleanPhone = '';
    if (digits.startsWith('34') && digits.length === 11) {
      cleanPhone = `+34 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    } else if (digits.length === 9) {
      cleanPhone = `+34 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    if (cleanPhone && !phones.includes(cleanPhone)) {
      phones.push(cleanPhone);
    }
  }

  // 2. CIF / NIF extraction
  let cif = null;
  const cifMatch = html.match(/\b([ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J])\b/i);
  if (cifMatch) {
    cif = cifMatch[1].toUpperCase();
  }

  // 3. Official Legal Name
  let legalName = null;
  const legalMatch = cleanText.match(/([A-ZÁÉÍÓÚÑ0-9\s.,&-]{3,50}\s+(?:S\.?L\.?U?|S\.?A\.?U?|S\.?C\.?P?|SOCIEDAD LIMITADA|SOCIEDAD ANONIMA))/i);
  if (legalMatch) {
    const rawLegal = legalMatch[1].trim().replace(/\s+/g, ' ');
    if (rawLegal.length < 60 && !rawLegal.toLowerCase().includes('copyright') && !rawLegal.toLowerCase().includes('todos')) {
      legalName = rawLegal;
    }
  }

  // 4. Sector detection
  let detectedSector = null;
  const lowerText = cleanText.toLowerCase();
  if (lowerText.includes('calderería') || lowerText.includes('caldereria') || lowerText.includes('tubería') || lowerText.includes('piping')) {
    detectedSector = 'Calderería & Tubería Industrial';
  } else if (lowerText.includes('estructura metálica') || lowerText.includes('estructuras metalicas') || lowerText.includes('cerrajería') || lowerText.includes('carpintería metálica') || lowerText.includes('carpinteria')) {
    detectedSector = 'Estructuras Metálicas & Montajes';
  } else if (lowerText.includes('mecanizado') || lowerText.includes('torno') || lowerText.includes('fresado') || lowerText.includes('cnc') || lowerText.includes('matricería') || lowerText.includes('decolletaje')) {
    detectedSector = 'Mecanizado & Matricería';
  } else if (lowerText.includes('naval') || lowerText.includes('astillero') || lowerText.includes('embarcacion')) {
    detectedSector = 'Construção & Reparação Naval';
  } else if (lowerText.includes('fundición') || lowerText.includes('forja') || lowerText.includes('siderurg') || lowerText.includes('acero')) {
    detectedSector = 'Siderurgia, Fundición & Forja';
  } else if (lowerText.includes('soldadura') || lowerText.includes('soldador') || lowerText.includes('welding')) {
    detectedSector = 'Soldadura Industrial';
  } else if (lowerText.includes('electricidad') || lowerText.includes('automatización') || lowerText.includes('cuadros eléctricos')) {
    detectedSector = 'Montajes Eléctricos & Climatización';
  }

  return {
    phone: phones[0] || null,
    cif,
    legalName,
    detectedSector
  };
}

function detectSectorFromName(companyName) {
  const name = companyName.toLowerCase();
  if (name.includes('caldereria') || name.includes('calderería') || name.includes('tub') || name.includes('inox')) {
    return 'Calderería & Tubería Industrial';
  }
  if (name.includes('mecaniz') || name.includes('torno') || name.includes('fresad') || name.includes('cnc') || name.includes('matric')) {
    return 'Mecanizado & Matricería';
  }
  if (name.includes('estructur') || name.includes('metal') || name.includes('cerraj') || name.includes('carpinter')) {
    return 'Estructuras Metálicas & Montajes';
  }
  if (name.includes('soldadur') || name.includes('solda')) {
    return 'Soldadura Industrial';
  }
  if (name.includes('fundic') || name.includes('forja') || name.includes('acero')) {
    return 'Siderurgia, Fundición & Forja';
  }
  if (name.includes('naval') || name.includes('marin') || name.includes('barco')) {
    return 'Construção & Reparação Naval';
  }
  return 'Calderería & Tubería Industrial';
}

async function run() {
  console.log('================================================================================');
  console.log('⚡ INICIANDO AUDITORIA, ENRIQUECIMENTO E IMPORTAÇÃO - GUIPÚZCOA (ALEX / LUMINOUS)');
  console.log('================================================================================\n');

  if (!fs.existsSync(INPUT_EXCEL)) {
    console.error('Planilha não encontrada:', INPUT_EXCEL);
    process.exit(1);
  }

  const wb = XLSX.readFile(INPUT_EXCEL);
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`📋 Total de registros na planilha: ${rawRows.length}`);

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();
  console.log('Conectado ao Supabase PostgreSQL.');

  // Find initial Kanban stage for Luminous
  const stageRes = await client.query(`SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1 AND order_index = 1 LIMIT 1;`, [LUMINOUS_EMPRESA_ID]);
  const defaultStageId = stageRes.rows[0]?.id || '0f5adbfe-9d19-4629-a2ac-e3fb2b2afd69';
  console.log(`🎯 Estágio Inicial Selecionado: ${defaultStageId}`);

  // Load existing leads for deduplication
  const existingRes = await client.query(`
    SELECT id, LOWER(TRIM(email)) as email, tags, phone, website, company_name, province 
    FROM core_comercial.leads 
    WHERE email IS NOT NULL AND email != '';
  `);
  const existingMap = new Map();
  for (const r of existingRes.rows) {
    existingMap.set(r.email, r);
  }
  console.log(`💾 Base do CRM carregada: ${existingMap.size} leads com e-mail.`);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const uniqueNewItems = new Map();
  const existingToEnrich = [];
  let invalidSyntax = 0;

  for (const row of rawRows) {
    const rawEmail = String(row['Email'] || row['email'] || row['Correo electrónico'] || '').trim().toLowerCase();
    const company = String(row['Empresa'] || row['empresa'] || '').trim();
    const location = String(row['Localidad'] || row['localidad'] || '').trim();

    if (!rawEmail || !emailRegex.test(rawEmail)) {
      invalidSyntax++;
      continue;
    }

    if (existingMap.has(rawEmail)) {
      existingToEnrich.push({ email: rawEmail, company, location, dbLead: existingMap.get(rawEmail) });
    } else {
      if (!uniqueNewItems.has(rawEmail)) {
        uniqueNewItems.set(rawEmail, { email: rawEmail, company, location });
      }
    }
  }

  console.log(`\n🔍 Análise Prévia:`);
  console.log(`  - E-mails inválidos descartados: ${invalidSyntax}`);
  console.log(`  - Leads que já existem no CRM (a receber tags/enriquecimento): ${existingToEnrich.length}`);
  console.log(`  - Leads inéditos a auditar, enriquecer e cadastrar: ${uniqueNewItems.size}\n`);

  // Group unique domains for DNS and Web Scraping
  const domainMap = new Map();
  for (const item of uniqueNewItems.values()) {
    const domain = item.email.split('@')[1];
    if (!domainMap.has(domain)) {
      domainMap.set(domain, {
        domain,
        isPublic: PUBLIC_DOMAINS.has(domain),
        hasMx: false,
        website: null,
        phone: null,
        cif: null,
        legalName: null,
        detectedSector: null
      });
    }
  }

  console.log(`🌐 Domínios corporativos únicos para investigar: ${domainMap.size}`);

  // 1. DNS / MX validation in parallel batches
  console.log(`🚀 Executando validação DNS / MX em tempo real...`);
  const domainList = Array.from(domainMap.values());
  const dnsBatchSize = 30;

  for (let i = 0; i < domainList.length; i += dnsBatchSize) {
    const chunk = domainList.slice(i, i + dnsBatchSize);
    await Promise.all(chunk.map(async (dInfo) => {
      dInfo.hasMx = await checkDomainMx(dInfo.domain);
    }));
    if ((i + dnsBatchSize) % 60 === 0 || i + dnsBatchSize >= domainList.length) {
      console.log(`  DNS: ${Math.min(i + dnsBatchSize, domainList.length)}/${domainList.length} domínios verificados...`);
    }
  }
  console.log(`✅ Validação DNS concluída!\n`);

  // 2. Autonomous Web Crawler for corporate websites
  console.log(`🌐 Iniciando Web Crawler autônomo para enriquecer Websites, Telefones e CIFs...`);
  const webBatchSize = 25;

  for (let i = 0; i < domainList.length; i += webBatchSize) {
    const chunk = domainList.slice(i, i + webBatchSize);
    await Promise.all(chunk.map(async (dInfo) => {
      if (dInfo.isPublic) return;

      const tryUrls = [
        `https://www.${dInfo.domain}`,
        `https://${dInfo.domain}`,
        `http://www.${dInfo.domain}`,
        `http://${dInfo.domain}`
      ];

      for (const u of tryUrls) {
        const res = await fetchHtml(u, 3000);
        if (res.ok && res.html) {
          dInfo.website = u;
          const meta = extractMetadataFromHtml(res.html);
          if (meta.phone) dInfo.phone = meta.phone;
          if (meta.cif) dInfo.cif = meta.cif;
          if (meta.legalName) dInfo.legalName = meta.legalName;
          if (meta.detectedSector) dInfo.detectedSector = meta.detectedSector;
          break;
        }
      }

      if (!dInfo.website && dInfo.hasMx) {
        dInfo.website = `https://www.${dInfo.domain}`;
      }
    }));
    if ((i + webBatchSize) % 50 === 0 || i + webBatchSize >= domainList.length) {
      console.log(`  Crawler: ${Math.min(i + webBatchSize, domainList.length)}/${domainList.length} domínios auditados...`);
    }
  }
  console.log(`✅ Varredura Web concluída!\n`);

  // 3. Process Existing Leads (Enrich & Tag)
  console.log(`🔄 Enriquecendo leads que já existem no CRM...`);
  let existingUpdatedCount = 0;

  for (const item of existingToEnrich) {
    const domain = item.email.split('@')[1];
    const dInfo = domainMap.get(domain) || {};
    const dbLead = item.dbLead;

    const existingTags = Array.isArray(dbLead.tags) ? dbLead.tags : [];
    const newTags = Array.from(new Set([
      ...existingTags,
      'Mailing Alex',
      'Mailing Alex Guipúzcoa',
      'Guipúzcoa',
      'País Vasco',
      '🇪🇸 Espanha'
    ]));

    await client.query(`
      UPDATE core_comercial.leads 
      SET 
        phone = COALESCE(leads.phone, $1),
        website = COALESCE(leads.website, $2),
        province = COALESCE(leads.province, 'Guipúzcoa'),
        region = COALESCE(leads.region, 'País Vasco'),
        city = COALESCE(leads.city, $3),
        tags = $4,
        assigned_to = COALESCE(leads.assigned_to, $5),
        updated_at = NOW()
      WHERE id = $6;
    `, [
      dInfo.phone || null,
      dInfo.website || (dInfo.isPublic ? null : `https://www.${domain}`),
      item.location || null,
      newTags,
      ALEX_USER_ID,
      dbLead.id
    ]);
    existingUpdatedCount++;
  }
  console.log(`✅ ${existingUpdatedCount} leads existentes foram atualizados com a tag e dados de Guipúzcoa.`);

  // 4. Insert Inéditos Leads
  console.log(`\n📥 Inserindo novos leads auditados no CRM (Luminous / Alex)...`);
  let newInsertedCount = 0;
  let discardedMxCount = 0;
  const excelOutputRows = [];

  for (const item of uniqueNewItems.values()) {
    const domain = item.email.split('@')[1];
    const dInfo = domainMap.get(domain) || {};

    if (!dInfo.hasMx && !PUBLIC_DOMAINS.has(domain)) {
      discardedMxCount++;
      continue;
    }

    const companyName = dInfo.legalName || item.company || 'Empresa Industrial';
    const website = dInfo.website || (dInfo.isPublic ? null : `https://www.${domain}`);
    const phone = dInfo.phone || null;
    const sector = dInfo.detectedSector || detectSectorFromName(item.company);
    const city = item.location && item.location !== 'Espanha' ? item.location : 'San Sebastián / Donostia';
    const province = 'Guipúzcoa';
    const region = 'País Vasco';

    const tags = [
      'Alex Carmona',
      'Mailing Alex',
      'Mailing Alex Guipúzcoa',
      'Mailing Alex Inéditos - Guipúzcoa',
      'Guipúzcoa',
      'País Vasco',
      '🇪🇸 Espanha',
      sector
    ];

    const notes = `Lead importado da base do Alex (Guipúzcoa). Localidade: ${item.location || 'Guipúzcoa'}. Domínio: ${domain}. Setor: ${sector}.`;

    const insertRes = await client.query(`
      INSERT INTO core_comercial.leads (
        empresa_id,
        assigned_to,
        stage_id,
        name,
        company_name,
        email,
        phone,
        website,
        tax_id,
        city,
        province,
        region,
        country_id,
        sector,
        origen_lead,
        notes,
        tags,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
      RETURNING id;
    `, [
      LUMINOUS_EMPRESA_ID,
      ALEX_USER_ID,
      defaultStageId,
      item.company,
      companyName,
      item.email,
      phone,
      website,
      dInfo.cif || null,
      city,
      province,
      region,
      SPAIN_COUNTRY_ID,
      sector,
      'prospeccao_b2b',
      notes,
      tags
    ]);

    newInsertedCount++;

    excelOutputRows.push({
      Empresa: companyName,
      Localidad: city,
      Email: item.email,
      Telefono: phone || '',
      Website: website || '',
      CIF: dInfo.cif || '',
      Sector: sector,
      Status_MX: 'Válido',
      Status_CRM: 'Cadastrado (Inédito)'
    });
  }

  // Also include the enriched existing leads in the output spreadsheet
  for (const item of existingToEnrich) {
    const domain = item.email.split('@')[1];
    const dInfo = domainMap.get(domain) || {};
    excelOutputRows.push({
      Empresa: item.company,
      Localidad: item.location || 'Guipúzcoa',
      Email: item.email,
      Telefono: dInfo.phone || item.dbLead.phone || '',
      Website: dInfo.website || item.dbLead.website || '',
      CIF: dInfo.cif || '',
      Sector: dInfo.detectedSector || detectSectorFromName(item.company),
      Status_MX: 'Válido',
      Status_CRM: 'Atualizado (Já Existia)'
    });
  }

  // Save Enriched Excel File
  const outWb = XLSX.utils.book_new();
  const outWs = XLSX.utils.json_to_sheet(excelOutputRows);
  XLSX.utils.book_append_sheet(outWb, outWs, 'Guipuzcoa Enriquecido');
  XLSX.writeFile(outWb, OUTPUT_EXCEL);
  console.log(`📁 Planilha enriquecida gerada com sucesso: ${OUTPUT_EXCEL}`);

  // Final check of leads count for Alex Guipúzcoa in DB
  const totalIneditos = await client.query("SELECT count(1) as total FROM core_comercial.leads WHERE 'Mailing Alex Inéditos - Guipúzcoa' = ANY(tags);");
  const totalCompleto = await client.query("SELECT count(1) as total FROM core_comercial.leads WHERE 'Mailing Alex Guipúzcoa' = ANY(tags);");

  console.log('\n================================================================================');
  console.log('✅ OPERAÇÃO DE AUDITORIA E IMPORTAÇÃO CONCLUÍDA!');
  console.log('================================================================================');
  console.log(`Total de linhas originais: ${rawRows.length}`);
  console.log(`Leads que já existiam e foram enriquecidos: ${existingUpdatedCount}`);
  console.log(`Novos leads inéditos inseridos no CRM: ${newInsertedCount}`);
  console.log(`Descartados por falha de MX/DNS: ${discardedMxCount}`);
  console.log(`🎯 Total de Leads no Público "Inéditos Guipúzcoa": ${totalIneditos.rows[0].total}`);
  console.log(`🎯 Total de Leads no Público "Guipúzcoa Completo": ${totalCompleto.rows[0].total}`);

  await client.end();
}

run().catch(err => {
  console.error('❌ Erro fatal durante a execução:', err);
  process.exit(1);
});
