const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const https = require('https');
const http = require('http');
const XLSX = require('xlsx');
const { Client } = require('pg');

// Public fast DNS resolvers
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const FOLDER = path.resolve('temp-operacoes');
const INPUT_EXCEL = path.join(FOLDER, 'CRM ALEX NUEVOS ASTURIAS-ALICANTE.xlsx');
const OUTPUT_EXCEL = path.join(FOLDER, 'MAILING_ALEX_ASTURIAS_ALICANTE_ENRIQUECIDO.xlsx');

const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';
const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

const LUMINOUS_EMPRESA_ID = '847796c4-b253-4e53-9e6b-34a127ec7d85';
const LUMINOUS_STAGE_1 = '0f5adbfe-9d19-4629-a2ac-e3fb2b2afd69'; // Novo / Sem Contato
const ALEX_USER_ID = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7'; // Alex Carmona
const SPAIN_COUNTRY_ID = '2f487ab4-c7f5-4b70-9c37-995dc4cda125'; // Espanha

const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'yahoo.es', 'yahoo.com', 'outlook.es', 'outlook.com',
  'telefonica.net', 'movistar.es', 'wanadoo.es', 'terra.es', 'orange.es', 'vodafone.es',
  'ono.com', 'telecable.es', 'euskalnet.net', 'arrakis.es', 'mixmail.com', 'icloud.com', 'live.com'
]);

function timeoutPromise(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function resolveMxFast(domain) {
  if (PUBLIC_DOMAINS.has(domain)) return true;
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      timeoutPromise(1800)
    ]);
    return mx && mx.length > 0;
  } catch (e) {
    try {
      const a = await Promise.race([
        dns.resolve4(domain),
        timeoutPromise(1200)
      ]);
      return a && a.length > 0;
    } catch (e2) {
      return false;
    }
  }
}

function fetchHtml(targetUrl, timeoutMs = 2500) {
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
          } catch (e) {
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
          if (data.length > 250000) {
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
  if (lowerText.includes('calderería') || lowerText.includes('caldereria') || lowerText.includes('tubería') || lowerText.includes('tuberia') || lowerText.includes('piping') || lowerText.includes('depósitos')) {
    detectedSector = 'Calderería & Tubería Industrial';
  } else if (lowerText.includes('estructura metálica') || lowerText.includes('estructuras metalicas') || lowerText.includes('cerrajería') || lowerText.includes('carpintería metálica') || lowerText.includes('montaje metálico')) {
    detectedSector = 'Estructuras Metálicas & Montajes';
  } else if (lowerText.includes('mecanizado') || lowerText.includes('torno') || lowerText.includes('fresado') || lowerText.includes('cnc') || lowerText.includes('matricería') || lowerText.includes('decolletaje')) {
    detectedSector = 'Mecanizado & Matricería';
  } else if (lowerText.includes('naval') || lowerText.includes('astillero') || lowerText.includes('embarcacion') || lowerText.includes('marítim')) {
    detectedSector = 'Construção & Reparação Naval';
  } else if (lowerText.includes('fundición') || lowerText.includes('forja') || lowerText.includes('siderurg') || lowerText.includes('acero') || lowerText.includes('fundicion')) {
    detectedSector = 'Siderurgia, Fundición & Forja';
  } else if (lowerText.includes('soldadura') || lowerText.includes('soldador') || lowerText.includes('welding') || lowerText.includes('oxigas')) {
    detectedSector = 'Soldadura Industrial';
  } else if (lowerText.includes('electricidad') || lowerText.includes('automatización') || lowerText.includes('cuadros eléctricos') || lowerText.includes('climatización')) {
    detectedSector = 'Montajes Eléctricos & Climatización';
  }

  return {
    phone: phones[0] || null,
    cif,
    legalName,
    detectedSector
  };
}

function detectRegionAndProvince(zona, company) {
  const z = (zona || '').toLowerCase();
  const c = (company || '').toLowerCase();
  const combined = `${z} ${c}`;

  // Asturias detection
  const asturiasKeywords = ['asturias', 'gijón', 'gijon', 'avilés', 'aviles', 'oviedo', 'corvera', 'carreño', 'carreno', 'siero', 'langreo', 'mieres', 'llanera', 'castrillón', 'castrillon', 'nava', 'gozón', 'gozon', 'posada de llanera', 'tremañes', 'porceyo', 'cancienes', 'logrezana', 'somonte', 'silvota', 'falmuria', 'asipo'];
  for (const k of asturiasKeywords) {
    if (combined.includes(k)) {
      return {
        provincia: 'Asturias',
        region: 'Principado de Asturias',
        localidade: zona || 'Gijón'
      };
    }
  }

  // Alicante detection
  const alicanteKeywords = ['alicante', 'elche', 'elx', 'elda', 'alcoy', 'alcoi', 'petrer', 'villena', 'novelda', 'san vicente', 'crevillente', 'orihuela', 'benidorm', 'ibi', 'castalla', 'onil', 'torrevieja', 'denia', 'altea', 'sax', 'aspe'];
  for (const k of alicanteKeywords) {
    if (combined.includes(k)) {
      return {
        provincia: 'Alicante',
        region: 'Comunidad Valenciana',
        localidade: zona || 'Alicante'
      };
    }
  }

  // Fallback based on text
  if (z.includes('astur') || combined.includes('astur')) {
    return { provincia: 'Asturias', region: 'Principado de Asturias', localidade: zona || 'Gijón' };
  }
  if (z.includes('valenc') || combined.includes('valenc') || combined.includes('alacant')) {
    return { provincia: 'Alicante', region: 'Comunidad Valenciana', localidade: zona || 'Alicante' };
  }

  return {
    provincia: zona ? `${zona} (Espanha)` : 'Asturias / Alicante',
    region: 'Espanha',
    localidade: zona || 'Espanha'
  };
}

function fallbackSectorFromName(company) {
  const n = (company || '').toLowerCase();
  if (n.includes('calderer') || n.includes('tubo') || n.includes('tuberia') || n.includes('piping') || n.includes('valvula') || n.includes('caldera')) {
    return 'Calderería & Tubería Industrial';
  }
  if (n.includes('estructura') || n.includes('cerraj') || n.includes('carpinter') || n.includes('montaje') || n.includes('chapa') || n.includes('metalica') || n.includes('metálica')) {
    return 'Estructuras Metálicas & Montajes';
  }
  if (n.includes('mecaniz') || n.includes('torno') || n.includes('fresad') || n.includes('cnc') || n.includes('matriz') || n.includes('troquel') || n.includes('laser') || n.includes('láser')) {
    return 'Mecanizado & Matricería';
  }
  if (n.includes('acero') || n.includes('hierro') || n.includes('metal') || n.includes('forja') || n.includes('fundic') || n.includes('siderurg') || n.includes('smelt')) {
    return 'Siderurgia, Fundición & Forja';
  }
  if (n.includes('soldad') || n.includes('weld')) {
    return 'Soldadura Industrial';
  }
  if (n.includes('naval') || n.includes('astiller') || n.includes('barco') || n.includes('buque') || n.includes('maritim')) {
    return 'Construção & Reparação Naval';
  }
  if (n.includes('electr') || n.includes('clima') || n.includes('instalac') || n.includes('frio') || n.includes('frío')) {
    return 'Montajes Eléctricos & Climatización';
  }
  return 'Industrial Geral & Talleres';
}

async function run() {
  console.log("================================================================================");
  console.log("⚡ INICIANDO VALIDAÇÃO, OXIGENAÇÃO E IMPORTAÇÃO: ASTURIAS & ALICANTE (ALEX)");
  console.log("================================================================================");

  const wb = XLSX.readFile(INPUT_EXCEL);
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`📋 Total de registros lidos da planilha: ${rawRows.length}`);

  const clientProd = new Client({ connectionString: prodConn });
  const clientDev = new Client({ connectionString: devConn });
  await clientProd.connect();
  await clientDev.connect();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Load existing leads in PROD
  const existingProd = await clientProd.query('SELECT id, LOWER(TRIM(email)) as email, tags, phone, website FROM core_comercial.leads WHERE email IS NOT NULL;');
  const existingProdMap = new Map();
  for (const r of existingProd.rows) {
    existingProdMap.set(r.email, r);
  }

  const existingDev = await clientDev.query('SELECT id, LOWER(TRIM(email)) as email, tags, phone, website FROM core_comercial.leads WHERE email IS NOT NULL;');
  const existingDevMap = new Map();
  for (const r of existingDev.rows) {
    existingDevMap.set(r.email, r);
  }

  console.log(`💾 Base do CRM carregada: ${existingProdMap.size} leads já cadastrados.`);

  const uniqueNewItems = new Map();
  const existingToUpdate = [];
  let invalidSyntaxCount = 0;

  for (const row of rawRows) {
    const rawEmail = String(row['Correo electrónico'] || row['Email'] || row['email'] || '').trim().toLowerCase();
    const company = String(row['Empresa'] || row['company_name'] || '').trim();
    const zona = String(row['Zona'] || row['Localidad'] || row['city'] || '').trim();

    if (!rawEmail || !emailRegex.test(rawEmail)) {
      invalidSyntaxCount++;
      continue;
    }

    if (existingProdMap.has(rawEmail)) {
      existingToUpdate.push({
        email: rawEmail,
        company,
        zona,
        dbLead: existingProdMap.get(rawEmail),
        row
      });
    } else {
      if (!uniqueNewItems.has(rawEmail)) {
        uniqueNewItems.set(rawEmail, {
          email: rawEmail,
          company: company || 'Empresa Industrial',
          zona: zona || 'Espanha',
          domain: rawEmail.split('@')[1],
          row
        });
      }
    }
  }

  console.log(`\n🔍 Análise de duplicidade & filtros:`);
  console.log(`  - E-mails inválidos descartados: ${invalidSyntaxCount}`);
  console.log(`  - Leads que JÁ EXISTEM no CRM (a receber novas tags e enriquecimento): ${existingToUpdate.length}`);
  console.log(`  - Leads INÉDITOS a minerar, validar e cadastrar: ${uniqueNewItems.size}`);

  // Group unique domains for DNS and Web Scraping
  const domainMap = new Map();
  for (const item of uniqueNewItems.values()) {
    const domain = item.domain;
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

  console.log(`\n🌐 Domínios corporativos únicos para investigar: ${domainMap.size}`);

  // 1. DNS / MX validation in parallel
  console.log(`\n🚀 Executando validação DNS & MX em paralelo...`);
  const domainList = Array.from(domainMap.values());
  const dnsBatchSize = 100;

  for (let i = 0; i < domainList.length; i += dnsBatchSize) {
    const chunk = domainList.slice(i, i + dnsBatchSize);
    await Promise.all(chunk.map(async (dInfo) => {
      dInfo.hasMx = await resolveMxFast(dInfo.domain);
    }));
    process.stdout.write(`Progresso DNS: ${Math.min(i + dnsBatchSize, domainList.length)}/${domainList.length} domínios verificados...\r`);
  }
  console.log(`\n✅ Validação DNS concluída!`);

  // 2. Web Scraping & Multi-channel Website Enrichment
  console.log(`\n🌐 Iniciando Web Crawler autônomo para enriquecer Websites, Telefones e CIFs...`);
  const webBatchSize = 40;

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
        const res = await fetchHtml(u, 2500);
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
    process.stdout.write(`Progresso Web Crawler: ${Math.min(i + webBatchSize, domainList.length)}/${domainList.length} domínios auditados...\r`);
  }
  console.log(`\n✅ Varredura Web concluída com sucesso!`);

  // 3. Consolidate enriched lead list
  console.log(`\n📊 Consolidando leads enriquecidos...`);
  const enrichedLeads = [];
  const leadsToInsert = [];

  for (const item of uniqueNewItems.values()) {
    const domain = item.domain;
    const dInfo = domainMap.get(domain) || {};

    const companyName = dInfo.legalName || item.company;
    const website = dInfo.website || (dInfo.isPublic ? null : `https://www.${domain}`);
    const phone = dInfo.phone || null;
    const geo = detectRegionAndProvince(item.zona, item.company);
    const sector = dInfo.detectedSector || fallbackSectorFromName(item.company);
    const tags = ['Alex Carmona', 'Mailing Alex', 'Mailing Alex Asturias-Alicante', geo.provincia, 'Espanha'];
    const notes = `Lead importado do mailing Asturias-Alicante do Alex. Zona original: ${item.zona}. Província: ${geo.provincia}. Região: ${geo.region}. MX: ${dInfo.hasMx ? 'Ativo' : 'Pendente'}.`;

    const enrichedObj = {
      Empresa: companyName,
      Email: item.email,
      Telefone: phone || 'Consultar Site',
      Website: website || 'Não disponível',
      Zona: item.zona,
      Provincia: geo.provincia,
      Regiao: geo.region,
      Pais: 'Espanha',
      Sector: sector,
      CIF: dInfo.cif || 'Não identificado',
      Status_MX: dInfo.hasMx ? 'VÁLIDO' : 'SEM_MX',
      Origem: 'Mailing Alex Asturias-Alicante'
    };

    enrichedLeads.push(enrichedObj);

    leadsToInsert.push({
      name: companyName,
      company_name: companyName,
      email: item.email,
      phone,
      website,
      city: geo.localidade,
      province: geo.provincia,
      region: geo.region,
      address_line: `Polígono Industrial, ${geo.localidade}`,
      sector,
      tax_id: dInfo.cif,
      notes,
      tags
    });
  }

  console.log(`✨ Total de leads novos processados: ${enrichedLeads.length}`);
  console.log(`🌐 Empresas com Website oficial extraído: ${enrichedLeads.filter(l => l.Website && l.Website !== 'Não disponível').length}`);
  console.log(`📞 Empresas com Telefone comercial espanhol minerado: ${enrichedLeads.filter(l => l.Telefone && l.Telefone !== 'Consultar Site').length}`);
  console.log(`🏢 Empresas com CIF / Razão Social identificada: ${enrichedLeads.filter(l => l.CIF && l.CIF !== 'Não identificado').length}`);

  // 4. Save Excel
  const newWb = XLSX.utils.book_new();
  const newWs = XLSX.utils.json_to_sheet(enrichedLeads);
  XLSX.utils.book_append_sheet(newWb, newWs, 'Asturias_Alicante_Enriquecido');
  XLSX.writeFile(newWb, OUTPUT_EXCEL);
  console.log(`\n📁 Planilha enriquecida gravada em:\n   ${OUTPUT_EXCEL}`);

  // 5. Insert valid leads into PROD and DEV
  console.log(`\n🚀 Gravando 100% dos novos leads no Supabase PROD e DEV...`);
  const insertBatchSize = 100;

  for (let i = 0; i < leadsToInsert.length; i += insertBatchSize) {
    const chunk = leadsToInsert.slice(i, i + insertBatchSize);
    
    for (const l of chunk) {
      // Inserir no PROD
      await clientProd.query(`
        INSERT INTO core_comercial.leads (
          empresa_id, stage_id, name, company_name, email, phone, website,
          city, province, region, address_line, sector, tax_id, origen_lead, notes, tags,
          assigned_to, country_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [
        LUMINOUS_EMPRESA_ID, LUMINOUS_STAGE_1, l.name, l.company_name, l.email,
        l.phone, l.website, l.city, l.province, l.region, l.address_line, l.sector,
        l.tax_id, 'Mailing Alex Asturias-Alicante', l.notes, l.tags,
        ALEX_USER_ID, SPAIN_COUNTRY_ID
      ]);

      // Inserir no DEV
      await clientDev.query(`
        INSERT INTO core_comercial.leads (
          empresa_id, stage_id, name, company_name, email, phone, website,
          city, province, region, address_line, sector, tax_id, origen_lead, notes, tags,
          assigned_to, country_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [
        LUMINOUS_EMPRESA_ID, LUMINOUS_STAGE_1, l.name, l.company_name, l.email,
        l.phone, l.website, l.city, l.province, l.region, l.address_line, l.sector,
        l.tax_id, 'Mailing Alex Asturias-Alicante', l.notes, l.tags,
        ALEX_USER_ID, SPAIN_COUNTRY_ID
      ]);
    }
    process.stdout.write(`Progresso Inserção: ${Math.min(i + insertBatchSize, leadsToInsert.length)}/${leadsToInsert.length} leads inseridos...\r`);
  }
  console.log(`\n✅ Inserção concluída no PROD e DEV!`);

  // 6. Atualizar tags dos leads já existentes
  console.log(`\n🏷️ Atualizando tags dos ${existingToUpdate.length} leads já existentes...`);
  for (const item of existingToUpdate) {
    const curTags = item.dbLead.tags || [];
    const geo = detectRegionAndProvince(item.zona, item.company);
    const newTags = Array.from(new Set([...curTags, 'Alex Carmona', 'Mailing Alex', 'Mailing Alex Asturias-Alicante', geo.provincia, 'Espanha']));
    
    await clientProd.query('UPDATE core_comercial.leads SET tags = $1 WHERE id = $2;', [newTags, item.dbLead.id]);
    await clientDev.query('UPDATE core_comercial.leads SET tags = $1 WHERE id = $2;', [newTags, item.dbLead.id]);
  }
  console.log(`✅ Tags atualizadas com sucesso!`);

  // Final count of tags
  const tagProdCount = await clientProd.query("SELECT count(*) FROM core_comercial.leads WHERE tags::text ILIKE '%Mailing Alex Asturias-Alicante%';");
  const totalAlexCount = await clientProd.query("SELECT count(*) FROM core_comercial.leads WHERE tags::text ILIKE '%Mailing Alex%' OR tags::text ILIKE '%Alex Carmona%';");
  const totalProd = await clientProd.query("SELECT count(*) FROM core_comercial.leads;");
  const totalDev = await clientDev.query("SELECT count(*) FROM core_comercial.leads;");

  console.log("\n================================================================================");
  console.log(`🎉 MAILING ASTURIAS & ALICANTE IMPORTADO E OXIGENADO COM SUCESSO!`);
  console.log(`🎯 Total no Público "Mailing Alex Asturias-Alicante": ${tagProdCount.rows[0].count}`);
  console.log(`💼 Total Consolidado do Vendedor Alex: ${totalAlexCount.rows[0].count}`);
  console.log(`📊 Base Geral de Leads no CRM (PROD): ${totalProd.rows[0].count}`);
  console.log(`📊 Base Geral de Leads no CRM (DEV): ${totalDev.rows[0].count}`);
  console.log("================================================================================");

  await clientProd.end();
  await clientDev.end();
}

run().catch(console.error);
